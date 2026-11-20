import { clsx } from 'clsx';

export function StatusBar({
  performance,
  simulation,
  onClear,
  onPause,
  isPaused,
  className = '',
}) {
  const fps = performance?.fps || 60;
  const particleCount = performance?.particleCount || 0;
  const activeEffectCount = performance?.activeEffectCount || 0;
  const performanceState = performance?.performanceState || 'good';

  const getStateColor = () => {
    switch (performanceState) {
      case 'critical': return 'text-danger';
      case 'warn': return 'text-warn';
      default: return 'text-success';
    }
  };

  const getStateLabel = () => {
    switch (performanceState) {
      case 'critical': return 'Critical';
      case 'warn': return 'Warning';
      default: return 'Good';
    }
  };

  return (
    <footer id="status-bar" className={clsx('statusbar', className)} role="status" aria-live="polite">
      <div className="statusbar-left">
        <div className="status-item">
          <span className="status-label">FPS</span>
          <span className={clsx('status-value', getStateColor())}>{fps}</span>
        </div>
        <div className="status-divider" />
        <div className="status-item">
          <span className="status-label">Particles</span>
          <span className="status-value">{particleCount}</span>
        </div>
        <div className="status-divider" />
        <div className="status-item">
          <span className="status-label">Effects</span>
          <span className="status-value">{activeEffectCount}</span>
        </div>
      </div>

      <div className="statusbar-center">
        <div className={clsx('performance-indicator', performanceState)}>
          <span className="performance-dot" aria-hidden="true" />
          <span className="performance-text">{getStateLabel()}</span>
        </div>
      </div>

      <div className="statusbar-right">
        <button
          className={clsx('btn btn-ghost btn-sm', isPaused && 'active')}
          onClick={onPause}
          aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
          aria-pressed={isPaused}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isPaused ? (
              <polygon points="5 3 19 12 5 21 5 3" />
            ) : (
              <>
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </>
            )}
          </svg>
          <span className="btn-text-hidden">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          aria-label="Clear canvas"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <span className="btn-text-hidden">Clear</span>
        </button>
      </div>
    </footer>
  );
}

export default StatusBar;