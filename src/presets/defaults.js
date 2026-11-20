/**
 * Default configurations for effects and global settings
 */

export const DEFAULT_GLOBAL_CONFIG = {
  intensity: 0.7,
  speed: 1,
  maxParticles: 1200,
  reducedMotion: false,
};

export const DEFAULT_EFFECT_CONFIGS = {
  particleTrail: {
    enabled: true,
    config: {
      particleSize: 4,
      lifetime: 900,
      spread: 18,
      emissionRate: 15,
      opacity: 0.8,
      colorMode: 'palette',
      trailShape: 'circle',
      velocityInfluence: 0.3,
    },
  },
  magneticField: {
    enabled: false,
    config: {
      radius: 160,
      strength: 0.8,
      mode: 'attract',
      falloff: 'inverse-square',
      affectTrails: true,
      affectPhysics: true,
    },
  },
  glowRibbon: {
    enabled: false,
    config: {
      width: 3,
      color: '#00ffc8',
      fadeTime: 800,
      smoothing: 0.15,
      segments: 20,
      glowIntensity: 0.5,
    },
  },
  fireworks: {
    enabled: false,
    config: {
      particleCount: 60,
      speed: 4,
      spread: 360,
      lifetime: 1200,
      gravity: 0.02,
      burstPattern: 'radial',
      colorMode: 'palette',
      trailLength: 8,
    },
  },
  explosions: {
    enabled: false,
    config: {
      particleCount: 40,
      speed: 6,
      spread: 180,
      lifetime: 800,
      pattern: 'directional',
      colorMode: 'single',
      color: '#ff6b9d',
    },
  },
  gravity: {
    enabled: false,
    config: {
      strength: 0.15,
      direction: 90,
      attractorRadius: 200,
      attractorStrength: 0,
      bounds: 'canvas',
      bounce: 0.6,
      damping: 0.99,
    },
  },
  collision: {
    enabled: false,
    config: {
      particleCollision: false,
      boundaryCollision: true,
      bounce: 0.7,
      damping: 0.98,
      spatialGrid: true,
      cellSize: 50,
    },
  },
  dragThrow: {
    enabled: false,
    config: {
      grabRadius: 24,
      throwMultiplier: 1.5,
      maxThrowSpeed: 20,
      dragDamping: 0.9,
    },
  },
  attraction: {
    enabled: false,
    config: {
      radius: 150,
      strength: 0.5,
      mode: 'attract',
      falloff: 'linear',
      maxForce: 2,
    },
  },
  colorEffects: {
    enabled: false,
    config: {
      mode: 'cycle',
      speed: 0.5,
      palette: 'neon',
      hueShift: 0,
      saturation: 100,
      lightness: 50,
    },
  },
  distortion: {
    enabled: false,
    config: {
      type: 'wave',
      amplitude: 10,
      frequency: 0.02,
      speed: 1,
      radius: 200,
    },
  },
  typography: {
    enabled: false,
    config: {
      text: 'CURSOR',
      fontSize: 120,
      fontWeight: 700,
      mode: 'magnetic',
      scatterRadius: 100,
      waveAmplitude: 30,
      waveFrequency: 0.02,
      reassemblySpeed: 0.02,
    },
  },
  liquidMotion: {
    enabled: false,
    config: {
      resolution: 128,
      viscosity: 0.5,
      dyeDecay: 0.99,
      velocityDissipation: 0.98,
      pressureDissipation: 0.8,
      curl: 30,
      splatRadius: 0.2,
    },
  },
};

export const getDefaultConfig = (effectId) => {
  return DEFAULT_EFFECT_CONFIGS[effectId] || { enabled: false, config: {} };
};

export const getAllDefaultConfigs = () => ({ ...DEFAULT_EFFECT_CONFIGS });

export const createInitialState = () => ({
  version: 1,
  theme: 'default',
  global: { ...DEFAULT_GLOBAL_CONFIG },
  effects: { ...DEFAULT_EFFECT_CONFIGS },
});