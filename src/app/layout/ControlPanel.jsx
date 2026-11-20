import { useMemo } from 'react';
import { clsx } from 'clsx';
import { effectRegistry } from '../../effects/registry.js';
import { getCuratedPresets } from '../../presets/curatedPresets.js';

export function ControlPanel({
  simulation,
  selectedEffectId,
  onSavePreset,
  className = '',
}) {
  const selectedEffect = useMemo(() =>
    selectedEffectId ? effectRegistry.get(selectedEffectId) : null,
    [selectedEffectId]
  );

  const globalConfig = simulation?.context?.globalConfig || {};

  if (!selectedEffect) {
    return (
      <aside id="control-panel" className={clsx('panel control-panel', className)} role="complementary" aria-label="Controls">
        <div className="panel-header">
          <h2 className="panel-title">Controls</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p>Select an effect from the library to adjust its settings</p>
          </div>
        </div>
        <GlobalControls simulation={simulation} />
      </aside>
    );
  }

  const config = simulation?.effects.get(selectedEffectId)?.config || selectedEffect.defaultConfig;

  return (
    <aside id="control-panel" className={clsx('panel control-panel', className)} role="complementary" aria-label={`${selectedEffect.name} controls`}>
      <div className="panel-header">
        <h2 className="panel-title">{selectedEffect.name}</h2>
        <span className="panel-category">{EFFECT_CATEGORIES[selectedEffect.category]?.label || selectedEffect.category}</span>
      </div>

      <div className="panel-content">
        <EffectControls
          effect={selectedEffect}
          config={config}
          onConfigChange={(key, value) => simulation?.setEffectConfig(selectedEffectId, { [key]: value })}
          simulation={simulation}
        />
      </div>

      <GlobalControls simulation={simulation} onSavePreset={onSavePreset} />
    </aside>
  );
}

const EFFECT_CATEGORIES = {
  particles: { label: 'Particles' },
  physics: { label: 'Physics' },
  bursts: { label: 'Bursts' },
  visual: { label: 'Visual' },
  typography: { label: 'Typography' },
};

function EffectControls({ effect, config, onConfigChange, simulation }) {
  const controls = effect.controls || [];

  if (controls.length === 0) {
    return (
      <div className="control-group">
        <p className="text-muted text-sm">No configurable controls for this effect.</p>
      </div>
    );
  }

  return (
    <div className="control-groups">
      {controls.map(control => (
        <ControlItem
          key={control.key}
          control={control}
          value={config[control.key]}
          onChange={(value) => onConfigChange(control.key, value)}
          simulation={simulation}
        />
      ))}
    </div>
  );
}

function ControlItem({ control, value, onChange, simulation }) {
  const { key, type, label, min, max, step, options, description } = control;

  switch (type) {
    case 'slider':
      return (
        <div className="control-item">
          <label className="label" htmlFor={key}>{label}</label>
          <div className="slider-wrapper">
            <input
              type="range"
              id={key}
              className="slider"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
            />
            <span className="slider-value">{typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : value}</span>
          </div>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      );

    case 'toggle':
      return (
        <div className="control-item control-toggle">
          <label className="label">{label}</label>
          <div className="toggle">
            <input
              type="checkbox"
              id={key}
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="toggle-slider" />
          </div>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="control-item">
          <label className="label" htmlFor={key}>{label}</label>
          <select
            id={key}
            className="input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      );

    case 'color':
      return (
        <div className="control-item">
          <label className="label">{label}</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              id={key}
              className="color-input"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
            <input
              type="text"
              className="input input-sm"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#RRGGBB"
            />
          </div>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      );

    case 'text':
      return (
        <div className="control-item">
          <label className="label" htmlFor={key}>{label}</label>
          <input
            type="text"
            id={key}
            className="input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={control.placeholder}
          />
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
      );

    default:
      return null;
  }
}

function GlobalControls({ simulation, onSavePreset }) {
  const globalConfig = simulation?.context?.globalConfig || {};

  return (
    <>
      <div className="panel-divider" />
      <div className="panel-header">
        <h3 className="panel-title">Global</h3>
      </div>
      <div className="panel-content">
        <div className="control-groups">
          <ControlItem
            control={{ key: 'intensity', type: 'slider', label: 'Intensity', min: 0, max: 2, step: 0.05 }}
            value={globalConfig.intensity || 0.7}
            onChange={(v) => simulation?.setGlobalConfig({ intensity: v })}
          />
          <ControlItem
            control={{ key: 'speed', type: 'slider', label: 'Speed', min: 0, max: 5, step: 0.1 }}
            value={globalConfig.speed || 1}
            onChange={(v) => simulation?.setGlobalConfig({ speed: v })}
          />
          <ControlItem
            control={{ key: 'maxParticles', type: 'slider', label: 'Max Particles', min: 100, max: 10000, step: 100 }}
            value={globalConfig.maxParticles || 1200}
            onChange={(v) => simulation?.setGlobalConfig({ maxParticles: Math.round(v) })}
          />
          <ControlItem
            control={{ key: 'reducedMotion', type: 'toggle', label: 'Reduced Motion' }}
            value={globalConfig.reducedMotion || false}
            onChange={(v) => simulation?.setGlobalConfig({ reducedMotion: v })}
          />
        </div>

        <div className="panel-divider" />
        <div className="global-actions">
          <button
            className="btn btn-secondary w-full"
            onClick={() => simulation?.reset()}
            disabled={!simulation}
          >
            Reset Simulation
          </button>
          <button
            className="btn btn-ghost w-full"
            onClick={onSavePreset}
            disabled={!simulation}
          >
            Save as Preset
          </button>
        </div>
      </div>
    </>
  );
}

export default ControlPanel;