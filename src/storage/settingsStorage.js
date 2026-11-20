/**
 * Settings storage for global preferences
 */

const STORAGE_KEY = 'cursor-playground-settings';
const VERSION = 1;

const DEFAULT_SETTINGS = {
  version: VERSION,
  theme: 'default',
  dismissedIntro: false,
  global: {
    intensity: 0.7,
    speed: 1,
    maxParticles: 1200,
    reducedMotion: false,
    soundEnabled: false,
    masterVolume: 0.5,
  },
  ui: {
    showFPS: true,
    showParticleCount: true,
    showActiveEffects: true,
    compactMode: false,
  },
};

export const loadSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored);
    if (parsed.version !== VERSION) return migrateSettings(parsed);
    return { ...DEFAULT_SETTINGS, ...parsed, global: { ...DEFAULT_SETTINGS.global, ...parsed.global }, ui: { ...DEFAULT_SETTINGS.ui, ...parsed.ui } };
  } catch (e) {
    console.warn('Failed to load settings:', e);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  try {
    const toSave = { ...settings, version: VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch (e) {
    console.warn('Failed to save settings:', e);
    return false;
  }
};

export const resetSettings = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.warn('Failed to reset settings:', e);
    return false;
  }
};

export const getSetting = (path) => {
  const settings = loadSettings();
  return path.split('.').reduce((obj, key) => obj?.[key], settings);
};

export const setSetting = (path, value) => {
  const settings = loadSettings();
  const keys = path.split('.');
  let current = settings;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] = { ...current[keys[i]] };
  }
  current[keys[keys.length - 1]] = value;
  saveSettings(settings);
  return settings;
};

const migrateSettings = (oldSettings) => {
  console.log('Migrating settings from version', oldSettings.version, 'to', VERSION);
  return { ...DEFAULT_SETTINGS, ...oldSettings };
};

export const markIntroDismissed = () => setSetting('dismissedIntro', true);

export const getTheme = () => getSetting('theme');
export const setTheme = (theme) => setSetting('theme', theme);

export const getGlobalSettings = () => getSetting('global');
export const setGlobalSettings = (global) => setSetting('global', global);

export const getUISettings = () => getSetting('ui');
export const setUISettings = (ui) => setSetting('ui', ui);