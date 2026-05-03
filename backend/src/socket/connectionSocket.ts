import { Server, Socket } from 'socket.io';
import { GameManager } from '../engine/GameManager';
import { SessionManager } from '../session/SessionManager';
import { MatchmakingQueue } from '../matchmaking/MatchmakingQueue';
import { verifyToken } from '../auth/jwt';
import { registerGameSocket } from './gameSocket';
import { registerMatchmakingSocket } from './matchmakingSocket';

export function setupSocketHandlers(
  io: Server,
  gameManager: GameManager,
  sessionManager: SessionManager,
  matchmakingQueue: MatchmakingQueue
): void {
  // ─── JWT Auth Middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentication required'));

    const payload = verifyToken(token);
    if (!payload) return next(new Error('Invalid token'));

    socket.data.playerId = payload.playerId;
    socket.data.username = payload.username;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const playerId = socket.data.playerId as string;
    const username = socket.data.username as string;

    console.log(`[Socket] Connected: ${username} (${playerId}) | Socket: ${socket.id}`);

    // ─── Session Recovery ───────────────────────────────────────────
    const existingSession = sessionManager.getSession(playerId);
    if (existingSession && !existingSession.connected) {
      // Player is reconnecting — restore session
      const session = sessionManager.handleReconnect(playerId, socket.id);
      if (session && session.gameId) {
        const game = gameManager.getGame(session.gameId);
        if (game) {
          game.setPlayerConnected(playerId, true, socket.id);
          socket.join(session.gameId);
          socket.emit('game:reconnected', {
            state: game.getState(),
            color: game.getState().players.white.id === playerId ? 'w' : 'b',
          });
          // Notify opponent
          const opponentSocketId = game.getOpponentSocketId(playerId);
          if (opponentSocketId) {
            io.to(opponentSocketId).emit('game:opponent_reconnected');
          }
        }
      }
    } else {
      sessionManager.createSession(playerId, socket.id, username);
    }

    // Register all event handlers
    registerGameSocket(io, socket, gameManager, sessionManager);
    registerMatchmakingSocket(socket, matchmakingQueue, gameManager);

    // ─── Game leave/cleanup ─────────────────────────────────────────
    socket.on('game:leave', () => {
      const game = gameManager.getGameByPlayerId(playerId);
      if (game) {
        const state = game.getState();
        if (state.status === 'completed') {
          socket.leave(game.gameId);
          sessionManager.setGameId(playerId, null);
          // Clean up if both players left
          const opponentId = state.players.white.id === playerId
            ? state.players.black.id
            : state.players.white.id;
          const opponentSession = sessionManager.getSession(opponentId);
          if (!opponentSession || opponentSession.gameId !== game.gameId) {
            gameManager.removeGame(game.gameId);
          }
        }
      }
    });

    // ─── Disconnect Handling ────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${username} (${playerId})`);

      matchmakingQueue.handleDisconnect(playerId);

      sessionManager.handleDisconnect(socket.id, (pId, gameId) => {
        // Grace period expired — forfeit
        const game = gameManager.getGame(gameId);
        if (game) {
          const state = game.handleAbandonment(pId);
          if (state) {
            io.to(gameId).emit('game:state', state);
            io.to(gameId).emit('game:over', {
              result: state.result,
              finalState: state,
            });
          }
        }
      });

      // Notify opponent of disconnect
      const game = gameManager.getGameByPlayerId(playerId);
      if (game) {
        game.setPlayerConnected(playerId, false);
        const opponentSocketId = game.getOpponentSocketId(playerId);
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('game:opponent_disconnected');
        }
      }
    });

    // ─── Stats endpoint ─────────────────────────────────────────────
    socket.on('stats:request', () => {
      socket.emit('stats:response', {
        activeGames: gameManager.getActiveGameCount(),
        onlinePlayers: sessionManager.getActiveSessionCount(),
        queueSize: matchmakingQueue.getQueueSize(),
      });
    });
  });
}
