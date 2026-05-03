import { Chess, Square, Move } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerInfo {
  id: string;
  socketId: string;
  color: 'w' | 'b';
  connected: boolean;
  timeRemaining: number; // milliseconds
}

export interface GameState {
  gameId: string;
  fen: string;
  turn: 'w' | 'b';
  moveHistory: string[];
  players: { white: PlayerInfo; black: PlayerInfo };
  status: GameStatus;
  result: GameResult | null;
  createdAt: number;
  lastMoveAt: number;
  drawOffer: 'w' | 'b' | null;
}

export type GameStatus = 'waiting' | 'active' | 'completed';
export type GameResult =
  | { winner: 'w' | 'b'; reason: 'checkmate' | 'resignation' | 'timeout' | 'abandonment' }
  | { winner: null; reason: 'stalemate' | 'draw_agreement' | 'insufficient_material' | 'threefold_repetition' | 'fifty_move_rule' };

export interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
}

// ─── Game Class (OOP Wrapper around chess.js) ─────────────────────────────────
// Each Game instance encapsulates one chess.js engine instance.
// The server is authoritative: clients send move intents, 
// the Game validates via chess.js and returns the result.

export class Game {
  public readonly gameId: string;
  private engine: Chess; // chess.js instance — handles all rule validation
  private moveHistory: string[] = [];
  private players: { white: PlayerInfo; black: PlayerInfo };
  private status: GameStatus = 'active';
  private result: GameResult | null = null;
  private createdAt: number;
  private lastMoveAt: number;
  private drawOffer: 'w' | 'b' | null = null;

  // Timer tracking
  private timerInterval: NodeJS.Timeout | null = null;
  private readonly initialTime: number = 10 * 60 * 1000; // 10 minutes per player

  constructor(
    whitePlayerId: string,
    whiteSocketId: string,
    blackPlayerId: string,
    blackSocketId: string,
    gameId?: string
  ) {
    this.gameId = gameId || uuidv4();
    this.engine = new Chess(); // Initializes standard starting position
    this.createdAt = Date.now();
    this.lastMoveAt = Date.now();

    this.players = {
      white: {
        id: whitePlayerId,
        socketId: whiteSocketId,
        color: 'w',
        connected: true,
        timeRemaining: this.initialTime,
      },
      black: {
        id: blackPlayerId,
        socketId: blackSocketId,
        color: 'b',
        connected: true,
        timeRemaining: this.initialTime,
      },
    };

    this.startTimer();
  }

  // ─── Move Validation & Execution ────────────────────────────────────────
  // chess.js internally uses hash maps for legal move generation (O(1) lookup).
  // We delegate all validation to chess.js — it covers 100% of FIDE rules:
  //   ✓ Legal piece movement    ✓ Castling (kingside/queenside)
  //   ✓ En passant              ✓ Pawn promotion
  //   ✓ Check detection         ✓ Checkmate detection
  //   ✓ Stalemate detection     ✓ Insufficient material
  //   ✓ Threefold repetition    ✓ Fifty-move rule

  public makeMove(playerId: string, move: MovePayload): { success: boolean; error?: string; state?: GameState } {
    // 1. Verify game is active
    if (this.status !== 'active') {
      return { success: false, error: 'Game is not active' };
    }

    // 2. Verify it's this player's turn
    const playerColor = this.getPlayerColor(playerId);
    if (!playerColor) {
      return { success: false, error: 'Player not in this game' };
    }
    if (this.engine.turn() !== playerColor) {
      return { success: false, error: 'Not your turn' };
    }

    // 3. Attempt the move via chess.js (server-authoritative validation)
    let result: Move | null;
    try {
      result = this.engine.move({
        from: move.from as Square,
        to: move.to as Square,
        promotion: (move.promotion as 'q' | 'r' | 'b' | 'n') || undefined,
      });
    } catch {
      return { success: false, error: 'Invalid move' };
    }

    if (!result) {
      return { success: false, error: 'Invalid move' };
    }

    // 4. Record move and update timers
    this.moveHistory.push(result.san);
    this.updateTimerOnMove();
    this.lastMoveAt = Date.now();
    this.drawOffer = null; // Clear any pending draw offer on new move

    // 5. Check for game-ending conditions (chess.js handles all detection)
    this.checkGameEnd();

    return { success: true, state: this.getState() };
  }

  // ─── Legal Moves (for client-side highlighting) ─────────────────────────
  public getLegalMoves(square: string): string[] {
    const moves = this.engine.moves({ square: square as Square, verbose: true });
    return moves.map((m) => m.to);
  }

  // ─── Game End Detection ──────────────────────────────────────────────────
  // Delegates to chess.js which checks all conditions automatically

