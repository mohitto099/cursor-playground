import { useRef, useEffect, useCallback, useState } from 'react';
import { createSimulation } from './Simulation.js';
import { createRenderer } from './Renderer.js';
import { resizeCanvas, getDevicePixelRatio } from '../utils/dom.js';

export function CanvasHost({ onSimulationReady, onPerformanceUpdate, className = '' }) {
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const rendererRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const resizeObserverRef = useRef(null);

  const initialize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height, dpr } = resizeCanvas(canvas);
    setDimensions({ width: width / dpr, height: height / dpr });

    const simulation = createSimulation(canvas, {
      maxParticles: 2000,
      maxDeltaTime: 50,
    });

    const renderer = createRenderer(canvas);
    renderer.resize(width, height, dpr);

    simulation.initialize(width, height, dpr);

    simulationRef.current = simulation;
    rendererRef.current = renderer;

    if (onSimulationReady) {
      onSimulationReady(simulation, renderer);
    }
  }, [onSimulationReady]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const simulation = simulationRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !simulation || !renderer) return;

    const { width, height, dpr } = resizeCanvas(canvas);
    setDimensions({ width: width / dpr, height: height / dpr });

    renderer.resize(width, height, dpr);
    simulation.context.width = width;
    simulation.context.height = height;
    simulation.context.dpr = dpr;

    for (const effect of simulation.effects.values()) {
      if (effect.onResize) {
        try {
          effect.onResize(simulation.context, effect.config);
        } catch (e) {
          console.error(`Effect ${effect.id} onResize error:`, e);
        }
      }
    }
  }, []);

  useEffect(() => {
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
    };
  }, [initialize, handleResize, onPerformanceUpdate]);

  const getSimulation = useCallback(() => simulationRef.current, []);
  const getRenderer = useCallback(() => rendererRef.current, []);

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