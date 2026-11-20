/**
 * Particle Trail effect - emits particles following the pointer
 */

import { EffectBase } from '../base/EffectBase.js';
import { random, clamp, vec2, degToRad } from '../../utils/math.js';
import { randomColor, colorToCss, getPalette } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

const TRAIL_SHAPES = ['circle', 'square', 'triangle', 'star'];

class ParticleTrailEffect extends EffectBase {
  constructor() {
    super({
      id: 'particleTrail',
      name: 'Particle Trails',
      category: 'particles',
      description: 'Particles follow the pointer with configurable trails',
      defaultConfig: {
        particleSize: 4,
        lifetime: 900,
        spread: 18,
        emissionRate: 15,
        opacity: 0.8,
        colorMode: 'palette',
        trailShape: 'circle',
        velocityInfluence: 0.3,
        palette: 'neon',
        sizeVariation: 0.5,
        lifeVariation: 0.3,
        angleVariation: 30,
        speedMin: 0.5,
        speedMax: 2,
        gravity: 0,
        fadeInTime: 50,
      },
    });

    this.lastEmissionTime = 0;
    this.emissionAccumulator = 0;
    this.previousPointerPos = { x: 0, y: 0 };
    this.hasPreviousPos = false;
  }

  initialize(context, config) {
    super.initialize(context, config);
    this.lastEmissionTime = context.time;
  }

  onEnable(context, config) {
    this.lastEmissionTime = context.time;
    this.hasPreviousPos = false;
  }

  onDisable(context, config) {
    this.hasPreviousPos = false;
  }

  onPointerDown(pointer, context, config) {
    this.burstEmission(pointer.position.x, pointer.position.y, config.emissionRate * 3);
  }

  update(deltaTime, context, config) {
    const pointer = context.pointer;
    const pool = context.particles;
    const globalConfig = context.globalConfig;

    if (!pointer.isInside) {
      this.hasPreviousPos = false;
      return;
    }

    const currentTime = context.time;
    const emissionInterval = 1000 / (config.emissionRate * (globalConfig.speed || 1));
    this.emissionAccumulator += deltaTime;

    if (this.hasPreviousPos) {
      const dx = pointer.position.x - this.previousPointerPos.x;
      const dy = pointer.position.y - this.previousPointerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.5) {
        const steps = Math.max(1, Math.ceil(distance / (config.spread * 0.5)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const x = this.previousPointerPos.x + dx * t;
          const y = this.previousPointerPos.y + dy * t;
          this.emitAlongPath(x, y, pointer, config, globalConfig);
        }
      } else {
        this.emitAlongPath(pointer.position.x, pointer.position.y, pointer, config, globalConfig);
      }
    } else {
      this.emitAlongPath(pointer.position.x, pointer.position.y, pointer, config, globalConfig);
      this.hasPreviousPos = true;
    }

    this.previousPointerPos.x = pointer.position.x;
    this.previousPointerPos.y = pointer.position.y;

    this.updateParticles(deltaTime, context, config);
  }

  emitAlongPath(x, y, pointer, config, globalConfig) {
    const emissionChance = Math.min(1, this.emissionAccumulator / (1000 / (config.emissionRate * (globalConfig.speed || 1))));
    if (Math.random() > emissionChance) return;

    this.emissionAccumulator = 0;

    const speed = random(config.speedMin, config.speedMax) * (globalConfig.speed || 1);
    const angle = pointer.getDirection() + degToRad(random(-config.angleVariation, config.angleVariation));
    const spread = config.spread * random(0.5, 1.5);

    const vx = Math.cos(angle) * speed + pointer.velocity.x * config.velocityInfluence;
    const vy = Math.sin(angle) * speed + pointer.velocity.y * config.velocityInfluence;

    const size = config.particleSize * random(1 - config.sizeVariation, 1 + config.sizeVariation);
    const life = config.lifetime * random(1 - config.lifeVariation, 1 + config.lifeVariation);

    let color;
    switch (config.colorMode) {
      case 'palette':
        color = this.getColorFromPalette(Math.floor(random(0, 100)), config.palette);
        break;
      case 'single':
        color = config.color ? { r: 255, g: 255, b: 255 } : randomColor(getPalette(config.palette));
        break;
      case 'velocity':
        const speedRatio = clamp(pointer.getSpeed() / 20, 0, 1);
        color = this.lerpColor(
          { r: 100, g: 100, b: 255 },
          { r: 255, g: 100, b: 100 },
          speedRatio
        );
        break;
      default:
        color = randomColor(getPalette(config.palette));
    }

    this.emitParticle(x, y, {
      vx,
      vy,
      size,
      life,
      color,
      alpha: config.opacity,
    });
  }

  burstEmission(x, y, count) {
    const config = this.config;
    const palette = getPalette(config.palette);

    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(config.speedMin, config.speedMax) * 2;
      const size = config.particleSize * random(0.5, 1.5);
      const life = config.lifetime * random(0.5, 1.5);
      const color = palette[Math.floor(random(0, palette.length))];

      this.emitParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        life,
        color,
        alpha: config.opacity,
      });
    }
  }

  updateParticles(deltaTime, context, config) {
    const pool = context.particles;
    const globalConfig = context.globalConfig;
    const gravity = config.gravity * (globalConfig.speed || 1);

    pool.forEachActive((particle) => {
      if (particle.effectId !== this.id) return;

      particle.vx += particle.ax * deltaTime;
      particle.vy += particle.ay * deltaTime + gravity * deltaTime * 0.001;

      particle.x += particle.vx * (globalConfig.speed || 1) * (deltaTime / 16.67);
      particle.y += particle.vy * (globalConfig.speed || 1) * (deltaTime / 16.67);

      particle.ax = 0;
      particle.ay = 0;

      particle.age += deltaTime;
      const lifeRatio = 1 - particle.age / particle.maxLife;
      particle.alpha = Math.max(0, (config.opacity || 1) * lifeRatio * lifeRatio);

      if (particle.age >= particle.maxLife) {
        pool.release(particle);
      }
    });
  }

  render(context, config) {
    const pool = context.particles;
    const renderer = context.renderer;

    if (!renderer) return;

    pool.forEachActive((particle) => {
      if (particle.effectId !== this.id) return;

      const shape = TRAIL_SHAPES.includes(config.trailShape) ? config.trailShape : 'circle';
      const size = particle.size;
      const alpha = particle.alpha;
      const color = particle.color;

      renderer.drawParticle(particle, {
        globalAlpha: 1,
        shape,
      });
    });
  }

  validateConfig(config) {
    const errors = [];
    if (config.particleSize !== undefined && (config.particleSize < 0.5 || config.particleSize > 100)) {
      errors.push('particleSize must be between 0.5 and 100');
    }
    if (config.lifetime !== undefined && (config.lifetime < 50 || config.lifetime > 10000)) {
      errors.push('lifetime must be between 50 and 10000');
    }
    if (config.emissionRate !== undefined && (config.emissionRate < 0 || config.emissionRate > 200)) {
      errors.push('emissionRate must be between 0 and 200');
    }
    if (config.opacity !== undefined && (config.opacity < 0 || config.opacity > 1)) {
      errors.push('opacity must be between 0 and 1');
    }
    if (config.trailShape && !TRAIL_SHAPES.includes(config.trailShape)) {
      errors.push(`trailShape must be one of: ${TRAIL_SHAPES.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}

const particleTrailEffect = new ParticleTrailEffect();
effectRegistry.register(particleTrailEffect);

export { ParticleTrailEffect, particleTrailEffect };
export default particleTrailEffect;