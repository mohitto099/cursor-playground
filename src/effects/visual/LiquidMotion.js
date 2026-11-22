/**
 * Liquid Motion effect - simplified fluid simulation for ink-like trails
 * Uses a simplified 2D Navier-Stokes solver (Jos Stam's stable fluids)
 */

import { EffectBase } from '../base/EffectBase.js';
import { clamp, lerp } from '../../utils/math.js';
import { colorToCss, getPalette } from '../../utils/colour.js';
import { effectRegistry } from '../registry.js';

class LiquidMotionEffect extends EffectBase {
  constructor() {
    super({
      id: 'liquidMotion',
      name: 'Liquid Motion',
      category: 'visual',
      description: 'Fluid simulation with cursor-driven ink flow',
      defaultConfig: {
        resolution: 128,
        viscosity: 0.5,
        dyeDecay: 0.99,
        velocityDissipation: 0.98,
        pressureDissipation: 0.8,
        curl: 30,
        splatRadius: 0.2,
        colorMode: 'palette',
        palette: 'neon',
        showVelocity: false,
      },
    });

    this.controls = [
      { key: 'resolution', type: 'slider', label: 'Resolution', min: 32, max: 256, step: 16, description: 'Simulation grid resolution (higher = more detail, slower)' },
      { key: 'viscosity', type: 'slider', label: 'Viscosity', min: 0, max: 1, step: 0.01, description: 'Fluid thickness' },
      { key: 'dyeDecay', type: 'slider', label: 'Dye Decay', min: 0.9, max: 1, step: 0.001, description: 'Color fade rate' },
      { key: 'velocityDissipation', type: 'slider', label: 'Velocity Dissipation', min: 0.9, max: 1, step: 0.001, description: 'Velocity fade rate' },
      { key: 'pressureDissipation', type: 'slider', label: 'Pressure Dissipation', min: 0.5, max: 1, step: 0.01, description: 'Pressure solve iterations' },
      { key: 'curl', type: 'slider', label: 'Curl', min: 0, max: 100, step: 1, description: 'Vorticity confinement' },
      { key: 'splatRadius', type: 'slider', label: 'Splat Radius', min: 0.05, max: 0.5, step: 0.01, description: 'Cursor influence size' },
      { key: 'colorMode', type: 'select', label: 'Color Mode', options: [
        { value: 'palette', label: 'Palette' },
        { value: 'single', label: 'Single' },
        { value: 'rainbow', label: 'Rainbow' },
      ], description: 'Dye color mode' },
      { key: 'palette', type: 'select', label: 'Palette', options: [
        { value: 'neon', label: 'Neon' },
        { value: 'fire', label: 'Fire' },
        { value: 'ocean', label: 'Ocean' },
        { value: 'forest', label: 'Forest' },
        { value: 'sunset', label: 'Sunset' },
      ], description: 'Color palette' },
      { key: 'showVelocity', type: 'toggle', label: 'Show Velocity', description: 'Visualize velocity field' },
    ];

    // Fluid simulation arrays
    this.N = 128;
    this.dx = 0;
    this.dy = 0;

    // Velocity fields
    this.u = null; // x velocity
    this.v = null; // y velocity
    this.uPrev = null;
    this.vPrev = null;

    // Dye/density fields
    this.dye = null; // { r, g, b } arrays
    this.dyePrev = null;

    // Pressure
    this.p = null;
    this.div = null;

    // Obstacles/boundaries
    this.obstacles = null;

    this.initialized = false;
    this.lastSplatTime = 0;
    this.splatInterval = 16; // ms between splats while dragging
  }

  initialize(context, config) {
    super.initialize(context, config);
    this.resizeGrid(config.resolution);
    this.initialized = true;
  }

  onResize(context, config) {
    this.resizeGrid(config.resolution);
  }

  resizeGrid(resolution) {
    this.N = Math.max(32, Math.min(256, resolution | 0));
    const size = (this.N + 2) * (this.N + 2);

    this.u = new Float32Array(size);
    this.v = new Float32Array(size);
    this.uPrev = new Float32Array(size);
    this.vPrev = new Float32Array(size);

    this.dye = {
      r: new Float32Array(size),
      g: new Float32Array(size),
      b: new Float32Array(size),
    };
    this.dyePrev = {
      r: new Float32Array(size),
      g: new Float32Array(size),
      b: new Float32Array(size),
    };

    this.p = new Float32Array(size);
    this.div = new Float32Array(size);
    this.obstacles = new Uint8Array(size);

    this.dx = 1 / this.N;
    this.dy = 1 / this.N;
  }

  IX(i, j) {
    return i + j * (this.N + 2);
  }

