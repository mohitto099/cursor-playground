import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { getCuratedPresets, getCategories } from '../../presets/curatedPresets.js';
import { getTheme, setTheme } from '../../storage/settingsStorage.js';
import { audioManager } from '../../audio/AudioManager.js';
import { recordingManager } from '../../audio/RecordingManager.js';
import { shareConfig, showToast } from '../../utils/share.js';
import { downloadCanvas } from '../../utils/dom.js';

export function TopBar({
  simulation,
  onTogglePanel,
  onClearCanvas,
  onRandomConfig,
  onChaosMode,
  onFullscreenToggle,
  onOpenGallery,
  onOpenTutorial,
  isFullscreen,
  leftPanelOpen,
  rightPanelOpen,
}) {
  const [presetOpen, setPresetOpen] = useState(false);
  const [theme, setThemeState] = useLocalStorage('cp-theme', getTheme());
  const [soundEnabled, setSoundEnabled] = useLocalStorage('cp-sound-enabled', false);
  const [recording, setRecording] = useState(false);

  const presets = getCuratedPresets();
  const categories = getCategories();

  // Initialize audio manager when sound is enabled
  useEffect(() => {
    if (soundEnabled) {
      audioManager.init().catch(() => {
        setSoundEnabled(false);
      });
    }
  }, [soundEnabled]);

  // Handle recording state
  useEffect(() => {
    if (recording) {
      const startRecording = async () => {
        const canvas = document.querySelector('canvas');
        if (canvas && await recordingManager.startRecording(canvas)) {
          setRecording(true);
        }
      };
      startRecording();
    } else {
      const stopPromise = recordingManager.stopRecording();
      if (stopPromise) {
        stopPromise.then((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cursor-playground-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Recording downloaded!');
          }
        });
      }
    }
  }, [recording]);

  const handlePresetSelect = useCallback((presetId) => {
    if (simulation) {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        simulation.setGlobalConfig(preset.global);
        for (const [effectId, effectConfig] of Object.entries(preset.effects)) {
          simulation.setEffectConfig(effectId, effectConfig.config);
          if (effectConfig.enabled) {
            simulation.enableEffect(effectId);
          } else {
            simulation.disableEffect(effectId);
          }
        }
      }
    }
    setPresetOpen(false);
  }, [simulation, presets]);

  const handleThemeChange = useCallback((newTheme) => {
    setThemeState(newTheme);
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [setThemeState]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(!soundEnabled);
  }, [soundEnabled, setSoundEnabled]);

  const handleShare = useCallback(async () => {
    if (!simulation) return;

    const globalConfig = simulation.context.globalConfig;
    const effects = {};
    for (const [id, effect] of simulation.effects) {
      effects[id] = {
        enabled: simulation.enabledEffects.has(id),
        config: effect.config,
      };
    }

    const config = {
      name: 'Shared Config',
      description: 'Shared from Cursor Playground',
      category: 'shared',
      global: globalConfig,
      effects,
    };

    const result = await shareConfig(config, {
      title: 'Cursor Playground Configuration',
      text: 'Check out this Cursor Playground configuration!',
    });

    if (result.success) {
      showToast(result.copied ? 'Link copied to clipboard!' : 'Shared successfully!');
    } else {
      showToast('Failed to share configuration');
    }
  }, [simulation]);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      downloadCanvas(canvas, `cursor-playground-${Date.now()}.png`);
      showToast('Screenshot downloaded!');
    }
  }, []);

  const toggleRecording = useCallback(() => {
    setRecording(!recording);
  }, [recording]);

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          className={clsx('btn btn-ghost btn-icon', leftPanelOpen && 'active')}
          onClick={() => onTogglePanel('left')}
          aria-label="Toggle effect library"
          aria-expanded={leftPanelOpen}
          aria-controls="effect-library"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>

        <h1 className="topbar-title">Cursor Playground</h1>

        <div className="topbar-divider" />

        <div className="topbar-presets" role="combobox" aria-label="Presets">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPresetOpen(!presetOpen)}
            aria-expanded={presetOpen}
            aria-haspopup="listbox"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Presets</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {presetOpen && (
            <div className="preset-dropdown" role="listbox" aria-label="Select preset">
              {categories.map(cat => (
                <div key={cat.id} className="preset-category">
                  <div className="preset-category-label">{cat.label}</div>
                  {presets.filter(p => p.category === cat.id).map(preset => (
                    <button
                      key={preset.id}
                      className="preset-option"
                      role="option"
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-desc">{preset.description}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="topbar-center" />

      <div className="topbar-right">
        <div className="topbar-item" role="group" aria-label="Theme">
          <label className="sr-only" for="theme-select">Theme</label>
          <select
            id="theme-select"
            className="input input-sm"
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
            aria-label="Select theme"
          >
            <option value="default">Default</option>
            <option value="midnight">Midnight</option>
            <option value="neon">Neon</option>
            <option value="dawn">Dawn</option>
            <option value="forest">Forest</option>
          </select>
        </div>

        <div className="topbar-divider" />

        <button
          className={clsx('btn btn-ghost btn-icon', soundEnabled && 'active')}
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Disable sound' : 'Enable sound'}
          aria-pressed={soundEnabled}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {soundEnabled ? (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </>
            ) : (
              <>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
        </button>

        <button
          className={clsx('btn btn-ghost btn-icon', isFullscreen && 'active')}
          onClick={onFullscreenToggle}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isFullscreen ? (
              <>
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2v-3" />
              </>
            ) : (
              <>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </>
            )}
          </svg>
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onClearCanvas}
          aria-label="Clear canvas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        <div className="topbar-divider" />

        <button
          className="btn btn-ghost btn-icon"
          onClick={handleScreenshot}
          aria-label="Screenshot"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 11h10" />
            <path d="M7 16h10" />
            <path d="M11 7v10" />
            <path d="M16 7v10" />
          </svg>
        </button>

        <button
          className={clsx('btn btn-ghost btn-icon', recording && 'recording')}
          onClick={toggleRecording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          aria-pressed={recording}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          {recording && <span className="recording-indicator" aria-hidden="true" />}
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={handleShare}
          aria-label="Share configuration"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="16.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="13.49" />
          </svg>
        </button>

        <div className="topbar-divider" />

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRandomConfig}
          aria-label="Random configuration"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
            <polyline points="17 3 22 8 17 13" />
            <polyline points="7 3 2 8 7 13" />
            <path d="M12 8v9" />
            <path d="M12 17v1" />
          </svg>
          Random
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onChaosMode}
          aria-label="Chaos mode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Chaos
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onOpenGallery}
          aria-label="Open effect gallery"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <line x1="6" y1="6" x2="6.01" y2="6.01" />
          </svg>
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onOpenTutorial}
          aria-label="Open tutorial"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </button>

        <button
          className={clsx('btn btn-ghost btn-icon', isFullscreen && 'active')}
          onClick={onFullscreenToggle}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isFullscreen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isFullscreen ? (
              <>
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2v-3" />
              </>
            ) : (
              <>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </>
            )}
          </svg>
        </button>

        <button
          className="btn btn-ghost btn-icon"
          onClick={onClearCanvas}
          aria-label="Clear canvas"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>

        <div className="topbar-divider" />

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRandomConfig}
          aria-label="Random configuration"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
            <polyline points="17 3 22 8 17 13" />
            <polyline points="7 3 2 8 7 13" />
            <path d="M12 8v9" />
            <path d="M12 17v1" />
          </svg>
          Random
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onChaosMode}
          aria-label="Chaos mode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Chaos
        </button>

        <button
          className={clsx('btn btn-ghost btn-icon', rightPanelOpen && 'active')}
          onClick={() => onTogglePanel('right')}
          aria-label="Toggle controls"
          aria-expanded={rightPanelOpen}
          aria-controls="control-panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TopBar;