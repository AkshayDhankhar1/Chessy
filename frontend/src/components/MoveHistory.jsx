import './MoveHistory.css';

export default function MoveHistory({ moves }) {
  if (!moves || moves.length === 0) {
    return (
      <div className="move-history">
        <div className="move-history-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Moves</span>
        </div>
        <div className="move-history-empty">
          <p>No moves yet</p>
          <p className="sub">Make the first move!</p>
        </div>
      </div>
    );
  }

  // Group moves into pairs (white, black)
  const pairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
    });
  }

  return (
    <div className="move-history">
      <div className="move-history-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Moves</span>
        <span className="move-count">{moves.length}</span>
      </div>
      <div className="move-list">
        {pairs.map((pair) => (
          <div key={pair.number} className="move-pair">
            <span className="move-number">{pair.number}.</span>
            <span className="move white-move mono">{pair.white}</span>
            {pair.black && <span className="move black-move mono">{pair.black}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
