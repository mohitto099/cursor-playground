/**
 * Colour Effects - global color cycling, gradients, and palette shifts
 */

import { EffectBase } from '../base/EffectBase.js';
import { clamp, lerp } from '../../utils/math.js';
import { getPalette, lerpColors, hslToHex, rgbToHsl } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

const COLOR_MODES = ['cycle', 'palette', 'hue-shift', 'gradient', 'random', 'static'];

class ColourEffectsEffect extends EffectBase {
  constructor() {
    super({
      id: 'colorEffects',
      name: 'Color Effects',
      category: 'visual',
      description: 'Global color cycling, gradients, and palette manipulation',
      defaultConfig: {
        mode: 'cycle',
        speed: 0.5,
        palette: 'neon',
        hueShift: 0,
        saturation: 100,
        lightness: 50,
        gradientColors: ['#00ffc8', '#ff00aa', '#7c5cff'],
        gradientSpeed: 0.3,
        affectAll: true,
      },
    });

    this.controls = [
      { key: 'mode', type: 'select', label: 'Mode', options: COLOR_MODES.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1).replace('-', ' ') })), description: 'Color effect mode' },
      { key: 'speed', type: 'slider', label: 'Speed', min: 0, max: 3, step: 0.05, description: 'Animation speed' },
      { key: 'palette', type: 'select', label: 'Palette', options: [
        { value: 'neon', label: 'Neon' },
        { value: 'midnight', label: 'Midnight' },
        { value: 'fire', label: 'Fire' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'forest', label: 'Forest' },
        { value: 'sunset', label: 'Sunset' },
        { value: 'pastel', label: 'Pastel' },
        { value: 'mono', label: 'Monochrome' },
      ], description: 'Base color palette' },
      { key: 'hueShift', type: 'slider', label: 'Hue Shift', min: 0, max: 360, step: 1, description: 'Global hue offset' },
      { key: 'saturation', type: 'slider', label: 'Saturation', min: 0, max: 100, step: 1, description: 'Color saturation %' },
      { key: 'lightness', type: 'slider', label: 'Lightness', min: 0, max: 100, step: 1, description: 'Color lightness %' },
      { key: 'affectAll', type: 'toggle', label: 'Affect All Effects', description: 'Apply to all particle effects' },
    ];

    this.cyclePhase = 0;
    this.paletteColors = [];
  }

  initialize(context, config) {
    super.initialize(context, config);
    this.updatePaletteColors(config);
  }

  onGlobalConfigChange(context, globalConfig) {
    // React to palette changes
  }

  onConfigChange(context, config) {
    this.updatePaletteColors(config);
  }

  updatePaletteColors(config) {
    this.paletteColors = getPalette(config.palette);
  }

  update(deltaTime, context, config) {
    const speed = config.speed * (context.globalConfig.speed || 1);
    this.cyclePhase += deltaTime * speed * 0.001;

    // Update global color config that other effects can read
    context.globalConfig.colorCycle = {
      phase: this.cyclePhase,
      palette: this.paletteColors,
      mode: config.mode,
      hueShift: config.hueShift,
      saturation: config.saturation,
      lightness: config.lightness,
    };
  }

  // Static method to get color for a particle based on global color cycle
  static getColor(particle, globalConfig, config) {
    if (!globalConfig.colorCycle || !config.affectAll) return null;

    const cycle = globalConfig.colorCycle;
    const palette = cycle.palette;
    if (!palette || palette.length === 0) return null;

    let color;

    switch (cycle.mode) {
      case 'cycle':
        const cycleIndex = (cycle.phase * 10 + particle.age * 0.01) % palette.length;
        color = palette[Math.floor(cycleIndex) % palette.length];
        break;
      case 'palette':
        color = palette[particle.effectId.hashCode() % palette.length];
        break;
      case 'hue-shift':
        const baseColor = particle.color;
        const { h, s, l } = rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
        color = hslToHex((h + cycle.hueShift) % 360, cycle.saturation, cycle.lightness);
        break;
      case 'gradient':
        const gradientT = (cycle.phase * config.gradientSpeed + particle.age * 0.001) % 1;
        color = lerpColors(config.gradientColors || palette, gradientT);
        break;
      case 'random':
        color = palette[Math.floor(Math.random() * palette.length)];
        break;
      case 'static':
      default:
        return null; // Use particle's original color
    }

    return typeof color === 'string' ? { r: 0, g: 0, b: 0 } : color; // Will be parsed by renderer
  }

  render(context, config) {
    // This effect doesn't render directly, it modifies global color state
    // The actual color application happens in other effects' render methods
  }

  validateConfig(config) {
    const errors = [];
    if (config.speed !== undefined && (config.speed < 0 || config.speed > 10)) {
      errors.push('speed must be between 0 and 10');
    }
    if (config.hueShift !== undefined && (config.hueShift < 0 || config.hueShift > 360)) {
      errors.push('hueShift must be between 0 and 360');
    }
    if (config.saturation !== undefined && (config.saturation < 0 || config.saturation > 100)) {
      errors.push('saturation must be between 0 and 100');
    }
    if (config.lightness !== undefined && (config.lightness < 0 || config.lightness > 100)) {
      errors.push('lightness must be between 0 and 100');
    }
    return { valid: errors.length === 0, errors };
  }
}

// Add hashCode helper to strings if needed
if (!String.prototype.hashCode) {
  String.prototype.hashCode = function() {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };
}

const colorEffectsEffect = new ColourEffectsEffect();
effectRegistry.register(colorEffectsEffect);

export { ColourEffectsEffect, colorEffectsEffect };
export default colorEffectsEffect;