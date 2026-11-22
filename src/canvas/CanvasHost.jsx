import { useRef, useEffect, useCallback, useState } from 'react';
import { createSimulation } from './Simulation.js';
import { createRenderer } from './Renderer.js';
import { resizeCanvas } from '../utils/dom.js';
import { effectRegistry } from '../effects/registry.js';

export function CanvasHost({ onSimulationReady, onPerformanceUpdate, className = '' }) {
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const rendererRef = useRef(null);
  const initializedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [initError, setInitError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const resizeObserverRef = useRef(null);

  const initialize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('CanvasHost: canvas ref is null during initialization');
      return;
    }

    console.log('[CanvasHost] Initializing canvas...', { width: canvas.clientWidth, height: canvas.clientHeight });

    try {
      const { width, height, dpr } = resizeCanvas(canvas);
      console.log('[CanvasHost] Canvas sized:', { width, height, dpr });
      setDimensions({ width: width / dpr, height: height / dpr });

      const simulation = createSimulation(canvas, {
        maxParticles: 2000,
        maxDeltaTime: 50,
      });

      const renderer = createRenderer(canvas);
      renderer.resize(width, height, dpr);

      // Add renderer to simulation context for effects to use
      simulation.context.renderer = renderer;

      // Register all effects from the registry
      const effects = effectRegistry.getAll();
      console.log('[CanvasHost] Registering effects:', effects.map(e => e.id));
      for (const effect of effects) {
        simulation.addEffect(effect);
      }

      simulation.initialize(width, height, dpr);

      // Start the animation loop
      simulation.start();

      simulationRef.current = simulation;
      rendererRef.current = renderer;
      initializedRef.current = true;
      setIsInitializing(false);

      console.log('[CanvasHost] Initialization complete, calling onSimulationReady');
      if (onSimulationReady) {
        onSimulationReady(simulation, renderer);
      }
    } catch (e) {
      console.error('CanvasHost initialization failed:', e);
      setInitError(e);
      setIsInitializing(false);
      // Do not call onSimulationReady on failure - error state will be displayed
      // App.jsx will handle the null simulation state gracefully
    }
  }, [onSimulationReady]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !simulation || !renderer) return;

    try {
      const { width, height, dpr } = resizeCanvas(canvas);
      setDimensions({ width: width / dpr, height: height / dpr });

      renderer.resize(width, height, dpr);
      simulation.context.width = width;
      simulation.context.height = height;
      simulation.context.dpr = dpr;
      simulation.context.renderer = renderer;

      for (const effect of simulation.effects.values()) {
        if (effect.onResize) {
          try {
            effect.onResize(simulation.context, effect.config);
          } catch (e) {
            console.error(`Effect ${effect.id} onResize error:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Resize handler failed:', e);
    }
  }, []);

  useEffect(() => {
    // Prevent double-initialization from React StrictMode
    if (initializedRef.current) {
      console.log('[CanvasHost] Skipping initialization (already initialized)');
      return;
    }

    console.log('[CanvasHost] Starting initialization effect');
    initialize();

    const handlePerformanceUpdate = (state) => {
      if (onPerformanceUpdate) onPerformanceUpdate(state);
    };

    const unsubscribe = simulationRef.current?.performance.subscribe(handlePerformanceUpdate);

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      console.log('[CanvasHost] Cleanup');
      unsubscribe?.();
      window.removeEventListener('resize', handleResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      simulationRef.current?.destroy();
      simulationRef.current = null;
      rendererRef.current = null;
      initializedRef.current = false;
    };
  }, [initialize, handleResize, onPerformanceUpdate]);

  // Separate effect for ResizeObserver - only observe after canvas is mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    console.log('[CanvasHost] Attaching ResizeObserver');
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);
    resizeObserverRef.current = ro;

    return () => {
      ro.disconnect();
      resizeObserverRef.current = null;
    };
  }, [handleResize]);

  // Show error state if initialization failed (replaces entire canvas)
  if (initError) {
    return (
      <div
        className="canvas-error"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
          color: '#ff6b6b',
          fontFamily: 'system-ui, sans-serif',
          background: 'var(--canvas-bg)',
        }}
        role="alert"
      >
        <h3>Canvas Initialization Failed</h3>
        <pre style={{ overflow: 'auto', maxHeight: '200px', textAlign: 'left' }}>
          {initError.message}
          {initError.stack && `\n\n${initError.stack}`}
        </pre>
        <button
          onClick={() => { setInitError(null); initializedRef.current = false; setIsInitializing(true); }}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: 'var(--accent-primary)',
            color: 'var(--fg-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Always render the canvas; overlay loading spinner while initializing
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
        aria-label="Cursor Playground canvas"
      />
      {isInitializing && !initError && (
        <div
          className="canvas-loading"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            color: 'var(--fg-secondary)',
            fontFamily: 'var(--font-ui)',
            background: 'var(--canvas-bg)',
            zIndex: 10,
          }}
          role="status"
          aria-label="Initializing canvas"
        >
          <div
            className="loading-spinner"
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--border-primary)',
              borderTopColor: 'var(--accent-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
            aria-hidden="true"
          />
          <p style={{ fontSize: 'var(--fs-base)' }}>Initializing playground...</p>
        </div>
      )}
    </div>
  );
}

export default CanvasHost;