import { useMemo } from 'react';
import { clsx } from 'clsx';
import { effectRegistry, EFFECT_CATEGORIES } from '../../effects/registry.js';

export function EffectLibrary({
  simulation,
  selectedEffectId,
  onSelectEffect,
  className = '',
}) {
  const categories = useMemo(() => effectRegistry.getCategories(), []);
  const effectsByCategory = useMemo(() => {
    const result = {};
    for (const cat of categories) {
      result[cat.id] = effectRegistry.getByCategory(cat.id);
    }
    return result;
  }, [categories]);

  const toggleEffect = (effectId) => {
    if (simulation) {
      simulation.toggleEffect(effectId);
    }
  };

  const isEnabled = (effectId) => simulation?.isEffectEnabled(effectId) || false;

  return (
    <aside
      id="effect-library"
      className={clsx('panel effect-library', className)}
      role="navigation"
      aria-label="Effect library"
    >
      <div className="panel-header">
        <h2 className="panel-title">Effects</h2>
        <span className="panel-count">
          {simulation ? simulation.enabledEffects.size : 0} active
        </span>
      </div>

      <div className="panel-content">
        {categories.map(category => {
          const effects = effectsByCategory[category.id] || [];
          if (effects.length === 0) return null;

          return (
            <div key={category.id} className="effect-category">
              <h3 className="effect-category-title">{category.label}</h3>
              <div className="effect-list" role="list">
                {effects.map(effect => (
                  <label
                    key={effect.id}
                    className={clsx('effect-item', isEnabled(effect.id) && 'enabled', selectedEffectId === effect.id && 'selected')}
                    role="listitem"
                    onClick={() => onSelectEffect(effect.id)}
                  >
                    <input
                      type="checkbox"
                      className="effect-toggle"
                      checked={isEnabled(effect.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleEffect(effect.id);
                      }}
                      aria-label={`Enable ${effect.name}`}
                    />
                    <div className="effect-info">
                      <span className="effect-name">{effect.name}</span>
                      {effect.description && <span className="effect-desc">{effect.description}</span>}
                    </div>
                    <div className="effect-indicator" aria-hidden="true" />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="panel-footer">
        <button
          className="btn btn-secondary btn-sm w-full"
          onClick={() => simulation?.clear()}
          disabled={!simulation}
        >
          Clear All
        </button>
      </div>
    </aside>
  );
}

export default EffectLibrary;