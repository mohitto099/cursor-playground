/**
 * Performance monitor with rolling FPS and particle counts
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.sampleSize = options.sampleSize || 60;
    this.frameTimes = new Float32Array(this.sampleSize);
    this.frameIndex = 0;
    this.frameCount = 0;
    this.lastTime = 0;

    this.fps = 60;
    this.avgFrameTime = 16.67;
    this.minFps = 60;
    this.maxFps = 60;

    this.particleCount = 0;
    this.activeEffectCount = 0;

    this.performanceState = 'good';
    this.lowPowerMode = false;

    this.callbacks = new Set();
  }

  beginFrame(time) {
    if (this.lastTime > 0) {
      const dt = time - this.lastTime;
      this.frameTimes[this.frameIndex] = dt;
      this.frameIndex = (this.frameIndex + 1) % this.sampleSize;
      this.frameCount = Math.min(this.frameCount + 1, this.sampleSize);

      if (this.frameCount >= 10) {
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < this.frameCount; i++) {
          const ft = this.frameTimes[i];
          sum += ft;
          if (ft < min) min = ft;
          if (ft > max) max = ft;
        }
        this.avgFrameTime = sum / this.frameCount;
        this.fps = 1000 / this.avgFrameTime;
        this.minFps = 1000 / max;
        this.maxFps = 1000 / min;
      }
    }
    this.lastTime = time;
  }

  endFrame() {}

  setParticleCount(count) {
    this.particleCount = count;
  }

  setActiveEffectCount(count) {
    this.activeEffectCount = count;
  }

  updatePerformanceState() {
    if (this.fps < 20) {
      this.performanceState = 'critical';
    } else if (this.fps < 40) {
      this.performanceState = 'warn';
    } else {
      this.performanceState = 'good';
    }
  }

  getState() {
    return {
      fps: Math.round(this.fps),
      avgFrameTime: this.avgFrameTime,
      minFps: Math.round(this.minFps),
      maxFps: Math.round(this.maxFps),
      particleCount: this.particleCount,
      activeEffectCount: this.activeEffectCount,
      performanceState: this.performanceState,
      lowPowerMode: this.lowPowerMode,
    };
  }

  setLowPowerMode(enabled) {
    this.lowPowerMode = enabled;
    this.notifyCallbacks('lowPowerMode', enabled);
  }

  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks(type, data) {
    for (const cb of this.callbacks) {
      try {
        cb(type, data);
      } catch (e) {
        console.error('Performance monitor callback error:', e);
      }
    }
  }

  reset() {
    this.frameTimes.fill(0);
    this.frameIndex = 0;
    this.frameCount = 0;
    this.lastTime = 0;
    this.fps = 60;
    this.avgFrameTime = 16.67;
  }
}

export const createPerformanceMonitor = (options) => new PerformanceMonitor(options);