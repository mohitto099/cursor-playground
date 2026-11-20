/**
 * Object pool for efficient particle allocation
 */

import { vec2 } from '../utils/math.js';

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.available = [];
    this.active = [];
    this.maxSize = initialSize * 2;

    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  acquire() {
    let obj;
    if (this.available.length > 0) {
      obj = this.available.pop();
    } else if (this.active.length < this.maxSize) {
      obj = this.createFn();
    } else {
      return null;
    }
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const index = this.active.indexOf(obj);
    if (index !== -1) {
      this.active.splice(index, 1);
      this.resetFn(obj);
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    }
  }

  releaseAll() {
    for (const obj of this.active) {
      this.resetFn(obj);
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    }
    this.active.length = 0;
  }

  getActive() {
    return this.active;
  }

  getActiveCount() {
    return this.active.length;
  }

  getAvailableCount() {
    return this.available.length;
  }

  setMaxSize(size) {
    this.maxSize = size;
  }
}

export class ParticlePool {
  constructor(maxParticles = 2000) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.freeIndices = [];
    this.activeCount = 0;

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(this.createParticle());
      this.freeIndices.push(i);
    }
  }

  createParticle() {
    return {
      x: 0, y: 0,
      vx: 0, vy: 0,
      ax: 0, ay: 0,
      size: 4,
      life: 0,
      maxLife: 1000,
      age: 0,
      color: { r: 255, g: 255, b: 255 },
      alpha: 1,
      trail: [],
      trailLength: 0,
      effectId: '',
      active: false,
    };
  }

  acquire() {
    if (this.freeIndices.length === 0) return null;
    const index = this.freeIndices.pop();
    const particle = this.particles[index];
    particle.active = true;
    this.activeCount++;
    return { particle, index };
  }

  release(index) {
    if (index < 0 || index >= this.particles.length) return;
    const particle = this.particles[index];
    if (!particle.active) return;
    particle.active = false;
    particle.trailLength = 0;
    this.freeIndices.push(index);
    this.activeCount--;
  }

  releaseAll() {
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].active) {
        this.release(i);
      }
    }
  }

  getActiveParticles() {
    const result = [];
    for (const particle of this.particles) {
      if (particle.active) result.push(particle);
    }
    return result;
  }

  getActiveCount() {
    return this.activeCount;
  }

  setMaxParticles(max) {
    if (max >= this.particles.length) return;
    this.maxParticles = max;
    let removed = 0;
    for (let i = this.particles.length - 1; i >= max; i--) {
      if (!this.particles[i].active) {
        this.particles.pop();
        const idx = this.freeIndices.indexOf(i);
        if (idx !== -1) this.freeIndices.splice(idx, 1);
        removed++;
      }
    }
    if (this.activeCount > max) {
      let toDeactivate = this.activeCount - max;
      for (let i = 0; i < this.particles.length && toDeactivate > 0; i++) {
        if (this.particles[i].active) {
          this.release(i);
          toDeactivate--;
        }
      }
    }
  }

  forEachActive(fn) {
    for (const particle of this.particles) {
      if (particle.active) fn(particle);
    }
  }
}

export class TypedArrayPool {
  constructor(maxParticles = 2000) {
    this.maxParticles = maxParticles;
    this.count = 0;

    this.x = new Float32Array(maxParticles);
    this.y = new Float32Array(maxParticles);
    this.vx = new Float32Array(maxParticles);
    this.vy = new Float32Array(maxParticles);
    this.ax = new Float32Array(maxParticles);
    this.ay = new Float32Array(maxParticles);
    this.size = new Float32Array(maxParticles);
    this.life = new Float32Array(maxParticles);
    this.maxLife = new Float32Array(maxParticles);
    this.age = new Float32Array(maxParticles);
    this.r = new Uint8Array(maxParticles);
    this.g = new Uint8Array(maxParticles);
    this.b = new Uint8Array(maxParticles);
    this.alpha = new Float32Array(maxParticles);
    this.active = new Uint8Array(maxParticles);
    this.effectId = new Uint16Array(maxParticles);

    this.freeList = new Int32Array(maxParticles);
    this.freeCount = maxParticles;
    for (let i = 0; i < maxParticles; i++) {
      this.freeList[i] = i;
    }
  }

  acquire() {
    if (this.freeCount === 0) return -1;
    const index = this.freeList[--this.freeCount];
    this.active[index] = 1;
    this.count++;
    return index;
  }

  release(index) {
    if (index < 0 || index >= this.maxParticles || this.active[index] === 0) return;
    this.active[index] = 0;
    this.freeList[this.freeCount++] = index;
    this.count--;
  }

  releaseAll() {
    this.active.fill(0);
    this.count = 0;
    this.freeCount = this.maxParticles;
    for (let i = 0; i < this.maxParticles; i++) {
      this.freeList[i] = i;
    }
  }

  getActiveCount() {
    return this.count;
  }

  forEachActive(fn) {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.active[i]) {
        fn(i, this);
      }
    }
  }

  setMaxParticles(max) {
    if (max >= this.maxParticles) return;
    this.maxParticles = max;
    this.count = 0;
    this.freeCount = max;
    for (let i = 0; i < max; i++) {
      this.freeList[i] = i;
      this.active[i] = 0;
    }
  }
}