/**
 * Preset storage for user-saved configurations
 */

const STORAGE_KEY = 'cursor-playground-presets';
const VERSION = 1;

const DEFAULT_PRESETS = [];

export const loadPresets = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_PRESETS];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...DEFAULT_PRESETS];
    return parsed.filter(validatePreset).map(migratePreset);
  } catch (e) {
    console.warn('Failed to load presets:', e);
    return [...DEFAULT_PRESETS];
  }
};

export const savePresets = (presets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    console.warn('Failed to save presets:', e);
    return false;
  }
};

export const addPreset = (preset) => {
  const presets = loadPresets();
  const newPreset = {
    ...preset,
    id: preset.id || crypto.randomUUID(),
    version: VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  presets.unshift(newPreset);
  savePresets(presets);
  return newPreset;
};

export const updatePreset = (id, updates) => {
  const presets = loadPresets();
  const index = presets.findIndex(p => p.id === id);
  if (index === -1) return null;
  presets[index] = {
    ...presets[index],
    ...updates,
    id,
    updatedAt: Date.now(),
  };
  savePresets(presets);
  return presets[index];
};

export const deletePreset = (id) => {
  const presets = loadPresets();
  const filtered = presets.filter(p => p.id !== id);
  if (filtered.length === presets.length) return false;
  savePresets(filtered);
  return true;
};

export const getPreset = (id) => {
  const presets = loadPresets();
  return presets.find(p => p.id === id) || null;
};

const validatePreset = (preset) => {
  if (!preset || typeof preset !== 'object') return false;
  if (!preset.name || typeof preset.name !== 'string') return false;
  if (!preset.effects || typeof preset.effects !== 'object') return false;
  return true;
};

const migratePreset = (preset) => {
  if (!preset.version || preset.version < VERSION) {
    return { ...preset, version: VERSION };
  }
  return preset;
};

export const exportPreset = (preset) => {
  const data = { ...preset, exportedAt: Date.now() };
  return JSON.stringify(data, null, 2);
};

export const importPreset = (jsonString) => {
  try {
    const preset = JSON.parse(jsonString);
    if (!validatePreset(preset)) throw new Error('Invalid preset format');
    return addPreset(preset);
  } catch (e) {
    console.warn('Failed to import preset:', e);
    return null;
  }
};