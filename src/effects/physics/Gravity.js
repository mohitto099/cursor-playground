/**
 * Gravity effect - applies gravity force to particles
 */

import { EffectBase } from '../base/EffectBase.js';
import { vec2, degToRad, clamp } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

const BOUNDS_TYPES = ['canvas', 'wrap', 'none'];

class GravityEffect extends EffectBase {
  constructor() {
    super({
      id: 'gravity',
      name: 'Gravity',
      category: 'physics',
      description: 'Applies gravity force to particles with optional attractor',
      defaultConfig: {
        strength: 0.15,
        direction: 90,
        attractorRadius: 200,
        attractorStrength: 0,
        bounds: 'canvas',
        bounce: 0.6,
        damping: 0.99,
      },
    });

    this.controls = [
      { key: 'strength', type: 'slider', label: 'Gravity Strength', min: 0, max: 2, step: 0.01, description: 'Downward gravity force' },
      { key: 'direction', type: 'slider', label: 'Direction', min: 0, max: 360, step: 1, description: 'Gravity direction in degrees' },
      { key: 'attractorRadius', type: 'slider', label: 'Attractor Radius', min: 0, max: 500, step: 10, description: 'Radius of pointer attractor (0 to disable)' },
      { key: 'attractorStrength', type: 'slider', label: 'Attractor Strength', min: -2, max: 2, step: 0.05, description: 'Pointer attractor force (negative = repel)' },
      { key: 'bounds', type: 'select', label: 'Bounds', options: [
        { value: 'canvas', label: 'Canvas (bounce)' },
        { value: 'wrap', label: 'Wrap Around' },
        { value: 'none', label: 'None' },
      ], description: 'Boundary behavior' },
      { key: 'bounce', type: 'slider', label: 'Bounce', min: 0, max: 1, step: 0.05, description: 'Bounce energy retention' },
      { key: 'damping', type: 'slider', label: 'Damping', min: 0.9, max: 1, step: 0.001, description: 'Velocity damping per frame' },
    ];
  }

  update(deltaTime, context, config) {
    const pointer = context.pointer;
    const pool = context.particles;
    const globalConfig = context.globalConfig;
    const speed = globalConfig.speed || 1;

    const gravityX = Math.cos(degToRad(config.direction)) * config.strength * speed;
    const gravityY = Math.sin(degToRad(config.direction)) * config.strength * speed;

    const hasAttractor = config.attractorRadius > 0 && config.attractorStrength !== 0 && pointer.isInside;

    pool.forEachActive((particle) => {
      // Apply gravity
      particle.vx += gravityX * deltaTime * 0.001;
      particle.vy += gravityY * deltaTime * 0.001;

      // Apply pointer attractor
      if (hasAttractor) {
        const dx = pointer.position.x - particle.x;
        const dy = pointer.position.y - particle.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = config.attractorRadius * config.attractorRadius;

        if (distSq < radiusSq && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const factor = (1 - dist / config.attractorRadius) ** 2;
          const force = config.attractorStrength * factor * speed * 0.5;
          particle.vx += (dx / dist) * force * deltaTime * 0.001;
          particle.vy += (dy / dist) * force * deltaTime * 0.001;
        }
      }

      // Apply damping
      particle.vx *= config.damping;
      particle.vy *= config.damping;

      // Update position
      particle.x += particle.vx * speed * (deltaTime / 16.67);
      particle.y += particle.vy * speed * (deltaTime / 16.67);

      // Handle bounds
      this.handleBounds(particle, config);
    });
  }

  handleBounds(particle, config) {
    const { width, height } = this.getCanvasSize();
    const size = particle.size * 0.5;

    switch (config.bounds) {
      case 'wrap':
        if (particle.x < -size) particle.x = width + size;
        if (particle.x > width + size) particle.x = -size;
        if (particle.y < -size) particle.y = height + size;
        if (particle.y > height + size) particle.y = -size;
        break;
      case 'canvas':
      default:
        if (particle.x - size < 0) {
          particle.x = size;
          particle.vx *= -config.bounce;
        } else if (particle.x + size > width) {
          particle.x = width - size;
          particle.vx *= -config.bounce;
        }
        if (particle.y - size < 0) {
          particle.y = size;
          particle.vy *= -config.bounce;
        } else if (particle.y + size > height) {
          particle.y = height - size;
          particle.vy *= -config.bounce;
        }
        break;
    }
  }

  validateConfig(config) {
    const errors = [];
    if (config.strength !== undefined && (config.strength < 0 || config.strength > 5)) {
      errors.push('strength must be between 0 and 5');
    }
    if (config.direction !== undefined && (config.direction < 0 || config.direction > 360)) {
      errors.push('direction must be between 0 and 360');
    }
    if (config.attractorRadius !== undefined && (config.attractorRadius < 0 || config.attractorRadius > 1000)) {
      errors.push('attractorRadius must be between 0 and 1000');
    }
    if (config.attractorStrength !== undefined && (config.attractorStrength < -5 || config.attractorStrength > 5)) {
      errors.push('attractorStrength must be between -5 and 5');
    }
    if (config.bounds && !BOUNDS_TYPES.includes(config.bounds)) {
      errors.push(`bounds must be one of: ${BOUNDS_TYPES.join(', ')}`);
    }
    if (config.bounce !== undefined && (config.bounce < 0 || config.bounce > 1)) {
      errors.push('bounce must be between 0 and 1');
    }
    if (config.damping !== undefined && (config.damping < 0.5 || config.damping > 1)) {
      errors.push('damping must be between 0.5 and 1');
    }
    return { valid: errors.length === 0, errors };
  }
}

const gravityEffect = new GravityEffect();
effectRegistry.register(gravityEffect);

export { GravityEffect, gravityEffect };
export default gravityEffect;