  addSplat(x, y, dx, dy, color, config) {
    const N = this.N;
    const i = Math.floor(x * N);
    const j = Math.floor(y * N);
    const radius = Math.floor(config.splatRadius * N);
    const intensity = 10;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const ii = i + dx;
        const jj = j + dy;
        if (ii >= 1 && ii <= N && jj >= 1 && jj <= N) {
          const distSq = dx * dx + dy * dy;
          if (distSq <= radius * radius) {
            const factor = 1 - distSq / (radius * radius);
            const idx = this.IX(ii, jj);
            this.u[idx] += dx * config.curl * factor * 0.1;
            this.v[idx] += dy * config.curl * factor * 0.1;
            this.dye.r[idx] = Math.min(1, this.dye.r[idx] + color.r * factor * 0.5);
            this.dye.g[idx] = Math.min(1, this.dye.g[idx] + color.g * factor * 0.5);
            this.dye.b[idx] = Math.min(1, this.dye.b[idx] + color.b * factor * 0.5);
          }
        }
      }
    }
  }

  onPointerDown(pointer, context, config) {
    if (pointer.button === 'left' && pointer.isInside) {
      const canvas = context.canvas;
      const x = pointer.position.x / canvas.clientWidth;
      const y = pointer.position.y / canvas.clientHeight;
      const palette = getPalette(config.palette);
      const color = palette[Math.floor(Math.random() * palette.length)];
      this.addSplat(x, y, 0, 0, { r: color.r / 255, g: color.g / 255, b: color.b / 255 }, config);
    }
  }

  update(deltaTime, context, config) {
    if (!this.initialized) return;

    const pointer = context.pointer;
    const N = this.N;
    const dt = deltaTime * 0.001;

    // Handle continuous splat while dragging
    if (pointer.isButtonPressed('left') && pointer.isInside) {
      const now = context.time;
      if (now - this.lastSplatTime > this.splatInterval) {
        const canvas = context.canvas;
        const x = pointer.position.x / canvas.clientWidth;
        const y = pointer.position.y / canvas.clientHeight;
        const dx = pointer.velocity.x * 0.01;
        const dy = pointer.velocity.y * 0.01;
        const palette = getPalette(config.palette);
        const color = palette[Math.floor(Math.random() * palette.length)];
        this.addSplat(x, y, dx, dy, { r: color.r / 255, g: color.g / 255, b: color.b / 255 }, config);
        this.lastSplatTime = now;
      }
    }

    // Fluid simulation step (simplified Jos Stam stable fluids)
    this.stepFluid(dt, config);
  }

  stepFluid(dt, config) {
    const N = this.N;
    const visc = config.viscosity * 0.0001;
    const diff = config.velocityDissipation;

    // Diffuse velocity
    this.diffuse(1, this.uPrev, this.u, visc, dt, 4);
    this.diffuse(2, this.vPrev, this.v, visc, dt, 4);

    // Project to make incompressible
    this.project(this.uPrev, this.vPrev, this.p, this.div);

    // Advect velocity
    this.advect(1, this.u, this.uPrev, this.uPrev, this.vPrev, dt);
    this.advect(2, this.v, this.vPrev, this.uPrev, this.vPrev, dt);

    // Project again
    this.project(this.u, this.v, this.p, this.div);

    // Diffuse dye
    this.diffuse(0, this.dyePrev.r, this.dye.r, 0, dt, 4);
    this.diffuse(0, this.dyePrev.g, this.dye.g, 0, dt, 4);
    this.diffuse(0, this.dyePrev.b, this.dye.b, 0, dt, 4);

    // Advect dye
    this.advect(0, this.dye.r, this.dyePrev.r, this.u, this.v, dt);
    this.advect(0, this.dye.g, this.dyePrev.g, this.u, this.v, dt);
    this.advect(0, this.dye.b, this.dyePrev.b, this.u, this.v, dt);

    // Decay dye
    const decay = config.dyeDecay;
    const size = (N + 2) * (N + 2);
    for (let i = 0; i < size; i++) {
      this.dye.r[i] *= decay;
      this.dye.g[i] *= decay;
      this.dye.b[i] *= decay;
    }
  }

  diffuse(b, x, x0, diff, dt, iter) {
    const N = this.N;
    const a = dt * diff * N * N;
    for (let k = 0; k < iter; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = this.IX(i, j);
          x[idx] = (x0[idx] + a * (x[this.IX(i-1,j)] + x[this.IX(i+1,j)] + x[this.IX(i,j-1)] + x[this.IX(i,j+1)])) / (1 + 4 * a);
        }
      }
      this.setBoundary(b, x);
    }
  }

  project(velX, velY, p, div) {
    const N = this.N;
    const h = 1 / N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = this.IX(i, j);
        div[idx] = -0.5 * h * (velX[this.IX(i+1,j)] - velX[this.IX(i-1,j)] + velY[this.IX(i,j+1)] - velY[this.IX(i,j-1)]);
        p[idx] = 0;
      }
    }
    this.setBoundary(0, div);
    this.setBoundary(0, p);

    for (let k = 0; k < 20; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = this.IX(i, j);
          p[idx] = (div[idx] + p[this.IX(i-1,j)] + p[this.IX(i+1,j)] + p[this.IX(i,j-1)] + p[this.IX(i,j+1)]) / 4;
        }
      }
      this.setBoundary(0, p);
    }

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = this.IX(i, j);
        velX[idx] -= 0.5 * (p[this.IX(i+1,j)] - p[this.IX(i-1,j)]) / h;
        velY[idx] -= 0.5 * (p[this.IX(i,j+1)] - p[this.IX(i,j-1)]) / h;
      }
    }
    this.setBoundary(1, velX);
    this.setBoundary(2, velY);
  }

  advect(b, d, d0, velX, velY, dt) {
    const N = this.N;
    const dt0 = dt * N;

    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = this.IX(i, j);
        let x = i - dt0 * velX[idx];
        let y = j - dt0 * velY[idx];

        if (x < 0.5) x = 0.5;
        if (x > N + 0.5) x = N + 0.5;
        if (y < 0.5) y = 0.5;
        if (y > N + 0.5) y = N + 0.5;

        const i0 = Math.floor(x);
        const i1 = i0 + 1;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;

        d[idx] = s0 * (t0 * d0[this.IX(i0,j0)] + t1 * d0[this.IX(i0,j1)]) +
                 s1 * (t0 * d0[this.IX(i1,j0)] + t1 * d0[this.IX(i1,j1)]);
      }
    }
    this.setBoundary(b, d);
  }

  setBoundary(b, x) {
    const N = this.N;
    for (let i = 1; i <= N; i++) {
      x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
      x[this.IX(i, N+1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
    }
    for (let j = 1; j <= N; j++) {
      x[this.IX(0, j)] = b === 1 ? -x[this.IX(1, j)] : x[this.IX(1, j)];
      x[this.IX(N+1, j)] = b === 1 ? -x[this.IX(N, j)] : x[this.IX(N, j)];
    }
    x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
    x[this.IX(0, N+1)] = 0.5 * (x[this.IX(1, N+1)] + x[this.IX(0, N)]);
    x[this.IX(N+1, 0)] = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N+1, 1)]);
    x[this.IX(N+1, N+1)] = 0.5 * (x[this.IX(N, N+1)] + x[this.IX(N+1, N)]);
  }

  render(context, config) {
    if (!this.initialized) return;

    const renderer = context.renderer;
    if (!renderer) return;

    const canvas = context.canvas;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const N = this.N;
    const cellWidth = width / N;
    const cellHeight = height / N;

    // Render dye field as colored rectangles
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = this.IX(i, j);
        const r = this.dye.r[idx];
        const g = this.dye.g[idx];
        const b = this.dye.b[idx];

        if (r > 0.01 || g > 0.01 || b > 0.01) {
          const alpha = Math.max(r, g, b);
          const color = { r: r * 255, g: g * 255, b: b * 255 };

          renderer.ctx.globalAlpha = alpha;
          renderer.ctx.fillStyle = colorToCss(color, alpha);
          renderer.ctx.fillRect(
            (i - 1) * cellWidth,
            (j - 1) * cellHeight,
            cellWidth + 1,
            cellHeight + 1
          );
        }
      }
    }

    renderer.ctx.globalAlpha = 1;

    // Optional: render velocity field
    if (config.showVelocity) {
      renderer.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      renderer.ctx.lineWidth = 1;
      for (let j = 1; j <= N; j += 4) {
        for (let i = 1; i <= N; i += 4) {
          const idx = this.IX(i, j);
          const u = this.u[idx];
          const v = this.v[idx];
          if (Math.abs(u) > 0.01 || Math.abs(v) > 0.01) {
            const x = (i - 0.5) * cellWidth;
            const y = (j - 0.5) * cellHeight;
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(x, y);
            renderer.ctx.lineTo(x + u * 50, y + v * 50);
            renderer.ctx.stroke();
          }
        }
      }
    }
  }

  validateConfig(config) {
    const errors = [];
    if (config.resolution !== undefined && (config.resolution < 16 || config.resolution > 512)) {
      errors.push('resolution must be between 16 and 512');
    }
    if (config.viscosity !== undefined && (config.viscosity < 0 || config.viscosity > 1)) {
      errors.push('viscosity must be between 0 and 1');
    }
    if (config.dyeDecay !== undefined && (config.dyeDecay < 0.9 || config.dyeDecay > 1)) {
      errors.push('dyeDecay must be between 0.9 and 1');
    }
    return { valid: errors.length === 0, errors };
  }
}

const liquidMotionEffect = new LiquidMotionEffect();
effectRegistry.register(liquidMotionEffect);

export { LiquidMotionEffect, liquidMotionEffect };
export default liquidMotionEffect;