import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'playing' | 'stopping'>('playing');

  useEffect(() => {
    // Play for 2.5 seconds, then go to 'stopping' phase
    const stopTimer = setTimeout(() => {
      setPhase('stopping');
    }, 2500);

    // After stopping phase finishes, call onComplete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(stopTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="loading-screen-container">
      <div className={`pickleball-animation ${phase}`}>
        <div className="paddle paddle-left"></div>
        <div className="paddle paddle-right"></div>
        <div className="ball"></div>
        {/* We can also add a progress circle or text if we want */}
      </div>
      <div className="loading-text">
        Loading DinkResponsibly...
      </div>
    </div>
  );
};
