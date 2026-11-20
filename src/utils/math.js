/**
 * Math utilities for the playground
 */

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const lerp = (a, b, t) => a + (b - a) * t;

export const lerpClamped = (a, b, t) => lerp(a, b, clamp(t, 0, 1));

export const mapRange = (value, inMin, inMax, outMin, outMax) =>
  outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);

export const random = (min, max) => {
  if (max === undefined) { max = min; min = 0; }
  return Math.random() * (max - min) + min;
};

export const randomInt = (min, max) => Math.floor(random(min, max + 1));

export const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];

export const randomGaussian = (mean = 0, stdDev = 1) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const degToRad = (deg) => deg * (Math.PI / 180);
export const radToDeg = (rad) => rad * (180 / Math.PI);

export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distanceSq = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

export const angle = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

export const normalize = (x, y) => {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
};

export const vec2 = {
  create: (x = 0, y = 0) => ({ x, y }),
  copy: (out, a) => { out.x = a.x; out.y = a.y; return out; },
  set: (out, x, y) => { out.x = x; out.y = y; return out; },
  add: (out, a, b) => { out.x = a.x + b.x; out.y = a.y + b.y; return out; },
  sub: (out, a, b) => { out.x = a.x - b.x; out.y = a.y - b.y; return out; },
  scale: (out, a, s) => { out.x = a.x * s; out.y = a.y * s; return out; },
  scaleAndAdd: (out, a, b, s) => { out.x = a.x + b.x * s; out.y = a.y + b.y * s; return out; },
  len: (a) => Math.sqrt(a.x * a.x + a.y * a.y),
  lenSq: (a) => a.x * a.x + a.y * a.y,
  normalize: (out, a) => {
    const len = Math.sqrt(a.x * a.x + a.y * a.y);
    if (len > 0) { out.x = a.x / len; out.y = a.y / len; }
    return out;
  },
  dot: (a, b) => a.x * b.x + a.y * b.y,
  lerp: (out, a, b, t) => { out.x = a.x + (b.x - a.x) * t; out.y = a.y + (b.y - a.y) * t; return out; },
  clamp: (out, a, min, max) => { out.x = clamp(a.x, min, max); out.y = clamp(a.y, min, max); return out; },
  zero: (out) => { out.x = 0; out.y = 0; return out; },
};

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const smootherstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
export const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const roundTo = (value, precision) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

export const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});