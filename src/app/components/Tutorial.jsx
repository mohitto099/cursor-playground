/**
 * Tutorial - interactive onboarding for first-time users
 */

import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Cursor Playground',
    content: 'Move your cursor. Click. Make a mess.',
    action: null,
    highlight: null,
  },
  {
    id: 'move',
    title: 'Move Your Cursor',
    content: 'Watch how particles follow your cursor. Try moving fast and slow.',
    action: 'move',
    highlight: 'canvas',
  },
  {
    id: 'click',
    title: 'Click for Bursts',
    content: 'Click anywhere on the canvas to create fireworks and explosions.',
    action: 'click',
    highlight: 'canvas',
  },
  {
    id: 'effects',
    title: 'Enable More Effects',
    content: 'Open the Effects panel (left) to enable magnetic fields, gravity, and more.',
    action: 'open-effects',
    highlight: 'effect-library',
  },
  {
    id: 'controls',
    title: 'Adjust Settings',
    content: 'Select an effect to see its controls in the right panel. Tweak parameters in real-time.',
    action: 'select-effect',
    highlight: 'control-panel',
  },
  {
    id: 'presets',
    title: 'Try Presets',
    content: 'Click "Presets" in the top bar for curated combinations like "Neon Trails" or "Firework Party".',
    action: 'open-presets',
    highlight: 'topbar-presets',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    content: 'Experiment, combine effects, and create something beautiful. Have fun!',
    action: null,
    highlight: null,
  },
];

export function Tutorial({ simulation, onComplete, isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useLocalStorage('cp-tutorial-completed', false);
  const [stepProgress, setStepProgress] = useState({});

  const step = TUTORIAL_STEPS[currentStep];

  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      onComplete?.();
    }
  }, [currentStep, setCompleted, onComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setCompleted(true);
    onClose?.();
  }, [setCompleted, onClose]);

  // Handle action completion
  useEffect(() => {
    if (!step.action) return;

    const handleAction = (action) => {
      if (action === step.action) {
        // Auto-advance for simple actions
        if (['move', 'click'].includes(action)) {
          setTimeout(nextStep, 500);
        }
      }
    };

    // Listen for actions from simulation or UI
    window.addEventListener('cp-tutorial-action', handleAction);
    return () => window.removeEventListener('cp-tutorial-action', handleAction);
  }, [step, nextStep]);

  if (!isOpen || completed) return null;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-backdrop" onClick={skipTutorial} />

      <div className="tutorial-panel">
        <div className="tutorial-header">
          <h2 id="tutorial-title">{step.title}</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={skipTutorial}
            aria-label="Skip tutorial"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tutorial-progress">
          <div className="progress-bar">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={clsx('progress-step', i <= currentStep && 'completed', i === currentStep && 'active')}
              />
            ))}
          </div>
          <span className="progress-text">{currentStep + 1} / {TUTORIAL_STEPS.length}</span>
        </div>

        <div className="tutorial-content">
          <p>{step.content}</p>
        </div>

        <div className="tutorial-footer">
          <button
            className="btn btn-secondary"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </button>

          {currentStep === TUTORIAL_STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={nextStep}>
              Get Started
            </button>
          ) : (
            <button className="btn btn-primary" onClick={nextStep}>
              Next
            </button>
          )}
        </div>
      </div>

      {step.highlight && (
        <div
          className="tutorial-highlight"
          data-highlight={step.highlight}
        />
      )}
    </div>
  );
}

export default Tutorial;