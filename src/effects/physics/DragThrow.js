/**
 * Drag and Throw effect - grab, drag, and throw particles
 */

import { EffectBase } from '../base/EffectBase.js';
import { distanceSq, clamp } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

class DragThrowEffect extends EffectBase {
  constructor() {
    super({
      id: 'dragThrow',
      name: 'Drag & Throw',
      category: 'physics',
      description: 'Grab particles with pointer, drag them, and throw with velocity',
      defaultConfig: {
        grabRadius: 24,
        throwMultiplier: 1.5,
        maxThrowSpeed: 30,
        dragDamping: 0.9,
        affectTrails: true,
        affectPhysics: true,
        showGrabIndicator: true,
      },
    });

    this.controls = [
      { key: 'grabRadius', type: 'slider', label: 'Grab Radius', min: 10, max: 100, step: 1, description: 'Distance to grab particles' },
      { key: 'throwMultiplier', type: 'slider', label: 'Throw Multiplier', min: 0.5, max: 5, step: 0.1, description: 'Velocity multiplier on release' },
      { key: 'maxThrowSpeed', type: 'slider', label: 'Max Throw Speed', min: 5, max: 100, step: 5, description: 'Maximum throw speed cap' },
      { key: 'dragDamping', type: 'slider', label: 'Drag Damping', min: 0.5, max: 1, step: 0.05, description: 'Damping while dragging' },
      { key: 'affectTrails', type: 'toggle', label: 'Affect Trails', description: 'Allow grabbing trail particles' },
      { key: 'affectPhysics', type: 'toggle', label: 'Affect Physics', description: 'Allow grabbing physics particles' },
      { key: 'showGrabIndicator', type: 'toggle', label: 'Show Grab Indicator', description: 'Visual feedback when grabbing' },
    ];

    this.grabbedParticle = null;
    this.grabbedIndex = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.lastPointerPos = { x: 0, y: 0 };
  }

  onPointerDown(pointer, context, config) {
    if (pointer.button !== 'left') return;

    const pool = context.particles;
    const { x, y } = pointer.position;
    const radiusSq = config.grabRadius * config.grabRadius;

    let closest = null;
    let closestDistSq = Infinity;
    let closestIndex = -1;

    pool.forEachActive((particle, index) => {
      const shouldAffect = (config.affectTrails && particle.effectId === 'particleTrail') ||
                           (config.affectPhysics && particle.effectId !== 'particleTrail');
      if (!shouldAffect) return;

      const dx = particle.x - x;
      const dy = particle.y - y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq < closestDistSq) {
        closestDistSq = distSq;
        closest = particle;
        closestIndex = index;
      }
    });

    if (closest) {
      this.grabbedParticle = closest;
      this.grabbedIndex = closestIndex;
      this.dragStartPos = { x, y };
      this.lastPointerPos = { x, y };
      closest.isGrabbed = true;
      closest.vx = 0;
      closest.vy = 0;
    }
  }

  onPointerUp(pointer, context, config) {
    if (pointer.button !== 'left' || !this.grabbedParticle) return;

    const pointerVel = { x: pointer.velocity.x, y: pointer.velocity.y };
    const speed = Math.sqrt(pointerVel.x * pointerVel.x + pointerVel.y * pointerVel.y);
    const cappedSpeed = Math.min(speed * config.throwMultiplier, config.maxThrowSpeed);

    if (cappedSpeed > 0.5) {
      const dirX = pointerVel.x / speed;
      const dirY = pointerVel.y / speed;
      this.grabbedParticle.vx = dirX * cappedSpeed;
      this.grabbedParticle.vy = dirY * cappedSpeed;
    }

    this.grabbedParticle.isGrabbed = false;
    this.grabbedParticle = null;
    this.grabbedIndex = null;
  }

  update(deltaTime, context, config) {
    const pointer = context.pointer;

    if (this.grabbedParticle && pointer.isInside) {
      // Update dragged particle position smoothly
      const targetX = pointer.position.x;
      const targetY = pointer.position.y;

      // Smooth follow
      const lerpFactor = 0.3;
      this.grabbedParticle.x += (targetX - this.grabbedParticle.x) * lerpFactor;
      this.grabbedParticle.y += (targetY - this.grabbedParticle.y) * lerpFactor;

      // Zero velocity while grabbed
      this.grabbedParticle.vx = 0;
      this.grabbedParticle.vy = 0;

      // Apply drag damping to nearby particles (optional visual effect)
      if (config.dragDamping < 1) {
        const pool = context.particles;
        const grabX = this.grabbedParticle.x;
        const grabY = this.grabbedParticle.y;
        const influenceRadius = config.grabRadius * 2;
        const radiusSq = influenceRadius * influenceRadius;

        pool.forEachActive((particle) => {
          if (particle === this.grabbedParticle) return;
          const dx = particle.x - grabX;
          const dy = particle.y - grabY;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq && distSq > 0) {
            const factor = 1 - distSq / radiusSq;
            particle.vx *= 1 - (1 - config.dragDamping) * factor * 0.5;
            particle.vy *= 1 - (1 - config.dragDamping) * factor * 0.5;
          }
        });
      }
    } else if (this.grabbedParticle && !pointer.isInside) {
      // Pointer left canvas while grabbing - release
      this.grabbedParticle.isGrabbed = false;
      this.grabbedParticle = null;
      this.grabbedIndex = null;
    }
  }

  render(context, config) {
    if (!config.showGrabIndicator || !this.grabbedParticle) return;

    const renderer = context.renderer;
    if (!renderer) return;

    const particle = this.grabbedParticle;
    const pointer = context.pointer;

    // Draw grab indicator
    renderer.drawCircle(
      particle.x, particle.y,
      particle.size * 1.5,
      '#ffffff', 0.5, false
    );

    // Draw line to pointer if inside
    if (pointer.isInside) {
      renderer.drawLine(
        particle.x, particle.y,
        pointer.position.x, pointer.position.y,
        '#ffffff', 0.3, 1
      );
    }
  }

  validateConfig(config) {
    const errors = [];
    if (config.grabRadius !== undefined && (config.grabRadius < 5 || config.grabRadius > 200)) {
      errors.push('grabRadius must be between 5 and 200');
    }
    if (config.throwMultiplier !== undefined && (config.throwMultiplier < 0.1 || config.throwMultiplier > 10)) {
      errors.push('throwMultiplier must be between 0.1 and 10');
    }
    if (config.maxThrowSpeed !== undefined && (config.maxThrowSpeed < 1 || config.maxThrowSpeed > 200)) {
      errors.push('maxThrowSpeed must be between 1 and 200');
    }
    if (config.dragDamping !== undefined && (config.dragDamping < 0 || config.dragDamping > 1)) {
      errors.push('dragDamping must be between 0 and 1');
    }
    return { valid: errors.length === 0, errors };
  }
}

const dragThrowEffect = new DragThrowEffect();
effectRegistry.register(dragThrowEffect);

export { DragThrowEffect, dragThrowEffect };
export default dragThrowEffect;