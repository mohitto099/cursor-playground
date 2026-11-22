/**
 * Particle Explosions effect - directional and patterned bursts
 */

import { EffectBase } from '../base/EffectBase.js';
import { random, clamp, degToRad } from '../../utils/math.js';
import { randomColor, getPalette } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

const EXPLOSION_PATTERNS = ['radial', 'directional', 'cone', 'spiral', 'shockwave', 'cluster'];

class ExplosionsEffect extends EffectBase {
  constructor() {
    super({
      id: 'explosions',
      name: 'Explosions',
      category: 'bursts',
      description: 'Click to create directional particle explosions',
      defaultConfig: {
        particleCount: 40,
        speed: 6,
        spread: 180,
        lifetime: 800,
        pattern: 'radial',
        colorMode: 'single',
        color: '#ff6b9d',
        palette: 'fire',
        sizeVariation: 0.5,
        lifeVariation: 0.3,
        initialBurst: true,
        secondaryBursts: 0,
      },
    });

    this.controls = [
      { key: 'particleCount', type: 'slider', label: 'Particles', min: 5, max: 200, step: 5, description: 'Particles per explosion' },
      { key: 'speed', type: 'slider', label: 'Speed', min: 1, max: 30, step: 0.5, description: 'Initial particle speed' },
      { key: 'spread', type: 'slider', label: 'Spread', min: 10, max: 360, step: 5, description: 'Explosion angle spread' },
      { key: 'lifetime', type: 'slider', label: 'Lifetime', min: 200, max: 3000, step: 50, description: 'Particle lifetime in ms' },
      { key: 'pattern', type: 'select', label: 'Pattern', options: EXPLOSION_PATTERNS.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })), description: 'Explosion pattern type' },
      { key: 'colorMode', type: 'select', label: 'Color Mode', options: [
        { value: 'single', label: 'Single Color' },
        { value: 'palette', label: 'Palette' },
        { value: 'random', label: 'Random' },
        { value: 'gradient', label: 'Speed Gradient' },
      ], description: 'How particles are colored' },
      { key: 'color', type: 'color', label: 'Color', description: 'Base color for single/gradient modes' },
      { key: 'palette', type: 'select', label: 'Palette', options: [
        { value: 'fire', label: 'Fire' },
        { value: 'neon', label: 'Neon' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'sunset', label: 'Sunset' },
      ], description: 'Color palette' },
      { key: 'sizeVariation', type: 'slider', label: 'Size Variation', min: 0, max: 1, step: 0.05, description: 'Particle size randomness' },
      { key: 'secondaryBursts', type: 'slider', label: 'Secondary Bursts', min: 0, max: 3, step: 1, description: 'Additional delayed bursts' },
    ];

    this.pendingExplosions = [];
    this.secondaryTimers = [];
  }

  onPointerDown(pointer, context, config) {
    if (pointer.button === 'left' && pointer.isInside) {
      this.pendingExplosions.push({
        x: pointer.position.x,
        y: pointer.position.y,
        direction: pointer.getDirection(),
        speed: pointer.getSpeed(),
        time: context.time,
      });
    }
  }

  update(deltaTime, context, config) {
    // Process pending explosions
    for (const explosion of this.pendingExplosions) {
      this.createExplosion(explosion, config, context);
    }
    this.pendingExplosions.length = 0;

    // Update secondary burst timers
    const now = context.time;
    this.secondaryTimers = this.secondaryTimers.filter(timer => {
      if (now >= timer.time) {
        this.createExplosion({ x: timer.x, y: timer.y, direction: timer.direction }, config, context);
        return false;
      }
      return true;
    });

    // Update existing particles
    this.updateParticles(deltaTime, context, config);
  }

  createExplosion(explosion, config, context) {
    const pool = context.particles;
    const particleCount = Math.floor(config.particleCount);
    const palette = getPalette(config.palette);

    for (let i = 0; i < particleCount; i++) {
      let angle, speedMult = 1;

      switch (config.pattern) {
        case 'directional':
          angle = explosion.direction + degToRad(random(-config.spread / 2, config.spread / 2));
          break;
        case 'cone':
          angle = explosion.direction + degToRad(random(-config.spread / 4, config.spread / 4));
          speedMult = 0.5 + random(0, 0.5);
          break;
        case 'spiral':
          angle = explosion.direction + (i / particleCount) * Math.PI * 4 + random(-0.2, 0.2);
          speedMult = 0.3 + (i / particleCount) * 0.7;
          break;
        case 'shockwave':
          angle = (i / particleCount) * Math.PI * 2;
          speedMult = 1;
          break;
        case 'cluster':
          angle = explosion.direction + degToRad(random(-config.spread, config.spread));
          speedMult = random(0.2, 1.5);
          break;
        case 'radial':
        default:
          angle = (i / particleCount) * Math.PI * 2 + random(-0.1, 0.1);
          speedMult = 0.5 + random(0, 0.5);
          break;
      }

      const speed = config.speed * speedMult * (1 + random(-0.15, 0.15));
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      let color;
      switch (config.colorMode) {
        case 'single':
          color = config.color ? { r: 255, g: 255, b: 255 } : randomColor(palette);
          break;
        case 'gradient':
          const speedRatio = clamp(speedMult, 0, 1);
          color = this.lerpColor(
            { r: 100, g: 100, b: 255 },
            { r: 255, g: 100, b: 100 },
            speedRatio
          );
          break;
        case 'palette':
          color = palette[i % palette.length];
          break;
        case 'random':
        default:
          color = randomColor(palette);
          break;
      }

      this.emitParticle(explosion.x, explosion.y, {
        vx,
        vy,
        size: random(2, 6) * (1 + random(-config.sizeVariation, config.sizeVariation)),
        life: config.lifetime * random(1 - config.lifeVariation, 1 + config.lifeVariation),
        color,
        alpha: 1,
      }, context);

      // Schedule secondary bursts
      if (config.secondaryBursts > 0) {
        for (let s = 1; s <= config.secondaryBursts; s++) {
          this.secondaryTimers.push({
            x: explosion.x + random(-20, 20),
            y: explosion.y + random(-20, 20),
            direction: explosion.direction + random(-0.5, 0.5),
            time: context.time + s * 100 + random(0, 50),
          });
        }
      }
    }
  }

  emitParticle(x, y, options, context) {
    const pool = context.particles;
    const result = pool.acquire();
    if (!result) return;

    const { particle } = result;
    particle.x = x;
    particle.y = y;
    particle.vx = options.vx;
    particle.vy = options.vy;
    particle.ax = 0;
    particle.ay = 0;
    particle.size = options.size;
    particle.life = options.life;
    particle.maxLife = particle.life;
    particle.age = 0;
    particle.color = options.color;
    particle.alpha = options.alpha;
    particle.effectId = this.id;
  }

  updateParticles(deltaTime, context, config) {
    const pool = context.particles;

    pool.forEachActive((particle) => {
      if (particle.effectId !== this.id) return;

      particle.x += particle.vx * (deltaTime / 16.67);
      particle.y += particle.vy * (deltaTime / 16.67);

      particle.age += deltaTime;
      const lifeRatio = 1 - particle.age / particle.maxLife;
      particle.alpha = Math.max(0, lifeRatio * lifeRatio);

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

      const size = particle.size;
      const alpha = particle.alpha;
      const color = particle.color;

      renderer.drawCircle(
        particle.x, particle.y,
        size * 0.5,
        color, alpha
      );

      // Add glow for bright particles
      if (alpha > 0.7) {
        renderer.drawGlow(
          particle.x, particle.y,
          size * 3,
          color, alpha * 0.4
        );
      }
    });
  }

  validateConfig(config) {
    const errors = [];
    if (config.particleCount !== undefined && (config.particleCount < 3 || config.particleCount > 300)) {
      errors.push('particleCount must be between 3 and 300');
    }
    if (config.speed !== undefined && (config.speed < 0.5 || config.speed > 40)) {
      errors.push('speed must be between 0.5 and 40');
    }
    if (config.spread !== undefined && (config.spread < 5 || config.spread > 360)) {
      errors.push('spread must be between 5 and 360');
    }
    if (config.lifetime !== undefined && (config.lifetime < 100 || config.lifetime > 5000)) {
      errors.push('lifetime must be between 100 and 5000');
    }
    return { valid: errors.length === 0, errors };
  }
}

const explosionsEffect = new ExplosionsEffect();
effectRegistry.register(explosionsEffect);

export { ExplosionsEffect, explosionsEffect };
export default explosionsEffect;