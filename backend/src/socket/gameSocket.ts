import { Server, Socket } from 'socket.io';
import { GameManager } from '../engine/GameManager';
import { SessionManager } from '../session/SessionManager';
import { MovePayload } from '../engine/Game';

export function registerGameSocket(
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  sessionManager: SessionManager
): void {
  const playerId = (socket.data as any).playerId as string;

  // ─── Make Move ──────────────────────────────────────────────────────
  socket.on('game:move', (move: MovePayload) => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return socket.emit('game:error', { message: 'No active game' });

    const result = game.makeMove(playerId, move);
    if (!result.success) {
      return socket.emit('game:error', { message: result.error });
    }

    // Broadcast updated state to both players
    const state = result.state!;
    io.to(game.gameId).emit('game:state', state);

    // If game ended, notify both
    if (state.status === 'completed') {
      io.to(game.gameId).emit('game:over', {
        result: state.result,
        finalState: state,
      });
    }
  });

  // ─── Get Legal Moves (for highlighting) ─────────────────────────────
  socket.on('game:legal_moves', (square: string) => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return;
    const moves = game.getLegalMoves(square);
    socket.emit('game:legal_moves_result', { square, moves });
  });

  // ─── Resign ─────────────────────────────────────────────────────────
  socket.on('game:resign', () => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return;

    const state = game.resign(playerId);
    if (state) {
      io.to(game.gameId).emit('game:state', state);
      io.to(game.gameId).emit('game:over', {
        result: state.result,
        finalState: state,
      });
    }
  });

  // ─── Draw Offer ─────────────────────────────────────────────────────
  socket.on('game:offer_draw', () => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return;

    const result = game.offerDraw(playerId);
    if (result.offered) {
      const opponentSocketId = game.getOpponentSocketId(playerId);
      if (opponentSocketId) {
        io.to(opponentSocketId).emit('game:draw_offered');
      }
    }
  });

  socket.on('game:accept_draw', () => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return;

    const state = game.acceptDraw(playerId);
    if (state) {
      io.to(game.gameId).emit('game:state', state);
      io.to(game.gameId).emit('game:over', {
        result: state.result,
        finalState: state,
      });
    }
  });

  socket.on('game:decline_draw', () => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return;
    game.declineDraw(playerId);
    const opponentSocketId = game.getOpponentSocketId(playerId);
    if (opponentSocketId) {
      io.to(opponentSocketId).emit('game:draw_declined');
    }
  });

  // ─── Request current game state ─────────────────────────────────────
  socket.on('game:request_state', () => {
    const game = gameManager.getGameByPlayerId(playerId);
    if (!game) return socket.emit('game:no_game');
    socket.emit('game:state', game.getState());
  });
}
