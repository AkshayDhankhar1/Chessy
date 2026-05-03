import './GameOverModal.css';

export default function GameOverModal({ result, myColor, onPlayAgain, onLeave }) {
  if (!result) return null;

  let title, subtitle, icon;

  if (result.winner === null) {
    title = 'Draw!';
    icon = '🤝';
    const reasons = {
      stalemate: 'by Stalemate',
      draw_agreement: 'by Mutual Agreement',
      insufficient_material: 'Insufficient Material',
      threefold_repetition: 'Threefold Repetition',
      fifty_move_rule: 'Fifty Move Rule',
    };
    subtitle = reasons[result.reason] || 'Game drawn';
  } else if (result.winner === myColor) {
    title = 'Victory!';
    icon = '🏆';
    const reasons = {
      checkmate: 'by Checkmate',
      resignation: 'Opponent Resigned',
      timeout: 'Opponent Timed Out',
      abandonment: 'Opponent Abandoned',
    };
    subtitle = reasons[result.reason] || 'You won';
  } else {
    title = 'Defeat';
    icon = '😔';
    const reasons = {
      checkmate: 'by Checkmate',
      resignation: 'You Resigned',
      timeout: 'Time Ran Out',
      abandonment: 'Disconnected',
    };
    subtitle = reasons[result.reason] || 'You lost';
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <div className="game-over-icon">{icon}</div>
        <h2 className="game-over-title">{title}</h2>
        <p className="game-over-subtitle">{subtitle}</p>
        <div className="game-over-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
