/**
 * Effect Gallery - browse all effects and presets with descriptions
 */

import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { effectRegistry, EFFECT_CATEGORIES } from '../../effects/registry.js';
import { getCuratedPresets, getCategories } from '../../presets/curatedPresets.js';

export function EffectGallery({ simulation, onSelectEffect, onLoadPreset, onClose, isOpen }) {
  const [tab, setTab] = useState('effects'); // 'effects' or 'presets'
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => effectRegistry.getCategories(), []);
  const effectsByCategory = useMemo(() => {
    const result = {};
    for (const cat of categories) {
      result[cat.id] = effectRegistry.getByCategory(cat.id);
    }
    return result;
  }, [categories]);

  const presets = getCuratedPresets();
  const presetCategories = getCategories();

  const filteredEffects = useMemo(() => {
    if (!searchQuery) return effectsByCategory;
    const query = searchQuery.toLowerCase();
    const filtered = {};
    for (const [catId, effects] of Object.entries(effectsByCategory)) {
      const filteredEffects = effects.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.description.toLowerCase().includes(query)
      );
      if (filteredEffects.length > 0) {
        filtered[catId] = filteredEffects;
      }
    }
    return filtered;
  }, [effectsByCategory, searchQuery]);

  const filteredPresets = useMemo(() => {
    if (!searchQuery) return presets;
    const query = searchQuery.toLowerCase();
    return presets.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }, [presets, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="gallery-overlay" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
      <div className="gallery-backdrop" onClick={() => onClose?.()} />

      <div className="gallery-panel">
        <div className="gallery-header">
          <h2 id="gallery-title">Effect Gallery</h2>
          <div className="gallery-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'effects'}
              className={clsx('gallery-tab', tab === 'effects' && 'active')}
              onClick={() => setTab('effects')}
            >
              Effects
            </button>
            <button
              role="tab"
              aria-selected={tab === 'presets'}
              className={clsx('gallery-tab', tab === 'presets' && 'active')}
              onClick={() => setTab('presets')}
            >
              Presets
            </button>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onClose?.()}
            aria-label="Close gallery"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="gallery-search">
          <input
            type="search"
            className="input"
            placeholder="Search effects and presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search gallery"
          />
        </div>

        <div className="gallery-content">
          {tab === 'effects' ? (
            <div className="effects-gallery">
              {categories.map(category => {
                const effects = filteredEffects[category.id] || [];
                if (effects.length === 0) return null;

                const isEnabled = (id) => simulation?.isEffectEnabled(id) || false;

                return (
                  <div key={category.id} className="gallery-category">
                    <h3 className="gallery-category-title">{category.label}</h3>
                    <div className="gallery-grid" role="list">
                      {effects.map(effect => (
                        <article
                          key={effect.id}
                          className={clsx('gallery-card', isEnabled(effect.id) && 'enabled')}
                          role="listitem"
                          onClick={() => onSelectEffect?.(effect.id)}
                        >
                          <div className="card-header">
                            <span className="card-name">{effect.name}</span>
                            {simulation?.isEffectEnabled(effect.id) && (
                              <span className="card-badge">Active</span>
                            )}
                          </div>
                          <p className="card-description">{effect.description}</p>
                          <div className="card-controls">
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={simulation?.isEffectEnabled(effect.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  simulation?.toggleEffect(effect.id);
                                }}
                                aria-label={`Enable ${effect.name}`}
                              />
                              <span className="toggle-slider" />
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="presets-gallery">
              {presetCategories.map(category => {
                const categoryPresets = filteredPresets.filter(p => p.category === category);
                if (categoryPresets.length === 0) return null;

                return (
                  <div key={category} className="gallery-category">
                    <h3 className="gallery-category-title">{category}</h3>
                    <div className="gallery-grid" role="list">
                      {categoryPresets.map(preset => (
                        <article
                          key={preset.id}
                          className="gallery-card preset-card"
                          role="listitem"
                          onClick={() => onLoadPreset?.(preset.id)}
                        >
                          <div className="card-header">
                            <span className="card-name">{preset.name}</span>
                          </div>
                          <p className="card-description">{preset.description}</p>
                          <div className="card-tags">
                            {Object.entries(preset.effects)
                              .filter(([_, config]) => config.enabled)
                              .slice(0, 4)
                              .map(([effectId]) => (
                                <span key={effectId} className="tag">
                                  {effectId.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              ))}
                            {Object.entries(preset.effects).filter(([_, c]) => c.enabled).length > 4 && (
                              <span className="tag more">+{Object.entries(preset.effects).filter(([_, c]) => c.enabled).length - 4}</span>
                            )}
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onLoadPreset?.(preset.id); }}>
                            Load Preset
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EffectGallery;