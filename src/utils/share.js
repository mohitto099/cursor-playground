/**
 * Share utilities - URL encoding/decoding for configuration sharing
 */

import { validatePreset } from '../presets/presetValidation.js';
import { createInitialState } from '../presets/defaults.js';

const MAX_URL_LENGTH = 2000;
const COMPRESSION_ENABLED = true;

// Simple base64url encoding
const base64url = {
  encode(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  },
  decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    if (pad) str += '='.repeat(4 - pad);
    return atob(str);
  },
};

// Simple LZ-string-like compression for JSON
const compress = (jsonStr) => {
  if (!COMPRESSION_ENABLED) return jsonStr;
  // Simple dictionary-based compression for repeated strings
  // This is a very basic implementation
  return jsonStr;
};

const decompress = (str) => {
  if (!COMPRESSION_ENABLED) return str;
  return str;
};

export const encodeConfig = (config) => {
  try {
    // Validate and sanitize config
    const validation = validatePreset(config);
    if (!validation.valid) {
      console.warn('Invalid config for sharing:', validation.errors);
      return null;
    }

    const sanitized = validation.data;
    const jsonStr = JSON.stringify(sanitized);
    const compressed = compress(jsonStr);
    const encoded = base64url.encode(compressed);

    if (encoded.length > MAX_URL_LENGTH) {
      console.warn('Encoded config too long for URL');
      return null;
    }

    return encoded;
  } catch (e) {
    console.error('Failed to encode config:', e);
    return null;
  }
};

export const decodeConfig = (encoded) => {
  try {
    if (!encoded || typeof encoded !== 'string') return null;

    const decoded = base64url.decode(encoded);
    const decompressed = decompress(decoded);
    const config = JSON.parse(decompressed);

    const validation = validatePreset(config);
    if (!validation.valid) {
      console.warn('Decoded config invalid:', validation.errors);
      return null;
    }

    return validation.data;
  } catch (e) {
    console.error('Failed to decode config:', e);
    return null;
  }
};

