/**
 * DOM utilities for the playground
 */

export const requestFullscreen = async (element = document.documentElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen();
    }
    return true;
  } catch (e) {
    console.warn('Fullscreen request failed:', e);
    return false;
  }
};

export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
    return true;
  } catch (e) {
    console.warn('Exit fullscreen failed:', e);
    return false;
  }
};

export const isFullscreen = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.msFullscreenElement;

export const onFullscreenChange = (callback) => {
  const handler = () => callback(isFullscreen());
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('msfullscreenchange', handler);
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('msfullscreenchange', handler);
  };
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCanvas = (canvas, filename = 'cursor-playground.png') => {
  try {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
    }, 'image/png');
    return true;
  } catch (e) {
    console.error('Canvas download failed:', e);
    return false;
  }
};

export const getCanvasStream = (canvas, fps = 30) => {
  try {
    return canvas.captureStream(fps);
  } catch (e) {
    console.warn('Canvas captureStream not supported:', e);
    return null;
  }
};

export const getDevicePixelRatio = () => Math.min(window.devicePixelRatio || 1, 2);

export const getCanvasSize = (canvas, maxDimension = 2048) => {
  const dpr = getDevicePixelRatio();
  const rect = canvas.getBoundingClientRect();
  const width = Math.min(rect.width * dpr, maxDimension);
  const height = Math.min(rect.height * dpr, maxDimension);
  return { width: Math.floor(width), height: Math.floor(height), dpr };
};

export const resizeCanvas = (canvas, maxDimension = 2048) => {
  const { width, height, dpr } = getCanvasSize(canvas, maxDimension);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width / dpr}px`;
  canvas.style.height = `${height / dpr}px`;
  return { width, height, dpr };
};

export const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const prefersDarkScheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const getHardwareConcurrency = () => navigator.hardwareConcurrency || 4;

export const supportsWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
};

export const supportsWebGL2 = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (e) {
    return false;
  }
};

export const supportsMediaRecorder = () =>
  typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9');

export const supportsCanvasCapture = () =>
  typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const rafThrottle = (fn) => {
  let rafId;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fn(...lastArgs);
      });
    }
  };
};