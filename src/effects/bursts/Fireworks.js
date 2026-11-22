/**
 * Fireworks effect - click to create bursting particle explosions
 */

import { EffectBase } from '../base/EffectBase.js';
import { random, clamp, degToRad, vec2 } from '../../utils/math.js';
import { randomColor, getPalette, colorToCss } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

const BURST_PATTERNS = ['radial', 'spiral', 'heart', 'star', 'ring', 'double-ring'];

class FireworksEffect extends EffectBase {
  constructor() {
    super({
      id: 'fireworks',
      name: 'Fireworks',
      category: 'bursts',
      description: 'Click to create spectacular firework bursts',
      defaultConfig: {
        particleCount: 60,
        speed: 4,
        spread: 360,
        lifetime: 1200,
        gravity: 0.02,
        burstPattern: 'radial',
        colorMode: 'palette',
        palette: 'fire',
        trailLength: 8,
        trailOpacity: 0.6,
        soundEnabled: false,
      },
    });

    this.controls = [
      { key: 'particleCount', type: 'slider', label: 'Particles', min: 10, max: 300, step: 5, description: 'Particles per burst' },
      { key: 'speed', type: 'slider', label: 'Speed', min: 1, max: 20, step: 0.5, description: 'Initial particle speed' },
      { key: 'spread', type: 'slider', label: 'Spread', min: 30, max: 360, step: 15, description: 'Burst angle spread in degrees' },
      { key: 'lifetime', type: 'slider', label: 'Lifetime', min: 300, max: 5000, step: 100, description: 'Particle lifetime in ms' },
      { key: 'gravity', type: 'slider', label: 'Gravity', min: 0, max: 0.1, step: 0.001, description: 'Downward gravity pull' },
      { key: 'burstPattern', type: 'select', label: 'Pattern', options: BURST_PATTERNS.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })), description: 'Burst pattern shape' },
      { key: 'colorMode', type: 'select', label: 'Color Mode', options: [
        { value: 'palette', label: 'Palette' },
        { value: 'single', label: 'Single Color' },
        { value: 'random', label: 'Random' },
      ], description: 'How particles are colored' },
      { key: 'palette', type: 'select', label: 'Palette', options: [
        { value: 'fire', label: 'Fire' },
        { value: 'neon', label: 'Neon' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'sunset', label: 'Sunset' },
      ], description: 'Color palette' },
      { key: 'trailLength', type: 'slider', label: 'Trail Length', min: 0, max: 20, step: 1, description: 'Trail segments per particle' },
    ];

    this.pendingBursts = [];
  }

  onPointerDown(pointer, context, config) {
    if (pointer.button === 'left' && pointer.isInside) {
      this.pendingBursts.push({
        x: pointer.position.x,
        y: pointer.position.y,
        time: context.time,
      });
    }
  }

  update(deltaTime, context, config) {
    // Process pending bursts
    for (const burst of this.pendingBursts) {
      this.createBurst(burst.x, burst.y, config, context);
    }
    this.pendingBursts.length = 0;

    // Update existing firework particles
    this.updateParticles(deltaTime, context, config);
  }

  createBurst(x, y, config, context) {
    const pool = context.particles;
    const palette = getPalette(config.palette);
    const particleCount = Math.floor(config.particleCount);
    const spread = config.spread;
    const startAngle = random(0, 360);

    for (let i = 0; i < particleCount; i++) {
      let angle, speed;

      switch (config.burstPattern) {
        case 'spiral':
          angle = startAngle + (i / particleCount) * spread * 3 + random(-5, 5);
          speed = config.speed * (0.5 + (i / particleCount) * 0.5) * (1 + random(-0.2, 0.2));
          break;
        case 'heart':
          // Heart-shaped parametric
          const t = (i / particleCount) * Math.PI * 2;
          angle = degToRad(Math.atan2(16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)));
          speed = config.speed * (0.7 + random(-0.15, 0.15));
          break;
        case 'star':
          angle = startAngle + (i / particleCount) * spread;
          const isOuter = i % 2 === 0;
          speed = config.speed * (isOuter ? 1 : 0.5) * (1 + random(-0.1, 0.1));
          break;
        case 'ring':
          angle = startAngle + (i / particleCount) * spread;
          speed = config.speed * (0.9 + random(-0.05, 0.05));
          break;
        case 'double-ring':
          angle = startAngle + (i / particleCount) * spread;
          speed = config.speed * (i % 2 === 0 ? 1 : 0.6) * (1 + random(-0.05, 0.05));
          break;
        case 'radial':
        default:
          angle = startAngle + (i / particleCount) * spread + random(-spread * 0.01, spread * 0.01);
          speed = config.speed * (0.5 + random(0, 0.5));
          break;
      }

      const rad = degToRad(angle);
      const vx = Math.cos(rad) * speed;
      const vy = Math.sin(rad) * speed;

      let color;
      switch (config.colorMode) {
        case 'single':
          color = config.color ? { r: 255, g: 255, b: 255 } : randomColor(palette);
          break;
        case 'random':
          color = randomColor(palette);
          break;
        case 'palette':
        default:
          color = palette[i % palette.length];
          break;
      }

      this.emitParticle(x, y, {
        vx, vy,
        size: random(2, 5),
        life: config.lifetime * random(0.7, 1.3),
        color,
        alpha: 1,
        trail: [],
        trailLength: config.trailLength,
      }, context);
    }
  }

  emitParticle(x, y, options, context) {
    const pool = context.particles;
    const result = pool.acquire();
    if (!result) return;

    const { particle, index } = result;
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
    particle.trail = options.trail || [];
    particle.trailLength = options.trailLength || 0;
  }

  updateParticles(deltaTime, context, config) {
    const pool = context.particles;
    const gravity = config.gravity * (context.globalConfig.speed || 1);

    pool.forEachActive((particle) => {
      if (particle.effectId !== this.id) return;

      // Apply gravity
      particle.vy += gravity * deltaTime;

      // Update position
      particle.x += particle.vx * (deltaTime / 16.67);
      particle.y += particle.vy * (deltaTime / 16.67);

      // Update trail
      if (config.trailLength > 0) {
        particle.trail.unshift({ x: particle.x, y: particle.y });
        if (particle.trail.length > config.trailLength) {
          particle.trail.pop();
        }
      }

      // Age and fade
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

      // Draw trail
      if (config.trailLength > 0 && particle.trail.length > 1) {
        const trailAlpha = particle.alpha * config.trailOpacity;
        for (let i = 1; i < particle.trail.length; i++) {
          const t = i / particle.trail.length;
          const size = particle.size * t * 0.5;
          renderer.drawCircle(
            particle.trail[i].x,
            particle.trail[i].y,
            size,
            particle.color,
            trailAlpha * (1 - t)
          );
        }
      }

      // Draw main particle
      renderer.drawCircle(
        particle.x, particle.y,
        particle.size * 0.5,
        particle.color,
        particle.alpha
      );

      // Add glow
      if (particle.alpha > 0.5) {
        renderer.drawGlow(
          particle.x, particle.y,
          particle.size * 2,
          particle.color,
          particle.alpha * 0.3
        );
      }
    });
  }

  validateConfig(config) {
    const errors = [];
    if (config.particleCount !== undefined && (config.particleCount < 5 || config.particleCount > 500)) {
      errors.push('particleCount must be between 5 and 500');
    }
    if (config.speed !== undefined && (config.speed < 0.5 || config.speed > 30)) {
      errors.push('speed must be between 0.5 and 30');
    }
    if (config.spread !== undefined && (config.spread < 10 || config.spread > 360)) {
      errors.push('spread must be between 10 and 360');
    }
    if (config.lifetime !== undefined && (config.lifetime < 100 || config.lifetime > 10000)) {
      errors.push('lifetime must be between 100 and 10000');
    }
    if (config.gravity !== undefined && (config.gravity < 0 || config.gravity > 0.5)) {
      errors.push('gravity must be between 0 and 0.5');
    }
    return { valid: errors.length === 0, errors };
  }
}

const fireworksEffect = new FireworksEffect();
effectRegistry.register(fireworksEffect);

export { FireworksEffect, fireworksEffect };
export default fireworksEffect;