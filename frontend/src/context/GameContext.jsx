import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { getSocket } from '../utils/socket';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { socket, playerInfo } = useSocket();
  const [gameState, setGameState] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [opponentName, setOpponentName] = useState('');
  const [gameStatus, setGameStatus] = useState('idle'); // idle, queuing, playing, ended
  const [gameResult, setGameResult] = useState(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);

  // Track which socket instance has listeners to avoid duplicates
  const attachedSocketRef = useRef(null);

  const attachListeners = useCallback((sock) => {
    if (!sock) return;
    // If already attached to this exact socket instance, skip
    if (attachedSocketRef.current === sock) return;

    // Detach from old socket if any
    if (attachedSocketRef.current) {
      const old = attachedSocketRef.current;
      old.off('match:found');
      old.off('game:state');
      old.off('game:over');
      old.off('game:reconnected');
      old.off('game:opponent_disconnected');
      old.off('game:opponent_reconnected');
      old.off('game:draw_offered');
      old.off('game:draw_declined');
      old.off('matchmaking:joined');
      old.off('matchmaking:left');
    }

    attachedSocketRef.current = sock;

    sock.on('match:found', (data) => {
      setGameState(data.state);
      setMyColor(data.color);
      setOpponentName(data.opponent);
      setGameStatus('playing');
      setGameResult(null);
      setOpponentDisconnected(false);
      setDrawOffered(false);
    });

    sock.on('game:state', (state) => {
      setGameState(state);
    });

    sock.on('game:over', ({ result, finalState }) => {
      setGameState(finalState);
      setGameResult(result);
      setGameStatus('ended');
    });

    sock.on('game:reconnected', (data) => {
      setGameState(data.state);
      setMyColor(data.color);
      setGameStatus('playing');
      setOpponentDisconnected(false);
    });

    sock.on('game:opponent_disconnected', () => setOpponentDisconnected(true));
    sock.on('game:opponent_reconnected', () => setOpponentDisconnected(false));

    sock.on('game:draw_offered', () => setDrawOffered(true));
    sock.on('game:draw_declined', () => setDrawOffered(false));

    sock.on('matchmaking:joined', () => setGameStatus('queuing'));
    sock.on('matchmaking:left', () => setGameStatus('idle'));
  }, []);

  // Also attach when socket state updates (for re-renders / reconnections)
  useEffect(() => {
    if (socket) attachListeners(socket);
  }, [socket, attachListeners]);

  // ─── All emit functions use getSocket() to avoid stale closures ─────────

  const makeMove = useCallback((from, to, promotion) => {
    const s = getSocket();
    if (!s || gameStatus !== 'playing') return;
    s.emit('game:move', { from, to, promotion });
  }, [gameStatus]);

  const joinQueue = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    // Attach listeners on the live socket immediately (before React state propagates)
    attachListeners(s);
    s.emit('matchmaking:join');
  }, [attachListeners]);

  const leaveQueue = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('matchmaking:leave');
    setGameStatus('idle');
  }, []);

  const resign = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:resign');
  }, []);

  const offerDraw = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:offer_draw');
  }, []);

  const acceptDraw = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:accept_draw');
    setDrawOffered(false);
  }, []);

  const declineDraw = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:decline_draw');
    setDrawOffered(false);
  }, []);

  const leaveGame = useCallback(() => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:leave');
    setGameState(null);
    setMyColor(null);
    setOpponentName('');
    setGameStatus('idle');
    setGameResult(null);
    setDrawOffered(false);
  }, []);

  const requestLegalMoves = useCallback((square) => {
    const s = getSocket();
    if (!s) return;
    s.emit('game:legal_moves', square);
  }, []);

  return (
    <GameContext.Provider value={{
      gameState, myColor, opponentName, gameStatus, gameResult,
      opponentDisconnected, drawOffered,
      makeMove, joinQueue, leaveQueue, resign,
      offerDraw, acceptDraw, declineDraw, leaveGame,
      requestLegalMoves, playerInfo,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
