/**
 * Central animation loop and simulation coordinator
 */

import { PerformanceMonitor } from './PerformanceMonitor.js';
import { PointerManager } from './PointerManager.js';
import { ParticlePool } from './objectPool.js';
import { clamp } from '../utils/math.js';

export class Simulation {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      maxParticles: options.maxParticles || 2000,
      maxDeltaTime: options.maxDeltaTime || 50,
      targetFPS: options.targetFPS || 60,
      ...options,
    };

    this.running = false;
    this.paused = false;
    this.hidden = false;

    this.lastTime = 0;
    this.deltaTime = 0;
    this.time = 0;
    this.frameCount = 0;

    this.pointer = new PointerManager(canvas);
    this.performance = new PerformanceMonitor({ sampleSize: 60 });
    this.particles = new ParticlePool(this.options.maxParticles);

    this.effects = new Map();
    this.enabledEffects = new Set();
    this.effectOrder = [];

    this.context = {
      canvas,
      width: 0,
      height: 0,
      dpr: 1,
      pointer: this.pointer,
      particles: this.particles,
      performance: this.performance,
      time: 0,
      deltaTime: 0,
      globalConfig: {},
      random: Math.random,
    };

    this.boundLoop = this.loop.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);

    document.addEventListener('visibilitychange', this.boundVisibilityChange);
  }

  initialize(width, height, dpr) {
    this.context.width = width;
    this.context.height = height;
    this.context.dpr = dpr;

    for (const effect of this.effects.values()) {
      if (effect.initialize) {
        try {
          effect.initialize(this.context, effect.config || {});
        } catch (e) {
          console.error(`Effect ${effect.id} initialize error:`, e);
        }
      }
    }
  }

  addEffect(effect) {
    if (!effect || !effect.id) {
      console.warn('Effect must have an id');
      return false;
    }
    if (this.effects.has(effect.id)) {
      console.warn(`Effect ${effect.id} already registered`);
      return false;
    }

    effect.config = effect.config || {};
    effect.defaultConfig = effect.defaultConfig || {};

    this.effects.set(effect.id, effect);
    this.effectOrder.push(effect.id);

    if (effect.enabled !== false) {
      this.enableEffect(effect.id);
    }

    return true;
  }

  removeEffect(id) {
    this.disableEffect(id);
    const effect = this.effects.get(id);
    if (effect && effect.dispose) {
      try {
        effect.dispose(this.context);
      } catch (e) {
        console.error(`Effect ${id} dispose error:`, e);
      }
    }
    this.effects.delete(id);
    this.effectOrder = this.effectOrder.filter(e => e !== id);
  }

  enableEffect(id) {
    const effect = this.effects.get(id);
    if (!effect) {
      console.warn(`Effect ${id} not found`);
      return false;
    }
    if (this.enabledEffects.has(id)) return true;

    this.enabledEffects.add(id);
    if (effect.onEnable) {
      try {
        effect.onEnable(this.context, effect.config);
      } catch (e) {
        console.error(`Effect ${id} onEnable error:`, e);
      }
    }
    return true;
  }

  disableEffect(id) {
    if (!this.enabledEffects.has(id)) return true;
    this.enabledEffects.delete(id);

    const effect = this.effects.get(id);
    if (effect && effect.onDisable) {
      try {
        effect.onDisable(this.context, effect.config);
      } catch (e) {
        console.error(`Effect ${id} onDisable error:`, e);
      }
    }
    return true;
  }

  isEffectEnabled(id) {
    return this.enabledEffects.has(id);
  }

  toggleEffect(id) {
    if (this.enabledEffects.has(id)) {
      this.disableEffect(id);
    } else {
      this.enableEffect(id);
    }
    return this.enabledEffects.has(id);
  }

  setEffectConfig(id, config) {
    const effect = this.effects.get(id);
    if (!effect) return false;
    effect.config = { ...effect.defaultConfig, ...config };
    if (effect.onConfigChange) {
      try {
        effect.onConfigChange(this.context, effect.config);
      } catch (e) {
        console.error(`Effect ${id} onConfigChange error:`, e);
      }
    }
    return true;
  }

  setGlobalConfig(config) {
    this.context.globalConfig = { ...this.context.globalConfig, ...config };
    if (config.maxParticles !== undefined) {
      this.particles.setMaxParticles(config.maxParticles);
      this.options.maxParticles = config.maxParticles;
    }
    for (const effect of this.effects.values()) {
      if (effect.onGlobalConfigChange) {
        try {
          effect.onGlobalConfigChange(this.context, this.context.globalConfig);
        } catch (e) {
          console.error(`Effect ${effect.id} onGlobalConfigChange error:`, e);
        }
      }
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }

  togglePause() {
    if (this.paused) this.resume(); else this.pause();
  }

  clear() {
    this.particles.releaseAll();
    for (const effect of this.enabledEffects) {
      const eff = this.effects.get(effect);
      if (eff && eff.clear) {
        try {
          eff.clear(this.context);
        } catch (e) {
          console.error(`Effect ${effect} clear error:`, e);
        }
      }
    }
  }

  reset() {
    this.clear();
    this.time = 0;
    this.frameCount = 0;
    this.performance.reset();
    for (const effect of this.effects.values()) {
      if (effect.reset) {
        try {
          effect.reset(this.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effect.id} reset error:`, e);
        }
      }
    }
  }

  loop(currentTime) {
    if (!this.running) return;

    if (!this.paused && !this.hidden) {
      this.deltaTime = clamp(currentTime - this.lastTime, 0, this.options.maxDeltaTime);
      this.time += this.deltaTime;
      this.frameCount++;

      this.pointer.update();
      this.update(this.deltaTime);

      // Clear and prepare renderer for this frame
      const renderer = this.context.renderer;
      if (renderer) {
        renderer.clear();
        renderer.beginFrame();
      }

      this.render();

      if (renderer) {
        renderer.endFrame();
      }

      this.performance.beginFrame(currentTime);
      this.performance.setParticleCount(this.particles.getActiveCount());
      this.performance.setActiveEffectCount(this.enabledEffects.size);
      this.performance.endFrame();
      this.performance.updatePerformanceState();
    }

    this.lastTime = currentTime;
    requestAnimationFrame(this.boundLoop);
  }

  update(dt) {
    this.context.time = this.time;
    this.context.deltaTime = dt;

    for (const effectId of this.effectOrder) {
      if (!this.enabledEffects.has(effectId)) continue;
      const effect = this.effects.get(effectId);
      if (effect && effect.update) {
        try {
          effect.update(dt, this.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effectId} update error:`, e);
        }
      }
    }
  }

  render() {
    const renderer = this.context.renderer;
    for (const effectId of this.effectOrder) {
      if (!this.enabledEffects.has(effectId)) continue;
      const effect = this.effects.get(effectId);
      if (effect && effect.render) {
        try {
          effect.render(this.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effectId} render error:`, e);
        }
      }
    }
  }

  handleVisibilityChange() {
    this.hidden = document.hidden;
    if (this.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  handlePointerDown(pointer, event) {
    for (const effectId of this.enabledEffects) {
      const effect = this.effects.get(effectId);
      if (effect && effect.onPointerDown) {
        try {
          effect.onPointerDown(pointer, this.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effectId} onPointerDown error:`, e);
        }
      }
    }
  }

  handlePointerUp(pointer, event) {
    for (const effectId of this.enabledEffects) {
      const effect = this.effects.get(effectId);
      if (effect && effect.onPointerUp) {
        try {
          effect.onPointerUp(pointer, this.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effectId} onPointerUp error:`, e);
        }
      }
    }
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    this.pointer.destroy();
    for (const effect of this.effects.values()) {
      if (effect.dispose) {
        try {
          effect.dispose(this.context);
        } catch (e) {
          console.error(`Effect ${effect.id} dispose error:`, e);
        }
      }
    }
    this.effects.clear();
    this.enabledEffects.clear();
    this.effectOrder.length = 0;
  }
}

export const createSimulation = (canvas, options) => new Simulation(canvas, options);