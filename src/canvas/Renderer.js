/**
 * Canvas 2D renderer
 */

import { colorToCss } from '../utils/colour.js';
import { clamp } from '../utils/math.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.clearColor = '#06060a';
    this.backgroundPattern = null;
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width / dpr}px`;
    this.canvas.style.height = `${height / dpr}px`;

    this.ctx.scale(dpr, dpr);
  }

  clear() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = this.clearColor;
    this.ctx.fillRect(0, 0, this.width / this.dpr, this.height / this.dpr);
  }

  beginFrame() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  endFrame() {}

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }

  translate(x, y) {
    this.ctx.translate(x, y);
  }

  rotate(angle) {
    this.ctx.rotate(angle);
  }

  scale(x, y) {
    this.ctx.scale(x, y);
  }

  setGlobalAlpha(alpha) {
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
  }

  setGlobalCompositeOperation(op) {
    this.ctx.globalCompositeOperation = op;
  }

  drawParticle(particle, config = {}) {
    const { x, y, size, alpha, color } = particle;
    const finalAlpha = clamp(alpha * (config.globalAlpha || 1), 0, 1);
    if (finalAlpha <= 0 || size <= 0) return;

    this.ctx.beginPath();
    this.ctx.globalAlpha = finalAlpha;

    const particleColor = color ? colorToCss(color, finalAlpha) : `rgba(255,255,255,${finalAlpha})`;
    this.ctx.fillStyle = particleColor;

    const shape = config.shape || 'circle';
    const s = size * 0.5;

    switch (shape) {
      case 'circle':
        this.ctx.arc(x, y, s, 0, Math.PI * 2);
        break;
      case 'square':
        this.ctx.rect(x - s, y - s, size, size);
        break;
      case 'triangle':
        this.ctx.moveTo(x, y - s);
        this.ctx.lineTo(x + s, y + s);
        this.ctx.lineTo(x - s, y + s);
        this.ctx.closePath();
        break;
      case 'star':
        this.drawStar(x, y, s, s * 0.4, 5);
        break;
    }

    this.ctx.fill();
  }

  drawStar(cx, cy, outerRadius, innerRadius, points) {
    const step = Math.PI / points;
    this.ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < points; i++) {
      const angle = i * 2 * step - Math.PI / 2;
      const ox = cx + Math.cos(angle) * outerRadius;
      const oy = cy + Math.sin(angle) * outerRadius;
      this.ctx.lineTo(ox, oy);
      const ix = cx + Math.cos(angle + step) * innerRadius;
      const iy = cy + Math.sin(angle + step) * innerRadius;
      this.ctx.lineTo(ix, iy);
    }
    this.ctx.closePath();
  }

  drawCircle(x, y, radius, color, alpha = 1, fill = true) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    if (fill) {
      this.ctx.fillStyle = colorToCss(color, alpha);
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = colorToCss(color, alpha);
      this.ctx.stroke();
    }
  }

  drawRect(x, y, width, height, color, alpha = 1, fill = true) {
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    if (fill) {
      this.ctx.fillStyle = colorToCss(color, alpha);
      this.ctx.fillRect(x, y, width, height);
    } else {
      this.ctx.strokeStyle = colorToCss(color, alpha);
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  drawLine(x1, y1, x2, y2, color, alpha = 1, width = 1, cap = 'round') {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    this.ctx.strokeStyle = colorToCss(color, alpha);
    this.ctx.lineWidth = width;
    this.ctx.lineCap = cap;
    this.ctx.stroke();
  }

  drawPolyline(points, color, alpha = 1, width = 1, smooth = false) {
    if (points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    if (smooth && points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) * 0.5;
        const yc = (points[i].y + points[i + 1].y) * 0.5;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      this.ctx.quadraticCurveTo(
        points[points.length - 1].x,
        points[points.length - 1].y,
        points[points.length - 1].x,
        points[points.length - 1].y
      );
    } else {
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
    }

    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    this.ctx.strokeStyle = colorToCss(color, alpha);
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  drawGlow(x, y, radius, color, alpha = 1) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colorToCss(color, alpha));
    gradient.addColorStop(1, colorToCss(color, 0));
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  drawText(text, x, y, options = {}) {
    const {
      font = '14px system-ui',
      color = '#ffffff',
      alpha = 1,
      align = 'left',
      baseline = 'alphabetic',
      maxWidth,
    } = options;

    this.ctx.font = font;
    this.ctx.fillStyle = colorToCss(color, alpha);
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.globalAlpha = clamp(alpha, 0, 1);

    if (maxWidth) {
      this.ctx.fillText(text, x, y, maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  measureText(text, font = '14px system-ui') {
    this.ctx.font = font;
    return this.ctx.measureText(text);
  }

  setShadow(color, blur, offsetX = 0, offsetY = 0) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = blur;
    this.ctx.shadowOffsetX = offsetX;
    this.ctx.shadowOffsetY = offsetY;
  }

  clearShadow() {
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  clipRect(x, y, width, height) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
  }

  resetClip() {
    this.ctx.restore();
    this.ctx.save();
  }

  drawImage(image, x, y, width, height, alpha = 1) {
    this.ctx.globalAlpha = clamp(alpha, 0, 1);
    this.ctx.drawImage(image, x, y, width, height);
  }
}

export const createRenderer = (canvas) => new Renderer(canvas);