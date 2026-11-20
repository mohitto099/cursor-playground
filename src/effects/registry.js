/**
 * Effect registry - manages effect registration, lifecycle, and categories
 */

const effects = new Map();
const categories = new Map();

export const EFFECT_CATEGORIES = {
  particles: { label: 'Particles', order: 1 },
  physics: { label: 'Physics', order: 2 },
  bursts: { label: 'Bursts', order: 3 },
  visual: { label: 'Visual', order: 4 },
  typography: { label: 'Typography', order: 5 },
};

export function registerEffect(effect) {
  if (!effect || !effect.id) {
    console.warn('Effect must have an id');
    return false;
  }
  if (effects.has(effect.id)) {
    console.warn(`Effect ${effect.id} already registered`);
    return false;
  }

  const category = effect.category || 'particles';
  if (!EFFECT_CATEGORIES[category]) {
    console.warn(`Unknown category: ${category}, defaulting to particles`);
  }

  effect.category = category;
  effect.name = effect.name || effect.id;
  effect.description = effect.description || '';
  effect.defaultConfig = effect.defaultConfig || {};
  effect.config = { ...effect.defaultConfig };
  effect.enabled = effect.enabled !== false;

  effects.set(effect.id, effect);

  if (!categories.has(category)) {
    categories.set(category, []);
  }
  categories.get(category).push(effect.id);

  return true;
}

export function unregisterEffect(id) {
  const effect = effects.get(id);
  if (!effect) return false;

  effects.delete(id);
  const catEffects = categories.get(effect.category);
  if (catEffects) {
    const idx = catEffects.indexOf(id);
    if (idx !== -1) catEffects.splice(idx, 1);
  }
  return true;
}

export function getEffect(id) {
  return effects.get(id);
}

export function getAllEffects() {
  return Array.from(effects.values());
}

export function getEffectsByCategory(category) {
  const ids = categories.get(category) || [];
  return ids.map(id => effects.get(id)).filter(Boolean);
}

export function getCategories() {
  return Object.entries(EFFECT_CATEGORIES)
    .map(([key, value]) => ({ id: key, ...value, effects: categories.get(key)?.length || 0 }))
    .sort((a, b) => a.order - b.order);
}

export function getEffectIds() {
  return Array.from(effects.keys());
}

export function createEffectConfig(effectId, overrides = {}) {
  const effect = effects.get(effectId);
  if (!effect) return null;
  return {
    enabled: effect.enabled,
    config: { ...effect.defaultConfig, ...overrides },
  };
}

export function validateEffectConfig(effectId, config) {
  const effect = effects.get(effectId);
  if (!effect) return { valid: false, errors: ['Effect not found'] };
  if (effect.validateConfig) {
    return effect.validateConfig(config);
  }
  return { valid: true, errors: [] };
}

export function createEffectInstance(effectId, context, config) {
  const effect = effects.get(effectId);
  if (!effect) return null;

  const instance = {
    ...effect,
    config: { ...effect.defaultConfig, ...config },
    context,
  };

  if (instance.initialize) {
    instance.initialize(context, instance.config);
  }

  return instance;
}

export function disposeEffectInstance(instance) {
  if (instance && instance.dispose) {
    instance.dispose(instance.context);
  }
}

export const effectRegistry = {
  register: registerEffect,
  unregister: unregisterEffect,
  get: getEffect,
  getAll: getAllEffects,
  getByCategory: getEffectsByCategory,
  getCategories: getCategories,
  getIds: getEffectIds,
  createConfig: createEffectConfig,
  validateConfig: validateEffectConfig,
  createInstance: createEffectInstance,
  disposeInstance: disposeEffectInstance,
};