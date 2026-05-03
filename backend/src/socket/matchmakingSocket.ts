import { Server, Socket } from 'socket.io';
import { GameManager } from '../engine/GameManager';
import { MatchmakingQueue } from '../matchmaking/MatchmakingQueue';
import { SessionManager } from '../session/SessionManager';

export function setupMatchmaking(
  io: Server,
  gameManager: GameManager,
  matchmakingQueue: MatchmakingQueue,
  sessionManager: SessionManager
): void {
  // Event-driven: when matchmaking finds a pair, create the game
  matchmakingQueue.on('match_found', ({ white, black }) => {
    const game = gameManager.createGame(
      white.playerId, white.socketId,
      black.playerId, black.socketId
    );

    // Update session records
    sessionManager.setGameId(white.playerId, game.gameId);
    sessionManager.setGameId(black.playerId, game.gameId);

    // Join both sockets to a room for broadcast
    const whiteSocket = io.sockets.sockets.get(white.socketId);
    const blackSocket = io.sockets.sockets.get(black.socketId);

    if (whiteSocket) whiteSocket.join(game.gameId);
    if (blackSocket) blackSocket.join(game.gameId);

    const state = game.getState();

    // Notify both players
    if (whiteSocket) {
      whiteSocket.emit('match:found', {
        gameId: game.gameId,
        color: 'w',
        opponent: sessionManager.getSession(black.playerId)?.username || 'Opponent',
        state,
      });
    }
    if (blackSocket) {
      blackSocket.emit('match:found', {
        gameId: game.gameId,
        color: 'b',
        opponent: sessionManager.getSession(white.playerId)?.username || 'Opponent',
        state,
      });
    }
  });
}

export function registerMatchmakingSocket(
  socket: Socket,
  matchmakingQueue: MatchmakingQueue,
  gameManager: GameManager
): void {
  const playerId = (socket.data as any).playerId as string;

  socket.on('matchmaking:join', () => {
    if (gameManager.isPlayerInGame(playerId)) {
      return socket.emit('matchmaking:error', { message: 'Already in a game' });
    }
    const joined = matchmakingQueue.join(playerId, socket.id);
    if (joined) {
      socket.emit('matchmaking:joined', { queueSize: matchmakingQueue.getQueueSize() });
    }
  });

  socket.on('matchmaking:leave', () => {
    matchmakingQueue.leave(playerId);
    socket.emit('matchmaking:left');
  });
}
