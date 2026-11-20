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
  const resizeObserverRef = useRef(null);

  const initialize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const { width, height, dpr } = resizeCanvas(canvas);
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
      for (const effect of effectRegistry.getAllEffects()) {
        simulation.addEffect(effect);
      }

      simulation.initialize(width, height, dpr);

      // Start the animation loop
      simulation.start();

      simulationRef.current = simulation;
      rendererRef.current = renderer;
      initializedRef.current = true;

      if (onSimulationReady) {
        onSimulationReady(simulation, renderer);
      }
    } catch (e) {
      console.error('CanvasHost initialization failed:', e);
      setInitError(e);
      if (onSimulationReady) {
        onSimulationReady(null, null);
      }
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
    if (initializedRef.current) return;

    initialize();

    const handlePerformanceUpdate = (state) => {
      if (onPerformanceUpdate) onPerformanceUpdate(state);
    };

    const unsubscribe = simulationRef.current?.performance.subscribe(handlePerformanceUpdate);

    const ro = new ResizeObserver(handleResize);
    ro.observe(canvasRef.current);
    resizeObserverRef.current = ro;

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      unsubscribe?.();
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      simulationRef.current?.destroy();
      simulationRef.current = null;
      rendererRef.current = null;
      initializedRef.current = false;
    };
  }, [initialize, handleResize, onPerformanceUpdate]);

  // Show error state if initialization failed
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
        }}
        role="alert"
      >
        <h3>Canvas Initialization Failed</h3>
        <pre style={{ overflow: 'auto', maxHeight: '200px', textAlign: 'left' }}>
          {initError.message}
          {initError.stack && `\n\n${initError.stack}`}
        </pre>
        <button
          onClick={() => { setInitError(null); initializedRef.current = false; }}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#00ffc8',
            color: '#0a0a0f',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
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
  );
}

export default CanvasHost;