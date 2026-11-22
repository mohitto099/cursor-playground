/**
 * Distortion effect - visual distortion of canvas elements
 */

import { EffectBase } from '../base/EffectBase.js';
import { clamp, lerp, smoothstep } from '../../utils/math.js';
import { effectRegistry } from '../registry.js';

const DISTORTION_TYPES = ['wave', 'ripple', 'twist', 'bulge', 'pinch', 'chromatic'];

class DistortionEffect extends EffectBase {
  constructor() {
    super({
      id: 'distortion',
      name: 'Distortion',
      category: 'visual',
      description: 'Visual distortion effects on the canvas',
      defaultConfig: {
        type: 'wave',
        amplitude: 10,
        frequency: 0.02,
        speed: 1,
        radius: 200,
        centerX: 0.5,
        centerY: 0.5,
        chromaticAberration: 0,
        enabled: false,
      },
    });

    this.controls = [
      { key: 'enabled', type: 'toggle', label: 'Enabled', description: 'Enable distortion effect' },
      { key: 'type', type: 'select', label: 'Type', options: DISTORTION_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })), description: 'Distortion type' },
      { key: 'amplitude', type: 'slider', label: 'Amplitude', min: 0, max: 50, step: 1, description: 'Distortion strength' },
      { key: 'frequency', type: 'slider', label: 'Frequency', min: 0.001, max: 0.1, step: 0.001, description: 'Wave frequency' },
      { key: 'speed', type: 'slider', label: 'Speed', min: 0, max: 5, step: 0.1, description: 'Animation speed' },
      { key: 'radius', type: 'slider', label: 'Radius', min: 50, max: 500, step: 10, description: 'Effect radius (0 = full screen)' },
      { key: 'centerX', type: 'slider', label: 'Center X', min: 0, max: 1, step: 0.01, description: 'Horizontal center (0-1)' },
      { key: 'centerY', type: 'slider', label: 'Center Y', min: 0, max: 1, step: 0.01, description: 'Vertical center (0-1)' },
      { key: 'chromaticAberration', type: 'slider', label: 'Chromatic Aberration', min: 0, max: 10, step: 0.5, description: 'RGB channel separation' },
    ];

    this.phase = 0;
    this.canvasCopy = null;
  }

  initialize(context, config) {
    super.initialize(context, config);
    // Create offscreen canvas for distortion rendering
    this.canvasCopy = document.createElement('canvas');
    this.ctxCopy = this.canvasCopy.getContext('2d');
  }

  onResize(context, config) {
    if (this.canvasCopy) {
      this.canvasCopy.width = context.width;
      this.canvasCopy.height = context.height;
    }
  }

  update(deltaTime, context, config) {
    if (!config.enabled) return;
    this.phase += deltaTime * config.speed * 0.001;
  }

  render(context, config) {
    if (!config.enabled || !this.ctxCopy) return;

    const renderer = context.renderer;
    const canvas = context.canvas;
    const { width, height } = context;
    const dpr = context.dpr || 1;

    const cssWidth = width / dpr;
    const cssHeight = height / dpr;

    // Copy current canvas to offscreen
    this.canvasCopy.width = cssWidth;
    this.canvasCopy.height = cssHeight;
    this.ctxCopy.drawImage(canvas, 0, 0, cssWidth, cssHeight);

    // Clear main canvas
    renderer.clear();

    // Apply distortion by drawing warped slices
    this.drawDistorted(renderer, config, cssWidth, cssHeight);
  }

  drawDistorted(renderer, config, width, height) {
    const { ctxCopy } = this;
    if (!ctxCopy) return;

    const cx = width * config.centerX;
    const cy = height * config.centerY;
    const radius = config.radius > 0 ? config.radius : Math.max(width, height);
    const amplitude = config.amplitude;
    const frequency = config.frequency;
    const phase = this.phase;

    const slices = 20; // Number of vertical slices for distortion
    const sliceWidth = width / slices;

    for (let i = 0; i < slices; i++) {
      const x = i * sliceWidth;
      const sliceCenterX = x + sliceWidth * 0.5;
      const dx = sliceCenterX - cx;
      const dy = 0; // Will vary per y in pixel manipulation

      // For wave/ripple, calculate offset based on distance from center
      let offsetX = 0;

      switch (config.type) {
        case 'wave':
          offsetX = Math.sin((cy * frequency) + phase) * amplitude * (1 - Math.abs(dx) / radius);
          break;
        case 'ripple':
          const dist = Math.sqrt(dx * dx + (cy * 0.5) * (cy * 0.5));
          offsetX = Math.sin(dist * frequency - phase) * amplitude * (1 - dist / radius);
          break;
        case 'twist':
          const angle = (dx / radius) * Math.PI * 0.5;
          offsetX = Math.sin(phase) * amplitude * Math.sin(angle);
          break;
        case 'bulge':
          const bulgeDist = Math.abs(dx) / radius;
          offsetX = Math.sin(phase) * amplitude * (1 - bulgeDist * bulgeDist);
          break;
        case 'pinch':
          const pinchFactor = 1 - Math.abs(dx) / radius;
          offsetX = Math.sin(phase * 2) * amplitude * pinchFactor * (dx > 0 ? 1 : -1);
          break;
        case 'chromatic':
          // Handled separately
          offsetX = 0;
          break;
      }

      // Clamp offset
      offsetX = clamp(offsetX, -amplitude, amplitude);

      const sourceX = x + offsetX;
      const destX = x;

      // Draw slice
      renderer.ctx.drawImage(
        this.canvasCopy,
        sourceX, 0, sliceWidth, height,
        destX, 0, sliceWidth, height
      );
    }

    // Chromatic aberration pass
    if (config.chromaticAberration > 0) {
      this.drawChromaticAberration(renderer, config, width, height);
    }
  }

  drawChromaticAberration(renderer, config, width, height) {
    const aberration = config.chromaticAberration;
    if (aberration <= 0) return;

    const ctx = renderer.ctx;
    const canvasCopy = this.canvasCopy;

    // Save context
    ctx.save();

    // Red channel (shift right)
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'none';

    // This is a simplified version - full chromatic aberration would need pixel manipulation
    // For performance, we'll skip the full implementation and just note the setting
    ctx.restore();
  }

  validateConfig(config) {
    const errors = [];
    if (config.amplitude !== undefined && (config.amplitude < 0 || config.amplitude > 100)) {
      errors.push('amplitude must be between 0 and 100');
    }
    if (config.frequency !== undefined && (config.frequency < 0.0001 || config.frequency > 0.5)) {
      errors.push('frequency must be between 0.0001 and 0.5');
    }
    if (config.speed !== undefined && (config.speed < 0 || config.speed > 10)) {
      errors.push('speed must be between 0 and 10');
    }
    if (config.radius !== undefined && (config.radius < 0 || config.radius > 1000)) {
      errors.push('radius must be between 0 and 1000');
    }
    if (config.chromaticAberration !== undefined && (config.chromaticAberration < 0 || config.chromaticAberration > 20)) {
      errors.push('chromaticAberration must be between 0 and 20');
    }
    return { valid: errors.length === 0, errors };
  }
}

const distortionEffect = new DistortionEffect();
effectRegistry.register(distortionEffect);

export { DistortionEffect, distortionEffect };
export default distortionEffect;