  private checkGameEnd(): void {
    if (this.engine.isCheckmate()) {
      // The player whose turn it is has been checkmated
      const loser = this.engine.turn();
      const winner = loser === 'w' ? 'b' : 'w';
      this.endGame({ winner, reason: 'checkmate' });
    } else if (this.engine.isStalemate()) {
      this.endGame({ winner: null, reason: 'stalemate' });
    } else if (this.engine.isInsufficientMaterial()) {
      this.endGame({ winner: null, reason: 'insufficient_material' });
    } else if (this.engine.isThreefoldRepetition()) {
      this.endGame({ winner: null, reason: 'threefold_repetition' });
    } else if (this.engine.isDraw()) {
      this.endGame({ winner: null, reason: 'fifty_move_rule' });
    }
  }

  // ─── Resignation ────────────────────────────────────────────────────────

  public resign(playerId: string): GameState | null {
    const color = this.getPlayerColor(playerId);
    if (!color || this.status !== 'active') return null;
    const winner = color === 'w' ? 'b' : 'w';
    this.endGame({ winner, reason: 'resignation' });
    return this.getState();
  }

  // ─── Draw Offer System ──────────────────────────────────────────────────

  public offerDraw(playerId: string): { offered: boolean; state?: GameState } {
    const color = this.getPlayerColor(playerId);
    if (!color || this.status !== 'active') return { offered: false };
    this.drawOffer = color;
    return { offered: true, state: this.getState() };
  }

  public acceptDraw(playerId: string): GameState | null {
    const color = this.getPlayerColor(playerId);
    if (!color || this.status !== 'active' || !this.drawOffer) return null;
    if (this.drawOffer === color) return null; // Can't accept own offer
    this.endGame({ winner: null, reason: 'draw_agreement' });
    return this.getState();
  }

  public declineDraw(playerId: string): boolean {
    const color = this.getPlayerColor(playerId);
    if (!color || this.drawOffer === color) return false;
    this.drawOffer = null;
    return true;
  }

  // ─── Timer Management ───────────────────────────────────────────────────

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.status !== 'active') {
        this.stopTimer();
        return;
      }

      const currentTurn = this.engine.turn();
      const player = currentTurn === 'w' ? this.players.white : this.players.black;
      player.timeRemaining -= 1000;

      if (player.timeRemaining <= 0) {
        player.timeRemaining = 0;
        const winner = currentTurn === 'w' ? 'b' : 'w';
        this.endGame({ winner, reason: 'timeout' });
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerOnMove(): void {
    // Precise timer update based on actual elapsed time
    const elapsed = Date.now() - this.lastMoveAt;
    const currentTurn = this.engine.turn() === 'w' ? 'b' : 'w'; // Previous turn's player
    const player = currentTurn === 'w' ? this.players.white : this.players.black;
    player.timeRemaining = Math.max(0, player.timeRemaining - elapsed + 1000); // +1s for timer tick correction
  }

  // ─── Connection Management (Session Recovery) ──────────────────────────

  public setPlayerConnected(playerId: string, connected: boolean, newSocketId?: string): void {
    if (this.players.white.id === playerId) {
      this.players.white.connected = connected;
      if (newSocketId) this.players.white.socketId = newSocketId;
    } else if (this.players.black.id === playerId) {
      this.players.black.connected = connected;
      if (newSocketId) this.players.black.socketId = newSocketId;
    }
  }

  public handleAbandonment(playerId: string): GameState | null {
    const color = this.getPlayerColor(playerId);
    if (!color || this.status !== 'active') return null;
    const winner = color === 'w' ? 'b' : 'w';
    this.endGame({ winner, reason: 'abandonment' });
    return this.getState();
  }

  // ─── Utility Methods ───────────────────────────────────────────────────

  private getPlayerColor(playerId: string): 'w' | 'b' | null {
    if (this.players.white.id === playerId) return 'w';
    if (this.players.black.id === playerId) return 'b';
    return null;
  }

  private endGame(result: GameResult): void {
    this.status = 'completed';
    this.result = result;
    this.stopTimer();
  }

  public getPlayerBySocketId(socketId: string): PlayerInfo | null {
    if (this.players.white.socketId === socketId) return this.players.white;
    if (this.players.black.socketId === socketId) return this.players.black;
    return null;
  }

  public getOpponentSocketId(playerId: string): string | null {
    if (this.players.white.id === playerId) return this.players.black.socketId;
    if (this.players.black.id === playerId) return this.players.white.socketId;
    return null;
  }

  public isPlayerInGame(playerId: string): boolean {
    return this.players.white.id === playerId || this.players.black.id === playerId;
  }

  public isInCheck(): boolean {
    return this.engine.isCheck();
  }

  // ─── Serialized Game State (sent to clients) ───────────────────────────
  // This is the deterministic snapshot that keeps both clients in sync

  public getState(): GameState {
    return {
      gameId: this.gameId,
      fen: this.engine.fen(), // Deterministic board representation
      turn: this.engine.turn() as 'w' | 'b',
      moveHistory: [...this.moveHistory],
      players: {
        white: { ...this.players.white },
        black: { ...this.players.black },
      },
      status: this.status,
      result: this.result,
      createdAt: this.createdAt,
      lastMoveAt: this.lastMoveAt,
      drawOffer: this.drawOffer,
    };
  }

  public destroy(): void {
    this.stopTimer();
  }
}
