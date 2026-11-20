/**
 * Colour utilities for the playground
 */

import { random, clamp, lerp } from './math.js';

export const parseHex = (hex) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

export const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

export const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToRgb = (h, s, l) => {
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
};

export const hexToHsl = (hex) => {
  const { r, g, b } = parseHex(hex);
  return rgbToHsl(r, g, b);
};

export const hslToHex = (h, s, l) => {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

export const lerpColor = (colorA, colorB, t) => {
  const a = typeof colorA === 'string' ? parseHex(colorA) : colorA;
  const b = typeof colorB === 'string' ? parseHex(colorB) : colorB;
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
};

export const lerpColors = (colors, t) => {
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  if (colors.length === 1) return typeof colors[0] === 'string' ? parseHex(colors[0]) : colors[0];
  if (t <= 0) return typeof colors[0] === 'string' ? parseHex(colors[0]) : colors[0];
  if (t >= 1) return typeof colors[colors.length - 1] === 'string' ? parseHex(colors[colors.length - 1]) : colors[colors.length - 1];

  const segment = 1 / (colors.length - 1);
  const index = Math.floor(t / segment);
  const localT = (t - index * segment) / segment;
  return lerpColor(colors[index], colors[index + 1], localT);
};

export const colorToCss = (color, alpha = 1) => {
  const c = typeof color === 'string' ? parseHex(color) : color;
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${clamp(alpha, 0, 1)})`;
};

export const colorToHex = (color) => {
  const c = typeof color === 'string' ? parseHex(color) : color;
  return rgbToHex(c.r, c.g, c.b);
};

export const randomColor = (palette) => {
  if (palette && palette.length) return randomChoice(palette);
  return hslToHex(random(0, 360), random(50, 90), random(40, 70));
};

export const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const shadeColor = (color, amount) => {
  const c = typeof color === 'string' ? parseHex(color) : color;
  return {
    r: clamp(c.r + amount, 0, 255),
    g: clamp(c.g + amount, 0, 255),
    b: clamp(c.b + amount, 0, 255),
  };
};

export const tintColor = (color, amount) => shadeColor(color, amount * 255);

// Built-in palettes
export const PALETTES = {
  neon: ['#00ffc8', '#ff00aa', '#7c5cff', '#ffb84d', '#ff4d6a', '#00ffff'],
  midnight: ['#00d4aa', '#0099cc', '#4d4dff', '#8844ff', '#cc3399'],
  fire: ['#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#ffff33'],
  ocean: ['#0077ff', '#00aaff', '#00ddff', '#00ffcc', '#00ff88'],
  forest: ['#00aa44', '#00cc55', '#44dd00', '#88ff00', '#ccff33'],
  sunset: ['#ff3366', '#ff6644', '#ff9933', '#ffcc00', '#ffff33'],
  pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#d5baff'],
  mono: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333'],
};

export const getPalette = (name) => PALETTES[name] || PALETTES.neon;

export const cycleHue = (color, shift) => {
  const { h, s, l } = typeof color === 'string' ? hexToHsl(color) : rgbToHsl(color.r, color.g, color.b);
  return hslToHex((h + shift) % 360, s, l);
};

export const createGradient = (ctx, x0, y0, x1, y1, colors, alpha = 1) => {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  colors.forEach((color, i) => {
    const stop = i / (colors.length - 1);
    gradient.addColorStop(stop, colorToCss(color, alpha));
  });
  return gradient;
};

export const createRadialGradient = (ctx, x0, y0, r0, x1, y1, r1, colors, alpha = 1) => {
  const gradient = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  colors.forEach((color, i) => {
    const stop = i / (colors.length - 1);
    gradient.addColorStop(stop, colorToCss(color, alpha));
  });
  return gradient;
};