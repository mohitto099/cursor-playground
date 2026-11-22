/**
 * Attraction/Repulsion effect - configurable force fields
 */

import { EffectBase } from '../base/EffectBase.js';
import { clamp, distanceSq } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

const FALLOFF_TYPES = ['linear', 'inverse', 'inverse-square', 'gaussian'];
const FORCE_MODES = ['attract', 'repel', 'vortex', 'spiral'];

class AttractionEffect extends EffectBase {
  constructor() {
    super({
      id: 'attraction',
      name: 'Attraction Field',
      category: 'physics',
      description: 'Configurable force fields around pointer with multiple modes',
      defaultConfig: {
        radius: 150,
        strength: 0.5,
        mode: 'attract',
        falloff: 'inverse',
        maxForce: 3,
        affectTrails: true,
        affectPhysics: true,
        vortexStrength: 0.3,
        spiralStrength: 0.2,
      },
    });

    this.controls = [
      { key: 'radius', type: 'slider', label: 'Radius', min: 20, max: 500, step: 10, description: 'Force field radius' },
      { key: 'strength', type: 'slider', label: 'Strength', min: 0, max: 3, step: 0.05, description: 'Base force strength' },
      { key: 'mode', type: 'select', label: 'Mode', options: [
        { value: 'attract', label: 'Attract' },
        { value: 'repel', label: 'Repel' },
        { value: 'vortex', label: 'Vortex' },
        { value: 'spiral', label: 'Spiral' },
      ], description: 'Force field behavior mode' },
      { key: 'falloff', type: 'select', label: 'Falloff', options: [
        { value: 'linear', label: 'Linear' },
        { value: 'inverse', label: 'Inverse' },
        { value: 'inverse-square', label: 'Inverse Square' },
        { value: 'gaussian', label: 'Gaussian' },
      ], description: 'Force falloff curve' },
      { key: 'maxForce', type: 'slider', label: 'Max Force', min: 0.5, max: 10, step: 0.5, description: 'Maximum force cap' },
      { key: 'vortexStrength', type: 'slider', label: 'Vortex Strength', min: 0, max: 2, step: 0.05, description: 'Rotational force for vortex mode' },
      { key: 'spiralStrength', type: 'slider', label: 'Spiral Strength', min: 0, max: 2, step: 0.05, description: 'Outward spiral force' },
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
    const strength = config.strength;
    const maxForce = config.maxForce;
    const radiusSq = radius * radius;

    pool.forEachActive((particle) => {
      const shouldAffect = (config.affectTrails && particle.effectId === 'particleTrail') ||
                           (config.affectPhysics && particle.effectId !== 'particleTrail');
      if (!shouldAffect) return;

      const dx = px - particle.x;
      const dy = py - particle.y;
      const distSq = dx * dx + dy * dy;

      if (distSq >= radiusSq || distSq === 0) return;

      const dist = Math.sqrt(distSq);
      let factor = 0;

      switch (config.falloff) {
        case 'inverse-square':
          factor = (1 - dist / radius) ** 2;
          break;
        case 'inverse':
          factor = 1 - dist / radius;
          break;
        case 'gaussian':
          factor = Math.exp(-2 * (dist / radius) ** 2);
          break;
        case 'linear':
        default:
          factor = 1 - dist / radius;
          break;
      }

      if (factor <= 0) return;

      let fx = 0, fy = 0;
      const baseForce = strength * factor;

      switch (config.mode) {
        case 'attract':
          fx = (dx / dist) * baseForce;
          fy = (dy / dist) * baseForce;
          break;
        case 'repel':
          fx = -(dx / dist) * baseForce;
          fy = -(dy / dist) * baseForce;
          break;
        case 'vortex':
          // Tangential force (perpendicular to radius)
          fx = -(dy / dist) * baseForce * config.vortexStrength;
          fy = (dx / dist) * baseForce * config.vortexStrength;
          break;
        case 'spiral':
          // Combination of attract + tangential
          const attractForce = baseForce * (1 - config.spiralStrength);
          const tangentialForce = baseForce * config.spiralStrength;
          fx = (dx / dist) * attractForce - (dy / dist) * tangentialForce;
          fy = (dy / dist) * attractForce + (dx / dist) * tangentialForce;
          break;
      }

      // Clamp force
      const forceMag = Math.sqrt(fx * fx + fy * fy);
      if (forceMag > maxForce) {
        const scale = maxForce / forceMag;
        fx *= scale;
        fy *= scale;
      }

      particle.ax += fx * deltaTime * 0.001;
      particle.ay += fy * deltaTime * 0.001;
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
    if (config.mode && !FORCE_MODES.includes(config.mode)) {
      errors.push(`mode must be one of: ${FORCE_MODES.join(', ')}`);
    }
    if (config.falloff && !FALLOFF_TYPES.includes(config.falloff)) {
      errors.push(`falloff must be one of: ${FALLOFF_TYPES.join(', ')}`);
    }
    if (config.maxForce !== undefined && (config.maxForce < 0.1 || config.maxForce > 20)) {
      errors.push('maxForce must be between 0.1 and 20');
    }
    return { valid: errors.length === 0, errors };
  }
}

const attractionEffect = new AttractionEffect();
effectRegistry.register(attractionEffect);

export { AttractionEffect, attractionEffect };
export default attractionEffect;