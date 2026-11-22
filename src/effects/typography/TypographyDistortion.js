/**
 * Typography Distortion effect - text that reacts to pointer
 */

import { EffectBase } from '../base/EffectBase.js';
import { random, clamp, lerp, distanceSq, angle, vec2 } from '../../utils/math.js';
import { colorToCss, getPalette } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

const TEXT_MODES = ['scatter', 'magnetic', 'wave', 'displacement', 'rearrange', 'explode'];

class TypographyDistortionEffect extends EffectBase {
  constructor() {
    super({
      id: 'typography',
      name: 'Typography',
      category: 'typography',
      description: 'Text that reacts to pointer proximity with various distortion modes',
      defaultConfig: {
        text: 'CURSOR',
        fontSize: 120,
        fontWeight: 700,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        mode: 'magnetic',
        scatterRadius: 100,
        waveAmplitude: 30,
        waveFrequency: 0.02,
        waveSpeed: 1,
        magneticStrength: 1,
        displacementStrength: 50,
        reassemblySpeed: 0.02,
        colorMode: 'palette',
        palette: 'neon',
        color: '#00ffc8',
        letterSpacing: 0,
        lineHeight: 1.2,
        rotationRange: 30,
        scaleRange: 0.5,
      },
    });

    this.controls = [
      { key: 'text', type: 'text', label: 'Text', placeholder: 'Enter text (max 20 chars)', description: 'Text to display (sanitized)' },
      { key: 'fontSize', type: 'slider', label: 'Font Size', min: 20, max: 300, step: 4, description: 'Base font size in pixels' },
      { key: 'fontWeight', type: 'select', label: 'Font Weight', options: [
        { value: '300', label: 'Light' },
        { value: '400', label: 'Regular' },
        { value: '500', label: 'Medium' },
        { value: '600', label: 'Semi Bold' },
        { value: '700', label: 'Bold' },
        { value: '800', label: 'Extra Bold' },
      ], description: 'Font weight' },
      { key: 'mode', type: 'select', label: 'Mode', options: TEXT_MODES.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) })), description: 'Distortion behavior mode' },
      { key: 'scatterRadius', type: 'slider', label: 'Scatter Radius', min: 10, max: 300, step: 5, description: 'Maximum scatter distance' },
      { key: 'waveAmplitude', type: 'slider', label: 'Wave Amplitude', min: 0, max: 100, step: 2, description: 'Wave height' },
      { key: 'waveFrequency', type: 'slider', label: 'Wave Frequency', min: 0.001, max: 0.1, step: 0.001, description: 'Wave density' },
      { key: 'waveSpeed', type: 'slider', label: 'Wave Speed', min: 0, max: 5, step: 0.1, description: 'Wave animation speed' },
      { key: 'magneticStrength', type: 'slider', label: 'Magnetic Strength', min: 0, max: 3, step: 0.1, description: 'Pointer attraction force' },
      { key: 'displacementStrength', type: 'slider', label: 'Displacement', min: 0, max: 200, step: 5, description: 'Pointer displacement force' },
      { key: 'reassemblySpeed', type: 'slider', label: 'Reassembly Speed', min: 0, max: 0.1, step: 0.001, description: 'Return to original position speed' },
      { key: 'colorMode', type: 'select', label: 'Color Mode', options: [
        { value: 'palette', label: 'Palette' },
        { value: 'single', label: 'Single Color' },
        { value: 'gradient', label: 'Gradient' },
        { value: 'rainbow', label: 'Rainbow' },
      ], description: 'Letter coloring mode' },
      { key: 'color', type: 'color', label: 'Color', description: 'Base color' },
      { key: 'palette', type: 'select', label: 'Palette', options: [
        { value: 'neon', label: 'Neon' },
        { value: 'fire', label: 'Fire' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'forest', label: 'Forest' },
        { value: 'sunset', label: 'Sunset' },
      ], description: 'Color palette' },
      { key: 'letterSpacing', type: 'slider', label: 'Letter Spacing', min: -10, max: 50, step: 1, description: 'Extra spacing between letters' },
      { key: 'rotationRange', type: 'slider', label: 'Rotation Range', min: 0, max: 180, step: 5, description: 'Max random rotation in degrees' },
      { key: 'scaleRange', type: 'slider', label: 'Scale Range', min: 0, max: 1, step: 0.05, description: 'Max random scale variation' },
    ];

    this.letters = [];
    this.originalPositions = [];
    this.time = 0;
    this.measuredWidth = 0;
  }

  initialize(context, config) {
    super.initialize(context, config);
    this.parseText(config.text);
    this.measureText(context);
  }

  onConfigChange(context, config) {
    if (config.text) {
      this.parseText(config.text);
      this.measureText(context);
    }
  }

  onResize(context, config) {
    this.measureText(context);
  }

  parseText(text) {
    // Sanitize: only allow alphanumeric, spaces, and basic punctuation
    const sanitized = text.replace(/[^a-zA-Z0-9\s!?.,'-]/g, '').slice(0, 30);
    this.letters = sanitized.split('').map((char, index) => ({
      char,
      index,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      offsetX: 0,
      offsetY: 0,
      velocityX: 0,
      velocityY: 0,
      rotation: 0,
      targetRotation: 0,
      scale: 1,
      targetScale: 1,
      color: { r: 255, g: 255, b: 255 },
      baseColor: { r: 255, g: 255, b: 255 },
    }));
    this.originalPositions = this.letters.map(l => ({ x: l.targetX, y: l.targetY }));
  }

  measureText(context) {
    const renderer = context.renderer;
    if (!renderer) return;

    const config = this.config;
    const testFont = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
    renderer.ctx.font = testFont;

    let x = 0;
    const spacing = config.letterSpacing;
    this.letters.forEach((letter, i) => {
      const metrics = renderer.ctx.measureText(letter.char);
      letter.width = metrics.width;
      letter.targetX = x + metrics.width * 0.5;
      letter.targetY = 0;
      letter.x = letter.targetX;
      letter.y = letter.targetY;
      x += metrics.width + spacing;
    });
    this.measuredWidth = x - spacing;

    // Center the text
    const offsetX = -this.measuredWidth * 0.5;
    this.letters.forEach(letter => {
      letter.targetX += offsetX;
      letter.x += offsetX;
    });
  }

  updateLetterColors(config) {
    const palette = getPalette(config.palette);
    this.letters.forEach((letter, i) => {
      let color;
      switch (config.colorMode) {
        case 'single':
          color = config.color ? { r: 255, g: 255, b: 255 } : palette[0];
          break;
        case 'gradient':
          const t = i / Math.max(1, this.letters.length - 1);
          color = this.lerpPalette(palette, t);
          break;
        case 'rainbow':
          const hue = (i / this.letters.length) * 360;
          color = this.hslToRgb(hue, 100, 50);
          break;
        case 'palette':
        default:
          color = palette[i % palette.length];
          break;
      }
      letter.baseColor = { ...color };
      letter.color = { ...color };
    });
  }

  lerpPalette(palette, t) {
    if (palette.length <= 1) return palette[0] || { r: 255, g: 255, b: 255 };
    const idx = t * (palette.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = palette[i];
    const c2 = palette[Math.min(i + 1, palette.length - 1)];
    return {
      r: lerp(c1.r, c2.r, f),
      g: lerp(c1.g, c2.g, f),
      b: lerp(c1.b, c2.b, f),
    };
  }

  hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  update(deltaTime, context, config) {
    this.time += deltaTime * 0.001;
    const pointer = context.pointer;
    const canvas = context.canvas;
    const speed = context.globalConfig.speed || 1;

    // Update colors if needed
    this.updateLetterColors(config);

    const centerX = canvas.clientWidth * 0.5;
    const centerY = canvas.clientHeight * 0.5;

    this.letters.forEach(letter => {
      // Reset to target position with reassembly
      const reassembly = config.reassemblySpeed * speed;
      letter.offsetX = lerp(letter.offsetX, 0, reassembly * deltaTime * 0.001);
      letter.offsetY = lerp(letter.offsetY, 0, reassembly * deltaTime * 0.001);
      letter.rotation = lerp(letter.rotation, letter.targetRotation, reassembly * deltaTime * 0.001);
      letter.scale = lerp(letter.scale, letter.targetScale, reassembly * deltaTime * 0.001);

      // Apply mode-specific behavior
      if (pointer.isInside) {
        const dx = pointer.position.x - (centerX + letter.targetX);
        const dy = pointer.position.y - (centerY + letter.targetY);
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        switch (config.mode) {
          case 'scatter':
            if (dist < config.scatterRadius && dist > 0) {
              const force = (1 - dist / config.scatterRadius) * config.scatterRadius * 0.5;
              letter.offsetX -= (dx / dist) * force;
              letter.offsetY -= (dy / dist) * force;
              letter.targetRotation = (Math.random() - 0.5) * config.rotationRange * (Math.PI / 180);
              letter.targetScale = 0.5 + Math.random() * config.scaleRange;
            }
            break;

          case 'magnetic':
            if (dist < config.scatterRadius * 2 && dist > 0) {
              const force = config.magneticStrength * (1 - dist / (config.scatterRadius * 2)) * 50;
              letter.offsetX += (dx / dist) * force;
              letter.offsetY += (dy / dist) * force;
            }
            break;

          case 'wave':
            const wavePhase = this.time * config.waveSpeed + letter.index * config.waveFrequency * 100;
            letter.offsetY += Math.sin(wavePhase) * config.waveAmplitude;
            letter.offsetX += Math.cos(wavePhase * 0.5) * config.waveAmplitude * 0.3;
            letter.targetRotation = Math.sin(wavePhase) * 0.2;
            break;

          case 'displacement':
            if (dist < config.displacementStrength && dist > 0) {
              const force = config.displacementStrength * (1 - dist / config.displacementStrength);
              letter.offsetX += (dx / dist) * force;
              letter.offsetY += (dy / dist) * force;
              letter.targetScale = 1 + force * 0.01;
            }
            break;

          case 'rearrange':
            if (dist < config.scatterRadius && dist > 0) {
              const force = (1 - dist / config.scatterRadius) * 100;
              letter.velocityX += (dx / dist) * force * deltaTime * 0.001;
              letter.velocityY += (dy / dist) * force * deltaTime * 0.001;
            }
            letter.offsetX += letter.velocityX;
            letter.offsetY += letter.velocityY;
            letter.velocityX *= 0.95;
            letter.velocityY *= 0.95;
            break;

          case 'explode':
            if (pointer.isButtonDown('left') && dist < config.scatterRadius && dist > 0) {
              const force = 200 * (1 - dist / config.scatterRadius);
              letter.velocityX += (dx / dist) * force * deltaTime * 0.001;
              letter.velocityY += (dy / dist) * force * deltaTime * 0.001;
              letter.targetRotation = (Math.random() - 0.5) * Math.PI;
              letter.targetScale = 0.2 + Math.random() * 0.8;
            }
            letter.offsetX += letter.velocityX;
            letter.offsetY += letter.velocityY;
            letter.velocityX *= 0.98;
            letter.velocityY *= 0.98;
            break;
        }
      }

      // Update final position
      letter.x = letter.targetX + letter.offsetX;
      letter.y = letter.targetY + letter.offsetY;

      // Color interpolation
      letter.color.r = lerp(letter.color.r, letter.baseColor.r, 0.1);
      letter.color.g = lerp(letter.color.g, letter.baseColor.g, 0.1);
      letter.color.b = lerp(letter.color.b, letter.baseColor.b, 0.1);
    });
  }

  render(context, config) {
    const renderer = context.renderer;
    if (!renderer || this.letters.length === 0) return;

    const canvas = context.canvas;
    const centerX = canvas.clientWidth * 0.5;
    const centerY = canvas.clientHeight * 0.5;

    const font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
    renderer.ctx.font = font;
    renderer.ctx.textAlign = 'center';
    renderer.ctx.textBaseline = 'middle';

    this.letters.forEach(letter => {
      const x = centerX + letter.x;
      const y = centerY + letter.y;

      renderer.ctx.save();
      renderer.ctx.translate(x, y);
      if (letter.rotation !== 0) renderer.ctx.rotate(letter.rotation);
      if (letter.scale !== 1) renderer.ctx.scale(letter.scale, letter.scale);

      const color = colorToCss(letter.color, 1);
      renderer.ctx.fillStyle = color;
      renderer.ctx.fillText(letter.char, 0, 0);

      renderer.ctx.restore();
    });
  }

  validateConfig(config) {
    const errors = [];
    if (config.text !== undefined && config.text.length > 30) {
      errors.push('text must be 30 characters or less');
    }
    if (config.fontSize !== undefined && (config.fontSize < 10 || config.fontSize > 500)) {
      errors.push('fontSize must be between 10 and 500');
    }
    if (config.mode && !TEXT_MODES.includes(config.mode)) {
      errors.push(`mode must be one of: ${TEXT_MODES.join(', ')}`);
    }
    if (config.scatterRadius !== undefined && (config.scatterRadius < 10 || config.scatterRadius > 500)) {
      errors.push('scatterRadius must be between 10 and 500');
    }
    if (config.waveAmplitude !== undefined && (config.waveAmplitude < 0 || config.waveAmplitude > 200)) {
      errors.push('waveAmplitude must be between 0 and 200');
    }
    if (config.waveFrequency !== undefined && (config.waveFrequency < 0.0001 || config.waveFrequency > 0.5)) {
      errors.push('waveFrequency must be between 0.0001 and 0.5');
    }
    if (config.reassemblySpeed !== undefined && (config.reassemblySpeed < 0 || config.reassemblySpeed > 0.5)) {
      errors.push('reassemblySpeed must be between 0 and 0.5');
    }
    return { valid: errors.length === 0, errors };
  }
}

const typographyEffect = new TypographyDistortionEffect();
effectRegistry.register(typographyEffect);

export { TypographyDistortionEffect, typographyEffect };
export default typographyEffect;