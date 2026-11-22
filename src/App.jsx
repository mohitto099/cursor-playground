import { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { CanvasHost } from './canvas/CanvasHost.jsx';
import { TopBar } from './app/layout/TopBar.jsx';
import { EffectLibrary } from './app/layout/EffectLibrary.jsx';
import { ControlPanel } from './app/layout/ControlPanel.jsx';
import { StatusBar } from './app/layout/StatusBar.jsx';
import { MobilePanels } from './app/layout/MobilePanels.jsx';
import { Tutorial } from './app/components/Tutorial.jsx';
import { EffectGallery } from './app/components/EffectGallery.jsx';
import { useLocalStorage } from './app/hooks/useLocalStorage.js';
import { useReducedMotion } from './app/hooks/useReducedMotion.js';
import { markIntroDismissed } from './storage/settingsStorage.js';
import { effectRegistry } from './effects/registry.js';
import { particleTrailEffect } from './effects/particles/ParticleTrail.js';
import { magneticFieldEffect } from './effects/particles/MagneticField.js';
import { glowRibbonEffect } from './effects/particles/GlowRibbon.js';
import { gravityEffect } from './effects/physics/Gravity.js';
import { collisionEffect } from './effects/physics/Collision.js';
import { dragThrowEffect } from './effects/physics/DragThrow.js';
import { attractionEffect } from './effects/physics/Attraction.js';
import { fireworksEffect } from './effects/bursts/Fireworks.js';
import { explosionsEffect } from './effects/bursts/Explosions.js';
import { colorEffectsEffect } from './effects/visual/ColourEffects.js';
import { distortionEffect } from './effects/visual/Distortion.js';
import { liquidMotionEffect } from './effects/visual/LiquidMotion.js';
import { typographyEffect } from './effects/typography/TypographyDistortion.js';
import { getCuratedPresets } from './presets/curatedPresets.js';
import { createInitialState } from './presets/defaults.js';
import { requestFullscreen, exitFullscreen, isFullscreen, onFullscreenChange, downloadCanvas } from './utils/dom.js';
import { initEasterEggs, initKeyboardShortcuts, shareConfig, getConfigFromUrl, clearConfigFromUrl, showToast, KEYBOARD_SHORTCUTS } from './utils/share.js';
import { audioManager } from './audio/AudioManager.js';
import { recordingManager } from './audio/RecordingManager.js';
import { addPreset as addUserPreset } from './storage/presetStorage.js';

function App() {
  const [simulation, setSimulation] = useState(null);
  const [renderer, setRenderer] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [selectedEffectId, setSelectedEffectId] = useState('particleTrail');
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [isFullscreenState, setIsFullscreenState] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showIntro, setShowIntro] = useLocalStorage('cp-intro-shown', false);
  const [showTutorial, setShowTutorial] = useLocalStorage('cp-tutorial-shown', false);
  const [showGallery, setShowGallery] = useState(false);
  const reducedMotion = useReducedMotion();
  const introDismissedRef = useRef(false);

  const canvasContainerRef = useRef(null);

  const handleSimulationReady = useCallback((sim, rend) => {
    setSimulation(sim);
    setRenderer(rend);
    setPerformance(sim.performance);

    sim.pointer.subscribe((type, data) => {
      if (type === 'down' && data.button === 'left') {
        if (showIntro && !introDismissedRef.current) {
          setShowIntro(false);
          markIntroDismissed();
          introDismissedRef.current = true;
        }
        // Dispatch tutorial action event
        window.dispatchEvent(new CustomEvent('cp-tutorial-action', { detail: 'click' }));
      }
      if (type === 'move') {
        window.dispatchEvent(new CustomEvent('cp-tutorial-action', { detail: 'move' }));
      }
    });
  }, [showIntro]);

  const togglePanel = useCallback((side) => {
    if (side === 'left') {
      setLeftPanelOpen(!leftPanelOpen);
      if (!leftPanelOpen) setRightPanelOpen(false);
    } else {
      setRightPanelOpen(!rightPanelOpen);
      if (!rightPanelOpen) setLeftPanelOpen(false);
    }
  }, [leftPanelOpen, rightPanelOpen]);

  const closePanels = useCallback(() => {
    setLeftPanelOpen(false);
    setRightPanelOpen(false);
  }, []);

  const handleClearCanvas = useCallback(() => {
    simulation?.clear();
  }, [simulation]);

  const handleRandomConfig = useCallback(() => {
    if (!simulation) return;
    const presets = getCuratedPresets();
    const randomPreset = presets[Math.floor(Math.random() * presets.length)];
    simulation.setGlobalConfig(randomPreset.global);
    for (const [effectId, effectConfig] of Object.entries(randomPreset.effects)) {
      simulation.setEffectConfig(effectId, effectConfig.config);
      if (effectConfig.enabled) simulation.enableEffect(effectId);
      else simulation.disableEffect(effectId);
    }
  }, [simulation]);

  const handleChaosMode = useCallback(() => {
    if (!simulation) return;
    const effects = effectRegistry.getAllEffects();
    const numEffects = Math.floor(Math.random() * 4) + 2;
    const shuffled = [...effects].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numEffects);

    for (const effect of effects) {
      simulation.disableEffect(effect.id);
    }

    for (const effect of selected) {
      simulation.enableEffect(effect.id);
      const defaultConfig = effect.defaultConfig || {};
      const randomized = {};
      for (const [key, value] of Object.entries(defaultConfig)) {
        if (typeof value === 'number') {
          randomized[key] = value * (0.5 + Math.random());
        } else if (typeof value === 'boolean') {
          randomized[key] = Math.random() > 0.5;
        } else {
          randomized[key] = value;
        }
      }
      simulation.setEffectConfig(effect.id, randomized);
    }
  }, [simulation]);

  const handleFullscreenToggle = useCallback(async () => {
    if (isFullscreenState) {
      await exitFullscreen();
    } else {
      await requestFullscreen(canvasContainerRef.current);
    }
  }, [isFullscreenState]);

  const handleSavePreset = useCallback(() => {
    if (!simulation) return;
    const name = prompt('Preset name:', 'My Preset');
    if (!name) return;

    const globalConfig = simulation.context.globalConfig;
    const effects = {};
    for (const [id, effect] of simulation.effects) {
      effects[id] = {
        enabled: simulation.enabledEffects.has(id),
        config: effect.config,
      };
    }

    const preset = {
      name: name.trim(),
      description: 'Custom preset',
      category: 'custom',
      global: globalConfig,
      effects,
    };

    const saved = addUserPreset(preset);
    if (saved) alert(`Preset "${name}" saved!`);
  }, [simulation]);

  const handlePause = useCallback(() => {
    if (!simulation) return;
    if (isPaused) simulation.resume(); else simulation.pause();
    setIsPaused(!isPaused);
  }, [simulation, isPaused]);

  const handleOpenGallery = useCallback(() => {
    setShowGallery(true);
  }, []);

  const handleCloseGallery = useCallback(() => {
    setShowGallery(false);
  }, []);

  const handleOpenTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const handleLoadPreset = useCallback((presetId) => {
    if (!simulation) return;
    const presets = getCuratedPresets();
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      simulation.setGlobalConfig(preset.global);
      for (const [effectId, effectConfig] of Object.entries(preset.effects)) {
        simulation.setEffectConfig(effectId, effectConfig.config);
        if (effectConfig.enabled) simulation.enableEffect(effectId);
        else simulation.disableEffect(effectId);
      }
    }
    setShowGallery(false);
  }, [simulation]);

  useEffect(() => {
    const unsubscribe = onFullscreenChange((fullscreen) => {
      setIsFullscreenState(fullscreen);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (reducedMotion && simulation) {
      simulation.setGlobalConfig({ reducedMotion: true });
    }
  }, [reducedMotion, simulation]);

  // Load config from URL on mount
  useEffect(() => {
    const urlConfig = getConfigFromUrl();
    if (urlConfig && simulation) {
      simulation.setGlobalConfig(urlConfig.global);
      for (const [effectId, effectConfig] of Object.entries(urlConfig.effects)) {
        simulation.setEffectConfig(effectId, effectConfig.config);
        if (effectConfig.enabled) simulation.enableEffect(effectId);
        else simulation.disableEffect(effectId);
      }
      clearConfigFromUrl();
      showToast('Configuration loaded from URL!');
    }
  }, []); // Only run once on mount

  // Initialize easter eggs
  useEffect(() => {
    if (!simulation) return;

    const cleanup = initEasterEggs((eggName, config) => {
      if (!simulation) return;
      simulation.setGlobalConfig(config.global);
      for (const [effectId, effectConfig] of Object.entries(config.effects)) {
        simulation.setEffectConfig(effectId, effectConfig.config);
        if (effectConfig.enabled) simulation.enableEffect(effectId);
        else simulation.disableEffect(effectId);
      }
    });

    return cleanup;
  }, [simulation]);

  // Initialize keyboard shortcuts
  useEffect(() => {
    if (!simulation) return;

    const callbacks = {
      pause: () => { if (isPaused) simulation.resume(); else simulation.pause(); setIsPaused(!isPaused); },
      'close-panels': () => { setLeftPanelOpen(false); setRightPanelOpen(false); setShowGallery(false); },
      random: () => handleRandomConfig(),
      clear: () => simulation.clear(),
      gallery: () => setShowGallery(true),
      tutorial: () => setShowTutorial(true),
      fullscreen: () => handleFullscreenToggle(),
      'save-preset': () => handleSavePreset(),
      'preset-1': () => loadPresetByIndex(0),
      'preset-2': () => loadPresetByIndex(1),
      'preset-3': () => loadPresetByIndex(2),
    };

    const cleanup = initKeyboardShortcuts(callbacks);
    return cleanup;
  }, [simulation, isPaused, handleRandomConfig, handleFullscreenToggle, handleSavePreset]);

  const loadPresetByIndex = useCallback((index) => {
    const presets = getCuratedPresets();
    if (presets[index] && simulation) {
      const preset = presets[index];
      simulation.setGlobalConfig(preset.global);
      for (const [effectId, effectConfig] of Object.entries(preset.effects)) {
        simulation.setEffectConfig(effectId, effectConfig.config);
        if (effectConfig.enabled) simulation.enableEffect(effectId);
        else simulation.disableEffect(effectId);
      }
    }
  }, [simulation]);

  return (
    <div
      ref={canvasContainerRef}
      className="app"
      role="application"
      aria-label="Cursor Playground"
    >
      <TopBar
        simulation={simulation}
        onTogglePanel={togglePanel}
        onClearCanvas={handleClearCanvas}
        onRandomConfig={handleRandomConfig}
        onChaosMode={handleChaosMode}
        onFullscreenToggle={handleFullscreenToggle}
        onOpenGallery={handleOpenGallery}
        onOpenTutorial={handleOpenTutorial}
        isFullscreen={isFullscreenState}
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
      />

      <main className="main-layout">
        <div className="canvas-wrapper">
          <CanvasHost
            onSimulationReady={handleSimulationReady}
            onPerformanceUpdate={setPerformance}
            className="canvas-host"
          />
        </div>

        <MobilePanels
          simulation={simulation}
          selectedEffectId={selectedEffectId}
          onSelectEffect={setSelectedEffectId}
          onSavePreset={handleSavePreset}
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          onClosePanels={closePanels}
        />

        <aside
          id="effect-library"
          className={clsx('panel effect-library desktop-panel', leftPanelOpen && 'open')}
          role="navigation"
          aria-label="Effect library"
        >
          <EffectLibrary
            simulation={simulation}
            selectedEffectId={selectedEffectId}
            onSelectEffect={setSelectedEffectId}
          />
        </aside>

        <aside
          id="control-panel"
          className={clsx('panel control-panel desktop-panel', rightPanelOpen && 'open')}
          role="complementary"
          aria-label="Controls"
        >
          <ControlPanel
            simulation={simulation}
            selectedEffectId={selectedEffectId}
            onSavePreset={handleSavePreset}
          />
        </aside>
      </main>

      <StatusBar
        performance={performance}
        simulation={simulation}
        onClear={handleClearCanvas}
        onPause={handlePause}
        isPaused={isPaused}
      />

      {showIntro && (
        <div className="intro-hint" role="dialog" aria-label="Welcome hint">
          <div className="intro-content">
            <p>Move your cursor. Click. Make a mess.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowIntro(false); markIntroDismissed(); }}>
              Got it
            </button>
          </div>
        </div>
      )}

      <Tutorial
        simulation={simulation}
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
        onComplete={() => setShowTutorial(false)}
      />

      <EffectGallery
        simulation={simulation}
        onSelectEffect={setSelectedEffectId}
        onLoadPreset={handleLoadPreset}
        onClose={handleCloseGallery}
        isOpen={showGallery}
      />
    </div>
  );
}

export default App;