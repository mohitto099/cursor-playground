/**
 * Collision effect - handles particle-particle and boundary collisions
 */

import { EffectBase } from '../base/EffectBase.js';
import { distanceSq, clamp } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

class CollisionEffect extends EffectBase {
  constructor() {
    super({
      id: 'collision',
      name: 'Collisions',
      category: 'physics',
      description: 'Particle-particle and boundary collisions with spatial optimization',
      defaultConfig: {
        particleCollision: true,
        boundaryCollision: true,
        bounce: 0.7,
        damping: 0.98,
        spatialGrid: true,
        cellSize: 50,
        maxCollisionsPerFrame: 1000,
      },
    });

    this.controls = [
      { key: 'particleCollision', type: 'toggle', label: 'Particle Collisions', description: 'Enable particle-particle collisions' },
      { key: 'boundaryCollision', type: 'toggle', label: 'Boundary Collisions', description: 'Enable canvas boundary collisions' },
      { key: 'bounce', type: 'slider', label: 'Bounce', min: 0, max: 1, step: 0.05, description: 'Collision energy retention' },
      { key: 'damping', type: 'slider', label: 'Damping', min: 0.9, max: 1, step: 0.001, description: 'Post-collision velocity damping' },
      { key: 'cellSize', type: 'slider', label: 'Grid Cell Size', min: 20, max: 200, step: 10, description: 'Spatial grid cell size' },
    ];

    this.grid = new Map();
    this.cellSize = 50;
  }

  update(deltaTime, context, config) {
    const pool = context.particles;
    const { width, height } = this.getCanvasSize();
    this.cellSize = config.cellSize;

    // Boundary collisions
    if (config.boundaryCollision) {
      pool.forEachActive((particle) => {
        const size = particle.size * 0.5;
        let collided = false;

        if (particle.x - size < 0) {
          particle.x = size;
          particle.vx = Math.abs(particle.vx) * config.bounce;
          collided = true;
        } else if (particle.x + size > width) {
          particle.x = width - size;
          particle.vx = -Math.abs(particle.vx) * config.bounce;
          collided = true;
        }

        if (particle.y - size < 0) {
          particle.y = size;
          particle.vy = Math.abs(particle.vy) * config.bounce;
          collided = true;
        } else if (particle.y + size > height) {
          particle.y = height - size;
          particle.vy = -Math.abs(particle.vy) * config.bounce;
          collided = true;
        }

        if (collided) {
          particle.vx *= config.damping;
          particle.vy *= config.damping;
        }
      });
    }

    // Particle-particle collisions (simplified for performance)
    if (config.particleCollision) {
      this.resolveParticleCollisions(pool, config);
    }
  }

  resolveParticleCollisions(pool, config) {
    const activeParticles = pool.getActiveParticles();
    const count = activeParticles.length;
    if (count < 2) return;

    let collisionCount = 0;
    const maxCollisions = config.maxCollisionsPerFrame || 1000;

    if (config.spatialGrid) {
      // Spatial grid optimization
      this.buildGrid(activeParticles);

      for (const particle of activeParticles) {
        if (collisionCount >= maxCollisions) break;
        const cellX = Math.floor(particle.x / this.cellSize);
        const cellY = Math.floor(particle.y / this.cellSize);

        // Check neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            const neighbors = this.grid.get(key);
            if (!neighbors) continue;

            for (const other of neighbors) {
              if (particle === other) continue;
              if (collisionCount >= maxCollisions) break;

              if (this.checkCollision(particle, other)) {
                this.resolveCollision(particle, other, config);
                collisionCount++;
              }
            }
          }
        }
      }
    } else {
      // Brute force for small particle counts
      for (let i = 0; i < count - 1; i++) {
        if (collisionCount >= maxCollisions) break;
        for (let j = i + 1; j < count; j++) {
          if (collisionCount >= maxCollisions) break;
          if (this.checkCollision(activeParticles[i], activeParticles[j])) {
            this.resolveCollision(activeParticles[i], activeParticles[j], config);
            collisionCount++;
          }
        }
      }
    }

    this.grid.clear();
  }

  buildGrid(particles) {
    this.grid.clear();
    for (const particle of particles) {
      const cellX = Math.floor(particle.x / this.cellSize);
      const cellY = Math.floor(particle.y / this.cellSize);
      const key = `${cellX},${cellY}`;
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key).push(particle);
    }
  }

  checkCollision(p1, p2) {
    const minDist = (p1.size + p2.size) * 0.5;
    return distanceSq(p1.x, p1.y, p2.x, p2.y) < minDist * minDist;
  }

  resolveCollision(p1, p2, config) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    const minDist = (p1.size + p2.size) * 0.5;

    if (distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;

    // Separate particles
    const nx = dx / dist;
    const ny = dy / dist;

    p1.x -= nx * overlap * 0.5;
    p1.y -= ny * overlap * 0.5;
    p2.x += nx * overlap * 0.5;
    p2.y += ny * overlap * 0.5;

    // Elastic collision response
    const dvx = p2.vx - p1.vx;
    const dvy = p2.vy - p1.vy;
    const dvn = dvx * nx + dvy * ny;

    if (dvn > 0) return; // Moving apart

    const restitution = config.bounce;
    const impulse = (-(1 + restitution) * dvn) / 2; // Equal mass

    p1.vx -= impulse * nx;
    p1.vy -= impulse * ny;
    p2.vx += impulse * nx;
    p2.vy += impulse * ny;

    // Apply damping
    p1.vx *= config.damping;
    p1.vy *= config.damping;
    p2.vx *= config.damping;
    p2.vy *= config.damping;
  }

  validateConfig(config) {
    const errors = [];
    if (config.bounce !== undefined && (config.bounce < 0 || config.bounce > 1)) {
      errors.push('bounce must be between 0 and 1');
    }
    if (config.damping !== undefined && (config.damping < 0.5 || config.damping > 1)) {
      errors.push('damping must be between 0.5 and 1');
    }
    if (config.cellSize !== undefined && (config.cellSize < 10 || config.cellSize > 500)) {
      errors.push('cellSize must be between 10 and 500');
    }
    return { valid: errors.length === 0, errors };
  }
}

const collisionEffect = new CollisionEffect();
effectRegistry.register(collisionEffect);

export { CollisionEffect, collisionEffect };
export default collisionEffect;