export const shareConfig = async (config, options = {}) => {
  const encoded = encodeConfig(config);
  if (!encoded) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?config=${encoded}`;

  if (navigator.share && options.useWebShare !== false) {
    try {
      await navigator.share({
        title: options.title || 'Cursor Playground Configuration',
        text: options.text || 'Check out this Cursor Playground configuration!',
        url: shareUrl,
      });
      return { success: true, url: shareUrl };
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Web Share API failed:', e);
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    return { success: true, url: shareUrl, copied: true };
  } catch (e) {
    console.warn('Clipboard API failed:', e);
    return { success: false, url: shareUrl };
  }
};

export const getConfigFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('config');
  if (!encoded) return null;
  return decodeConfig(encoded);
};

export const clearConfigFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('config');
  window.history.replaceState({}, '', url);
};

// Easter egg configurations
export const EASTER_EGGS = {
  // Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
  konami: {
    sequence: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'],
    config: {
      name: 'Konami Chaos',
      description: 'Unlocked via Konami code!',
      category: 'easter-egg',
      global: { intensity: 1.5, speed: 2, maxParticles: 3000, reducedMotion: false },
      effects: {
        particleTrail: { enabled: true, config: { particleSize: 6, lifetime: 500, spread: 30, emissionRate: 50, opacity: 1, colorMode: 'rainbow', trailShape: 'star' } },
        magneticField: { enabled: true, config: { radius: 300, strength: 2, mode: 'attract', falloff: 'inverse' } },
        fireworks: { enabled: true, config: { particleCount: 100, speed: 8, spread: 360, lifetime: 2000, gravity: 0.01, burstPattern: 'radial' } },
        explosions: { enabled: true, config: { particleCount: 80, speed: 10, spread: 360, lifetime: 1000, pattern: 'shockwave' } },
        colorEffects: { enabled: true, config: { mode: 'cycle', speed: 2, palette: 'neon' } },
        distortion: { enabled: true, config: { type: 'wave', amplitude: 20, frequency: 0.05, speed: 3 } },
      },
    },
  },

  // Click "Cursor Playground" title 5 times
  titleClick: {
    count: 5,
    config: {
      name: 'Title Clicker',
      description: 'You really like clicking that title!',
      category: 'easter-egg',
      global: { intensity: 1, speed: 1, maxParticles: 2000, reducedMotion: false },
      effects: {
        particleTrail: { enabled: true, config: { particleSize: 8, lifetime: 2000, spread: 10, emissionRate: 5, opacity: 0.5, trailShape: 'circle' } },
        glowRibbon: { enabled: true, config: { width: 10, color: '#ff00aa', fadeTime: 5000, smoothing: 0.05 } },
        typography: { enabled: true, config: { text: 'EASTER EGG', fontSize: 200, mode: 'explode' } },
      },
    },
  },

  // Type "party" on keyboard
  partyMode: {
    sequence: ['KeyP', 'KeyA', 'KeyR', 'KeyT', 'KeyY'],
    config: {
      name: 'Party Mode',
      description: 'It\'s party time!',
      category: 'easter-egg',
      global: { intensity: 1, speed: 1.5, maxParticles: 4000, reducedMotion: false },
      effects: {
        particleTrail: { enabled: true, config: { particleSize: 5, lifetime: 800, spread: 40, emissionRate: 40, opacity: 0.9, colorMode: 'palette', trailShape: 'star' } },
        magneticField: { enabled: true, config: { radius: 400, strength: 1.5, mode: 'attract' } },
        fireworks: { enabled: true, config: { particleCount: 150, speed: 10, spread: 360, lifetime: 3000, burstPattern: 'radial' } },
        explosions: { enabled: true, config: { particleCount: 100, speed: 12, spread: 360, pattern: 'shockwave' } },
        colorEffects: { enabled: true, config: { mode: 'cycle', speed: 3, palette: 'fire' } },
        gravity: { enabled: true, config: { strength: 0, attractorRadius: 300, attractorStrength: 1 } },
      },
    },
  },
};

let keyBuffer = [];
let titleClickCount = 0;
let titleClickTimer = null;

export const initEasterEggs = (onTrigger) => {
  const handleKeyDown = (e) => {
    // Konami code
    keyBuffer.push(e.code);
    if (keyBuffer.length > 10) keyBuffer.shift();

    const konami = EASTER_EGGS.konami.sequence;
    if (keyBuffer.length === konami.length && keyBuffer.every((k, i) => k === konami[i])) {
      keyBuffer = [];
      onTrigger?.('konami', EASTER_EGGS.konami.config);
      showToast('🎮 Konami Code activated! Chaos unleashed!');
    }

    // Party mode
    const party = EASTER_EGGS.partyMode.sequence;
    if (keyBuffer.length >= party.length) {
      const recent = keyBuffer.slice(-party.length);
      if (recent.every((k, i) => k === party[i])) {
        keyBuffer = [];
        onTrigger?.('party', EASTER_EGGS.partyMode.config);
        showToast('🎉 Party Mode activated!');
      }
    }
  };

  const handleTitleClick = () => {
    titleClickCount++;
    clearTimeout(titleClickTimer);
    titleClickTimer = setTimeout(() => { titleClickCount = 0; }, 2000);

    if (titleClickCount >= EASTER_EGGS.titleClick.count) {
      titleClickCount = 0;
      onTrigger?.('titleClick', EASTER_EGGS.titleClick.config);
      showToast('✨ Title Clicker Easter Egg found!');
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  // Title click handler should be attached to the title element

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

export const showToast = (message) => {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  ' ': { action: 'pause', description: 'Pause/Resume simulation' },
  'Escape': { action: 'close-panels', description: 'Close open panels' },
  'KeyR': { action: 'random', description: 'Random configuration', ctrlKey: false },
  'KeyC': { action: 'clear', description: 'Clear canvas', ctrlKey: false },
  'KeyG': { action: 'gallery', description: 'Open effect gallery', ctrlKey: false },
  'KeyT': { action: 'tutorial', description: 'Open tutorial', ctrlKey: false },
  'KeyF': { action: 'fullscreen', description: 'Toggle fullscreen', ctrlKey: false },
  'KeyS': { action: 'save-preset', description: 'Save current preset', ctrlKey: true },
  'Digit1': { action: 'preset-1', description: 'Load preset 1', altKey: false },
  'Digit2': { action: 'preset-2', description: 'Load preset 2', altKey: false },
  'Digit3': { action: 'preset-3', description: 'Load preset 3', altKey: false },
};

export const initKeyboardShortcuts = (callbacks) => {
  const handleKeyDown = (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const key = e.code;
    const shortcut = KEYBOARD_SHORTCUTS[key];

    if (shortcut) {
      // Check modifiers
      if (shortcut.ctrlKey !== undefined && e.ctrlKey !== shortcut.ctrlKey) return;
      if (shortcut.altKey !== undefined && e.altKey !== shortcut.altKey) return;
      if (shortcut.shiftKey !== undefined && e.shiftKey !== shortcut.shiftKey) return;

      e.preventDefault();
      callbacks[shortcut.action]?.();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
};