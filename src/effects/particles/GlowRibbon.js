/**
 * Glow Ribbon effect - smooth glowing ribbon trail following pointer
 */

import { EffectBase } from '../base/EffectBase.js';
import { vec2, lerp } from '../../utils/math.js';
import { colorToCss } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

class GlowRibbonEffect extends EffectBase {
  constructor() {
    super({
      id: 'glowRibbon',
      name: 'Glow Ribbon',
      category: 'particles',
      description: 'Smooth glowing ribbon trail follows pointer movement',
      defaultConfig: {
        width: 3,
        color: '#00ffc8',
        fadeTime: 800,
        smoothing: 0.15,
        segments: 20,
        glowIntensity: 0.5,
        minDistance: 2,
      },
    });

    this.controls = [
      { key: 'width', type: 'slider', label: 'Width', min: 1, max: 20, step: 0.5, description: 'Ribbon width in pixels' },
      { key: 'color', type: 'color', label: 'Color', description: 'Ribbon color' },
      { key: 'fadeTime', type: 'slider', label: 'Fade Time', min: 100, max: 5000, step: 50, description: 'Trail fade duration in ms' },
      { key: 'smoothing', type: 'slider', label: 'Smoothing', min: 0, max: 1, step: 0.01, description: 'Position smoothing factor' },
      { key: 'segments', type: 'slider', label: 'Segments', min: 5, max: 50, step: 1, description: 'Number of ribbon segments' },
      { key: 'glowIntensity', type: 'slider', label: 'Glow Intensity', min: 0, max: 1, step: 0.05, description: 'Glow effect strength' },
    ];

    this.points = [];
    this.maxPoints = 100;
  }

  initialize(context, config) {
    super.initialize(context, config);
    this.points = [];
  }

  onEnable(context, config) {
    this.points = [];
  }

  onDisable(context, config) {
    this.points = [];
  }

  onPointerDown(pointer, context, config) {
    // Add point on click for burst effect
    this.addPoint(pointer.position.x, pointer.position.y);
  }

  update(deltaTime, context, config) {
    const pointer = context.pointer;

    if (!pointer.isInside) return;

    // Add current pointer position to trail
    this.addPoint(pointer.position.x, pointer.position.y);

    // Update point ages and remove expired
    const now = context.time;
    const maxAge = config.fadeTime;
    this.points = this.points.filter(p => now - p.time < maxAge);

    // Limit points
    if (this.points.length > this.maxPoints) {
      this.points = this.points.slice(-this.maxPoints);
    }
  }

  addPoint(x, y) {
    const config = this.config;
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < config.minDistance) return;
    }

    this.points.push({
      x, y,
      time: this.context?.time || Date.now(),
    });
  }

  render(context, config) {
    const renderer = context.renderer;
    if (!renderer || this.points.length < 2) return;

    // Create smoothed path
    const smoothed = this.getSmoothedPoints(config.smoothing);
    if (smoothed.length < 2) return;

    const color = config.color;
    const maxAge = config.fadeTime;
    const now = context.time;

    // Draw ribbon segments with fading alpha
    for (let i = 1; i < smoothed.length; i++) {
      const p0 = smoothed[i - 1];
      const p1 = smoothed[i];

      // Calculate age-based alpha
      const age0 = now - p0.time;
      const age1 = now - p1.time;
      const alpha0 = Math.max(0, 1 - age0 / maxAge);
      const alpha1 = Math.max(0, 1 - age1 / maxAge);
      const alpha = (alpha0 + alpha1) * 0.5 * config.glowIntensity;

      if (alpha <= 0) continue;

      const width = config.width * alpha;

      // Draw main line
      renderer.drawLine(
        p0.x, p0.y,
        p1.x, p1.y,
        color, alpha, width
      );

      // Draw glow
      if (config.glowIntensity > 0) {
        renderer.drawLine(
          p0.x, p0.y,
          p1.x, p1.y,
          color, alpha * 0.5, width * 3
        );
      }
    }
  }

  getSmoothedPoints(smoothing) {
    if (this.points.length < 3) return this.points;

    const smoothed = [this.points[0]];
    for (let i = 1; i < this.points.length - 1; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const next = this.points[i + 1];

      const x = lerp(curr.x, (prev.x + next.x) * 0.5, smoothing);
      const y = lerp(curr.y, (prev.y + next.y) * 0.5, smoothing);

      smoothed.push({ ...curr, x, y });
    }
    smoothed.push(this.points[this.points.length - 1]);
    return smoothed;
  }

  validateConfig(config) {
    const errors = [];
    if (config.width !== undefined && (config.width < 0.5 || config.width > 50)) {
      errors.push('width must be between 0.5 and 50');
    }
    if (config.fadeTime !== undefined && (config.fadeTime < 50 || config.fadeTime > 10000)) {
      errors.push('fadeTime must be between 50 and 10000');
    }
    if (config.smoothing !== undefined && (config.smoothing < 0 || config.smoothing > 1)) {
      errors.push('smoothing must be between 0 and 1');
    }
    if (config.segments !== undefined && (config.segments < 3 || config.segments > 100)) {
      errors.push('segments must be between 3 and 100');
    }
    return { valid: errors.length === 0, errors };
  }
}

const glowRibbonEffect = new GlowRibbonEffect();
effectRegistry.register(glowRibbonEffect);

export { GlowRibbonEffect, glowRibbonEffect };
export default glowRibbonEffect;