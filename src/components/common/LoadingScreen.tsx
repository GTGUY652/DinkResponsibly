import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'entering' | 'filling' | 'exiting'>('entering');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fillTimer = setTimeout(() => setPhase('filling'), 300);
    const exitTimer = setTimeout(() => setPhase('exiting'), 2500);
    const completeTimer = setTimeout(() => onComplete(), 3500);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = prev < 70 ? 1.8 : prev < 90 ? 0.9 : 0.4;
        return Math.min(prev + increment, 100);
      });
    }, 30);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div className={`loading-screen-container ${phase}`}>
      <div className="loading-ambient-glow" aria-hidden />
      <div className="loading-noise" aria-hidden />

      <div className="loading-content">
        <div className="loading-mark-wrap">
          <span className="loading-mark-icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
              <circle cx="14" cy="14" r="3" fill="currentColor" opacity="0.9" />
              <circle cx="9.5" cy="9" r="1.2" fill="currentColor" opacity="0.55" />
              <circle cx="18.2" cy="9.5" r="1.2" fill="currentColor" opacity="0.55" />
              <circle cx="9" cy="18.5" r="1.2" fill="currentColor" opacity="0.55" />
              <circle cx="19" cy="18" r="1.2" fill="currentColor" opacity="0.55" />
            </svg>
          </span>
          <span className="loading-mark-text">DR</span>
        </div>

        <h1 className="loading-wordmark" aria-label="DinkResponsibly">
          <span className="word-stroke" aria-hidden>DinkResponsibly</span>
          <span className="word-fill">DinkResponsibly</span>
        </h1>

        <p className="loading-tagline">Premium indoor courts • Cebu</p>

        <div className="loading-progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="loading-meta">
          <span className="loading-meta-label">Loading experience</span>
          <span className="loading-meta-value num-tabular">{String(Math.round(progress)).padStart(2, '0')}%</span>
        </div>
      </div>

      <div className="loading-footer">
        <span>Est. Cebu — 4 Pro Courts</span>
        <span className="dot">•</span>
        <span>1-Hour Sessions</span>
      </div>
    </div>
  );
};
