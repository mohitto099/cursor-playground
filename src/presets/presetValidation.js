/**
 * Preset validation and migration
 */

import { DEFAULT_EFFECT_CONFIGS, DEFAULT_GLOBAL_CONFIG } from './defaults.js';

const CURRENT_VERSION = 1;
const MAX_PRESET_SIZE = 50000; // ~50KB max

const EFFECT_IDS = Object.keys(DEFAULT_EFFECT_CONFIGS);
const GLOBAL_KEYS = Object.keys(DEFAULT_GLOBAL_CONFIG);

const GLOBAL_LIMITS = {
  intensity: { min: 0, max: 2 },
  speed: { min: 0, max: 5 },
  maxParticles: { min: 100, max: 10000 },
  reducedMotion: { type: 'boolean' },
  soundEnabled: { type: 'boolean' },
  masterVolume: { min: 0, max: 1 },
};

export const validatePreset = (preset) => {
  const errors = [];
  const warnings = [];

  if (!preset || typeof preset !== 'object') {
    errors.push('Preset must be an object');
    return { valid: false, errors, warnings, data: null };
  }

  // Version check
  if (preset.version === undefined) {
    warnings.push('Missing version, assuming v1');
  } else if (preset.version > CURRENT_VERSION) {
    errors.push(`Preset version ${preset.version} is newer than supported ${CURRENT_VERSION}`);
    return { valid: false, errors, warnings, data: null };
  }

  // Required fields
  if (!preset.name || typeof preset.name !== 'string' || preset.name.trim().length === 0) {
    errors.push('Preset must have a non-empty name');
  }
  if (preset.name && preset.name.length > 64) {
    warnings.push('Preset name is very long (>64 chars)');
  }

  // Global config validation
  if (preset.global) {
    const globalResult = validateGlobalConfig(preset.global);
    errors.push(...globalResult.errors);
    warnings.push(...globalResult.warnings);
  }

  // Effects validation
  if (preset.effects) {
    const effectsResult = validateEffectsConfig(preset.effects);
    errors.push(...effectsResult.errors);
    warnings.push(...effectsResult.warnings);
  } else {
    errors.push('Preset must have effects configuration');
  }

  // Size check
  const jsonSize = JSON.stringify(preset).length;
  if (jsonSize > MAX_PRESET_SIZE) {
    errors.push(`Preset exceeds maximum size (${MAX_PRESET_SIZE} bytes)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? sanitizePreset(preset) : null,
  };
};

const validateGlobalConfig = (global) => {
  const errors = [];
  const warnings = [];

  if (typeof global !== 'object') {
    errors.push('Global config must be an object');
    return { errors, warnings };
  }

  for (const [key, value] of Object.entries(global)) {
    const limits = GLOBAL_LIMITS[key];
    if (!limits) {
      warnings.push(`Unknown global setting: ${key}`);
      continue;
    }
    if (limits.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Global.${key} must be a boolean`);
    } else if (limits.min !== undefined && limits.max !== undefined) {
      if (typeof value !== 'number' || value < limits.min || value > limits.max) {
        errors.push(`Global.${key} must be a number between ${limits.min} and ${limits.max}`);
      }
    }
  }

  return { errors, warnings };
};

const validateEffectsConfig = (effects) => {
  const errors = [];
  const warnings = [];

  if (typeof effects !== 'object') {
    errors.push('Effects must be an object');
    return { errors, warnings };
  }

  for (const [effectId, effectConfig] of Object.entries(effects)) {
    if (!EFFECT_IDS.includes(effectId)) {
      warnings.push(`Unknown effect: ${effectId}`);
      continue;
    }
    if (!effectConfig || typeof effectConfig !== 'object') {
      errors.push(`Effect ${effectId} config must be an object`);
      continue;
    }
    if (typeof effectConfig.enabled !== 'boolean') {
      errors.push(`Effect ${effectId}.enabled must be a boolean`);
    }
    if (effectConfig.config && typeof effectConfig.config !== 'object') {
      errors.push(`Effect ${effectId}.config must be an object`);
    }
  }

  return { errors, warnings };
};

export const sanitizePreset = (preset) => {
  const sanitized = {
    version: CURRENT_VERSION,
    name: preset.name?.trim().slice(0, 64) || 'Untitled',
    description: preset.description?.trim().slice(0, 256) || '',
    category: preset.category?.trim().slice(0, 32) || 'custom',
    global: { ...DEFAULT_GLOBAL_CONFIG },
    effects: {},
  };

  // Sanitize global
  if (preset.global && typeof preset.global === 'object') {
    for (const key of GLOBAL_KEYS) {
      const value = preset.global[key];
      const limits = GLOBAL_LIMITS[key];
      if (limits?.type === 'boolean') {
        sanitized.global[key] = Boolean(value);
      } else if (limits?.min !== undefined && typeof value === 'number') {
        sanitized.global[key] = Math.max(limits.min, Math.min(limits.max, value));
      } else if (value !== undefined) {
        sanitized.global[key] = value;
      }
    }
  }

  // Sanitize effects
  for (const effectId of EFFECT_IDS) {
    const defaultEffect = DEFAULT_EFFECT_CONFIGS[effectId];
    const presetEffect = preset.effects?.[effectId];

    if (presetEffect && typeof presetEffect === 'object') {
      sanitized.effects[effectId] = {
        enabled: Boolean(presetEffect.enabled),
        config: { ...defaultEffect.config },
      };
      if (presetEffect.config && typeof presetEffect.config === 'object') {
        // Only copy known config keys
        for (const configKey of Object.keys(defaultEffect.config)) {
          if (presetEffect.config[configKey] !== undefined) {
            sanitized.effects[effectId].config[configKey] = presetEffect.config[configKey];
          }
        }
      }
    } else {
      sanitized.effects[effectId] = { ...defaultEffect };
    }
  }

  return sanitized;
};

export const migratePreset = (preset) => {
  if (!preset.version || preset.version >= CURRENT_VERSION) return preset;

  let migrated = { ...preset };
  let fromVersion = preset.version || 1;

  while (fromVersion < CURRENT_VERSION) {
    migrated = migrateVersion(migrated, fromVersion);
    fromVersion++;
  }

  migrated.version = CURRENT_VERSION;
  return migrated;
};

const migrateVersion = (preset, fromVersion) => {
  // Future migrations go here
  // Example:
  // if (fromVersion === 1) { ... }
  return preset;
};

export const validateAndMigrate = (preset) => {
  const migrated = migratePreset(preset);
  return validatePreset(migrated);
};