/**
 * Magnetic Field effect - attracts or repels particles from pointer
 */

import { EffectBase } from '../base/EffectBase.js';
import { clamp, vec2 } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

const FALLOFF_TYPES = ['linear', 'inverse', 'inverse-square'];

class MagneticFieldEffect extends EffectBase {
  constructor() {
    super({
      id: 'magneticField',
      name: 'Magnetic Field',
      category: 'particles',
      description: 'Particles are attracted to or repelled from the pointer',
      defaultConfig: {
        radius: 160,
        strength: 0.8,
        mode: 'attract',
        falloff: 'inverse-square',
        affectTrails: true,
        affectPhysics: true,
      },
    });

    this.controls = [
      { key: 'radius', type: 'slider', label: 'Radius', min: 50, max: 500, step: 10, description: 'Influence radius in pixels' },
      { key: 'strength', type: 'slider', label: 'Strength', min: 0, max: 3, step: 0.1, description: 'Force strength multiplier' },
      { key: 'mode', type: 'select', label: 'Mode', options: [
        { value: 'attract', label: 'Attract' },
        { value: 'repel', label: 'Repel' },
      ], description: 'Attract or repel particles' },
      { key: 'falloff', type: 'select', label: 'Falloff', options: [
        { value: 'linear', label: 'Linear' },
        { value: 'inverse', label: 'Inverse' },
        { value: 'inverse-square', label: 'Inverse Square' },
      ], description: 'How force decreases with distance' },
      { key: 'affectTrails', type: 'toggle', label: 'Affect Trails', description: 'Apply to particle trails' },
      { key: 'affectPhysics', type: 'toggle', label: 'Affect Physics', description: 'Apply to physics objects' },
    ];
  }

  update(deltaTime, context, config) {
    const pointer = context.pointer;
    const pool = context.particles;

    if (!pointer.isInside) return;

    const { x: px, y: py } = pointer.position;
    const radius = config.radius;
    const strength = config.strength * (config.mode === 'attract' ? 1 : -1);
    const falloff = config.falloff;

    pool.forEachActive((particle) => {
      const shouldAffect = (config.affectTrails && particle.effectId === 'particleTrail') ||
                           (config.affectPhysics && particle.effectId !== 'particleTrail');
      if (!shouldAffect) return;

      const dx = px - particle.x;
      const dy = py - particle.y;
      const distSq = dx * dx + dy * dy;
      const radiusSq = radius * radius;

      if (distSq >= radiusSq || distSq === 0) return;

      const dist = Math.sqrt(distSq);
      let factor;
      switch (falloff) {
        case 'inverse-square':
          factor = (1 - dist / radius) ** 2;
          break;
        case 'inverse':
          factor = 1 - dist / radius;
          break;
        case 'linear':
        default:
          factor = 1 - dist / radius;
          break;
      }

      const force = strength * factor * 0.5;
      particle.ax += (dx / dist) * force;
      particle.ay += (dy / dist) * force;
    });
  }

  validateConfig(config) {
    const errors = [];
    if (config.radius !== undefined && (config.radius < 10 || config.radius > 1000)) {
      errors.push('radius must be between 10 and 1000');
    }
    if (config.strength !== undefined && (config.strength < 0 || config.strength > 5)) {
      errors.push('strength must be between 0 and 5');
    }
    if (config.mode && !['attract', 'repel'].includes(config.mode)) {
      errors.push('mode must be "attract" or "repel"');
    }
    if (config.falloff && !FALLOFF_TYPES.includes(config.falloff)) {
      errors.push(`falloff must be one of: ${FALLOFF_TYPES.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}

const magneticFieldEffect = new MagneticFieldEffect();
effectRegistry.register(magneticFieldEffect);

export { MagneticFieldEffect, magneticFieldEffect };
export default magneticFieldEffect;