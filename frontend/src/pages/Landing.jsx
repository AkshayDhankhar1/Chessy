import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { getStats } from '../utils/api';
import './Landing.css';

export default function Landing() {
  const { connect, isConnected, playerInfo } = useSocket();
  const { joinQueue, leaveQueue, gameStatus } = useGame();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ activeGames: 0, onlinePlayers: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const s = await getStats();
        setStats(s);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      if (!isConnected) {
        // connect() now returns a Promise that resolves AFTER socket is connected
        await connect(username.trim());
      }
      // Socket is guaranteed connected now — joinQueue uses getSocket() 
      // from the module-level variable, so no stale closure issue
      joinQueue();
      setIsLoading(false);
    } catch (err) {
      setError('Failed to connect to server');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    leaveQueue();
  };

  if (gameStatus === 'queuing') {
    return (
      <div className="landing">
        <div className="matchmaking-screen">
          <div className="matchmaking-spinner">
            <div className="spinner-ring"></div>
            <span className="spinner-icon">♔</span>
          </div>
          <h2>Finding Opponent...</h2>
          <p className="matchmaking-sub">Searching for a worthy challenger</p>
          <div className="matchmaking-dots">
            <span></span><span></span><span></span>
          </div>
          <button className="btn btn-cancel" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="landing">
      {/* Animated background pieces */}
      <div className="bg-pieces">
        <span className="bg-piece" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>♜</span>
        <span className="bg-piece" style={{ top: '20%', right: '8%', animationDelay: '1s' }}>♞</span>
        <span className="bg-piece" style={{ bottom: '15%', left: '10%', animationDelay: '2s' }}>♝</span>
        <span className="bg-piece" style={{ bottom: '25%', right: '5%', animationDelay: '0.5s' }}>♛</span>
        <span className="bg-piece" style={{ top: '50%', left: '2%', animationDelay: '1.5s' }}>♟</span>
        <span className="bg-piece" style={{ top: '40%', right: '3%', animationDelay: '2.5s' }}>♚</span>
      </div>

      <div className="landing-content">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo">
            <span className="logo-icon">♔</span>
            <h1>Chessy</h1>
          </div>
          <p className="tagline">Real-Time Multiplayer Chess</p>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{stats.onlinePlayers}</span>
            <span className="stat-label">Online</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-value">{stats.activeGames}</span>
            <span className="stat-label">Games</span>
          </div>
        </div>

        {/* Play Card */}
        <div className="play-card">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePlay()}
              maxLength={20}
              className={error ? 'error' : ''}
              id="username-input"
            />
            {error && <span className="error-msg">{error}</span>}
          </div>
          <button
            className="btn btn-play"
            onClick={handlePlay}
            disabled={isLoading}
            id="play-button"
          >
            {isLoading ? (
              <span className="btn-loading"></span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Play Now
              </>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Sub-100ms Latency</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <span>Server Validated</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔄</span>
            <span>Auto Reconnect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
