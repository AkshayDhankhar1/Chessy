import { useState, useEffect, useRef } from 'react';
import './PlayerInfo.css';

function formatTime(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function PlayerInfo({ name, timeRemaining, isActive, color, captured }) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const intervalRef = useRef(null);

  useEffect(() => {
    setDisplayTime(timeRemaining);
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    if (isActive && timeRemaining > 0) {
      const startTime = Date.now();
      const startRemaining = timeRemaining;
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newTime = Math.max(0, startRemaining - elapsed);
        setDisplayTime(newTime);
      }, 100);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timeRemaining, isActive]);

  const isLow = displayTime < 60000; // less than 1 minute
  const isCritical = displayTime < 10000; // less than 10 seconds

  return (
    <div className={`player-info ${isActive ? 'active' : ''}`}>
      <div className="player-identity">
        <div className={`player-avatar ${color}`}>
          {color === 'w' ? '♔' : '♚'}
        </div>
        <div className="player-details">
          <span className="player-name">{name}</span>
          {captured && captured.length > 0 && (
            <div className="captured-pieces">
              {captured.map((p, i) => (
                <span key={i} className="captured-piece">{p}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={`timer ${isLow ? 'low' : ''} ${isCritical ? 'critical' : ''} ${isActive ? 'ticking' : ''}`}>
        <span className="mono">{formatTime(displayTime)}</span>
      </div>
    </div>
  );
}
