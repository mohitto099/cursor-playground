/**
 * Base effect class with default lifecycle methods
 */

import { random, clamp, vec2 } from '../../utils/math.js';
import { randomColor, colorToCss, getPalette } from '../../utils/colour.js';

export class EffectBase {
  constructor(options = {}) {
    this.id = options.id || 'base';
    this.name = options.name || 'Base Effect';
    this.category = options.category || 'particles';
    this.description = options.description || '';
    this.defaultConfig = options.defaultConfig || {};
    this.config = { ...this.defaultConfig };
    this.enabled = options.enabled !== false;
    this.initialized = false;
  }

  initialize(context, config) {
    this.context = context;
    this.config = { ...this.defaultConfig, ...config };
    this.initialized = true;
    this.onInitialize?.(context, this.config);
  }

  onInitialize(context, config) {}

  update(deltaTime, context, config) {}

  render(context, config) {}

  onPointerDown(pointer, context, config) {}

  onPointerUp(pointer, context, config) {}

  onEnable(context, config) {}

  onDisable(context, config) {}

  onConfigChange(context, config) {}

  onGlobalConfigChange(context, globalConfig) {}

  onResize(context, config) {}

  clear(context) {}

  reset(context, config) {}

  dispose(context) {}

  validateConfig(config) {
    return { valid: true, errors: [] };
  }

  // Helper methods
  getParticlePool() {
    return this.context?.particles;
  }

  getPointer() {
    return this.context?.pointer;
  }

  getCanvasSize() {
    return {
      width: this.context?.width || 0,
      height: this.context?.height || 0,
    };
  }

  getGlobalConfig() {
    return this.context?.globalConfig || {};
  }

  getTime() {
    return this.context?.time || 0;
  }

  getDeltaTime() {
    return this.context?.deltaTime || 0;
  }

  getRandom() {
    return this.context?.random || Math.random;
  }

  getPalette(name) {
    return getPalette(name || this.config.palette || 'neon');
  }

  getColorFromPalette(index, paletteName) {
    const palette = this.getPalette(paletteName);
    return palette[index % palette.length];
  }

  randomColor(paletteName) {
    return randomColor(this.getPalette(paletteName));
  }

  lerpColor(colorA, colorB, t) {
    const a = typeof colorA === 'string' ? { r: 0, g: 0, b: 0 } : colorA;
    const b = typeof colorB === 'string' ? { r: 0, g: 0, b: 0 } : colorB;
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
    };
  }

  clamp(value, min, max) {
    return clamp(value, min, max);
  }

  emitParticle(x, y, options = {}) {
    const pool = this.getParticlePool();
    if (!pool) return null;

    const result = pool.acquire();
    if (!result) return null;

    const { particle, index } = result;
    const config = this.config;

    particle.x = x;
    particle.y = y;
    particle.vx = options.vx || 0;
    particle.vy = options.vy || 0;
    particle.ax = 0;
    particle.ay = 0;
    particle.size = options.size || config.particleSize || 4;
    particle.life = options.life || config.lifetime || 1000;
    particle.maxLife = particle.life;
    particle.age = 0;
    particle.alpha = options.alpha || config.opacity || 1;
    particle.color = options.color || { r: 255, g: 255, b: 255 };
    particle.effectId = this.id;
    particle.trailLength = 0;

    return { particle, index };
  }

  emitParticleWithVelocity(x, y, angle, speed, options = {}) {
    return this.emitParticle(x, y, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ...options,
    });
  }

  updateParticle(particle, dt) {
    const config = this.config;
    const globalConfig = this.getGlobalConfig();
    const speed = globalConfig.speed || 1;

    particle.vx += particle.ax * dt;
    particle.vy += particle.ay * dt;

    particle.x += particle.vx * speed * (dt / 16.67);
    particle.y += particle.vy * speed * (dt / 16.67);

    particle.ax = 0;
    particle.ay = 0;

    particle.age += dt;
    const lifeRatio = 1 - particle.age / particle.maxLife;
    particle.alpha = Math.max(0, (config.opacity || 1) * lifeRatio);

    if (particle.age >= particle.maxLife) {
      return false;
    }
    return true;
  }

  applyForce(particle, fx, fy) {
    particle.ax += fx;
    particle.ay += fy;
  }

  applyForceToPool(pool, fx, fy, radius, centerX, centerY, falloff = 'linear') {
    pool.forEachActive((particle) => {
      const dx = centerX - particle.x;
      const dy = centerY - particle.y;
      const distSq = dx * dx + dy * dy;
      const radiusSq = radius * radius;

      if (distSq >= radiusSq) return;

      const dist = Math.sqrt(distSq);
      let factor;
      switch (falloff) {
        case 'inverse-square':
          factor = dist > 0 ? (1 - dist / radius) ** 2 : 1;
          break;
        case 'inverse':
          factor = dist > 0 ? 1 - dist / radius : 1;
          break;
        case 'linear':
        default:
          factor = 1 - dist / radius;
          break;
      }

      if (factor <= 0) return;

      if (dist > 0) {
        particle.ax += (dx / dist) * fx * factor;
        particle.ay += (dy / dist) * fy * factor;
      }
    });
  }

  wrapPosition(particle, bounds) {
    const { width, height } = bounds || this.getCanvasSize();
    if (particle.x < 0) particle.x += width;
    if (particle.x > width) particle.x -= width;
    if (particle.y < 0) particle.y += height;
    if (particle.y > height) particle.y -= height;
  }

  bouncePosition(particle, bounds, bounce = 0.5) {
    const { width, height } = bounds || this.getCanvasSize();
    const size = particle.size * 0.5;

    if (particle.x - size < 0) {
      particle.x = size;
      particle.vx *= -bounce;
    } else if (particle.x + size > width) {
      particle.x = width - size;
      particle.vx *= -bounce;
    }

    if (particle.y - size < 0) {
      particle.y = size;
      particle.vy *= -bounce;
    } else if (particle.y + size > height) {
      particle.y = height - size;
      particle.vy *= -bounce;
    }
  }

  getPointerVelocity() {
    const pointer = this.getPointer();
    return pointer ? pointer.getSpeed() : 0;
  }

  getPointerDirection() {
    const pointer = this.getPointer();
    return pointer ? pointer.getDirection() : 0;
  }
}

export const createEffect = (options) => new EffectBase(options);