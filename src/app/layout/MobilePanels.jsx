import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { EffectLibrary } from './EffectLibrary.jsx';
import { ControlPanel } from './ControlPanel.jsx';

export function MobilePanels({
  simulation,
  selectedEffectId,
  onSelectEffect,
  onSavePreset,
  leftPanelOpen,
  rightPanelOpen,
  onClosePanels,
}) {
  const [activePanel, setActivePanel] = useState(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (leftPanelOpen) setActivePanel('left');
    else if (rightPanelOpen) setActivePanel('right');
    else setActivePanel(null);
  }, [leftPanelOpen, rightPanelOpen]);

  const handleOverlayClick = () => {
    onClosePanels();
    setActivePanel(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClosePanels();
      setActivePanel(null);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div
        ref={overlayRef}
        className={clsx('drawer-overlay', activePanel && 'open')}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      <aside
        ref={leftRef}
        id="mobile-effect-library"
        className={clsx('drawer left', activePanel === 'left' && 'open')}
        role="dialog"
        aria-label="Effect Library"
        aria-modal={activePanel === 'left'}
      >
        <div className="drawer-header">
          <h2>Effects</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => { onClosePanels(); setActivePanel(null); }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="drawer-content">
          <EffectLibrary
            simulation={simulation}
            selectedEffectId={selectedEffectId}
            onSelectEffect={(id) => {
              onSelectEffect(id);
              setActivePanel('right');
            }}
          />
        </div>
      </aside>

      <aside
        ref={rightRef}
        id="mobile-control-panel"
        className={clsx('drawer right', activePanel === 'right' && 'open')}
        role="dialog"
        aria-label="Controls"
        aria-modal={activePanel === 'right'}
      >
        <div className="drawer-header">
          <h2>Controls</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => { onClosePanels(); setActivePanel(null); }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="drawer-content">
          <ControlPanel
            simulation={simulation}
            selectedEffectId={selectedEffectId}
            onSavePreset={onSavePreset}
          />
        </div>
      </aside>
    </>
  );
}

export default MobilePanels;