import { useMemo } from 'react';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import ChessBoard from '../components/ChessBoard';
import PlayerInfo from '../components/PlayerInfo';
import MoveHistory from '../components/MoveHistory';
import GameOverModal from '../components/GameOverModal';
import './Game.css';

export default function GamePage() {
  const {
    gameState, myColor, opponentName, gameStatus, gameResult,
    opponentDisconnected, drawOffered,
    makeMove, resign, offerDraw, acceptDraw, declineDraw,
    joinQueue, leaveGame,
  } = useGame();
  const { playerInfo } = useSocket();

  const isMyTurn = gameState?.turn === myColor;

  // Determine last move from move history
  const lastMove = useMemo(() => {
    if (!gameState || gameState.moveHistory.length === 0) return null;
    // We don't have from/to in SAN, so skip last move highlight for now
    return null;
  }, [gameState]);

  const isCheck = useMemo(() => {
    if (!gameState) return false;
    try {
      const c = new Chess(gameState.fen);
      return c.isCheck();
    } catch { return false; }
  }, [gameState?.fen]);

  // Get opponent and my info
  const myInfo = gameState?.players[myColor === 'w' ? 'white' : 'black'];
  const oppInfo = gameState?.players[myColor === 'w' ? 'black' : 'white'];

  const handlePlayAgain = () => {
    leaveGame();
    setTimeout(() => joinQueue(), 300);
  };

  return (
    <div className="game-page">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <span className="header-logo">♔</span>
          <span className="header-title">Chessy</span>
        </div>
        <div className="header-center">
          {opponentDisconnected && (
            <div className="disconnect-banner">
              <span className="disconnect-dot"></span>
              Opponent disconnected — waiting for reconnect...
            </div>
          )}
          {drawOffered && (
            <div className="draw-banner">
              <span>Draw offered!</span>
              <button className="btn-small btn-accept" onClick={acceptDraw}>Accept</button>
              <button className="btn-small btn-decline" onClick={declineDraw}>Decline</button>
            </div>
          )}
        </div>
        <div className="header-right">
          <span className={`turn-indicator ${isMyTurn ? 'my-turn' : ''}`}>
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </span>
        </div>
      </header>

      {/* Game Area */}
      <main className="game-area">
        {/* Opponent info (top) */}
        <div className="board-player top">
          <PlayerInfo
            name={opponentName || 'Opponent'}
            timeRemaining={oppInfo?.timeRemaining || 600000}
            isActive={!isMyTurn && gameStatus === 'playing'}
            color={myColor === 'w' ? 'b' : 'w'}
          />
        </div>

        <div className="game-layout">
          {/* Chess Board */}
          <div className="board-section">
            <ChessBoard
              fen={gameState?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
              myColor={myColor || 'w'}
              onMove={makeMove}
              isMyTurn={isMyTurn}
              lastMove={lastMove}
              isCheck={isCheck}
            />
          </div>

          {/* Side Panel */}
          <div className="side-panel">
            <MoveHistory moves={gameState?.moveHistory || []} />

            {/* Game Controls */}
            <div className="game-controls">
              <button className="ctrl-btn" onClick={offerDraw} title="Offer Draw">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Draw
              </button>
              <button className="ctrl-btn danger" onClick={resign} title="Resign">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Resign
              </button>
            </div>
          </div>
        </div>

        {/* My info (bottom) */}
        <div className="board-player bottom">
          <PlayerInfo
            name={playerInfo?.username || 'You'}
            timeRemaining={myInfo?.timeRemaining || 600000}
            isActive={isMyTurn && gameStatus === 'playing'}
            color={myColor || 'w'}
          />
        </div>
      </main>

      {/* Game Over Modal */}
      {gameStatus === 'ended' && (
        <GameOverModal
          result={gameResult}
          myColor={myColor}
          onPlayAgain={handlePlayAgain}
          onLeave={leaveGame}
        />
      )}
    </div>
  );
}
