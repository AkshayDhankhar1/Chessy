import { Game, GameState } from './Game';

// ─── GameManager ──────────────────────────────────────────────────────────────
// Central registry for all active games using HashMap for O(1) lookup.
//
// Design Decision: We use two Maps for fast lookups:
//   1. games: Map<gameId, Game>         → O(1) game access by ID
//   2. playerGameMap: Map<playerId, gameId> → O(1) "find my game" lookup
//
// This avoids O(n) iteration when a player reconnects or makes a move.

export class GameManager {
  // HashMap<gameId, Game> — O(1) game lookup
  private games: Map<string, Game> = new Map();

  // HashMap<playerId, gameId> — O(1) reverse lookup (player → their active game)
  private playerGameMap: Map<string, string> = new Map();

  // ─── Create a new game ────────────────────────────────────────────────

  public createGame(
    whitePlayerId: string,
    whiteSocketId: string,
    blackPlayerId: string,
    blackSocketId: string
  ): Game {
    const game = new Game(whitePlayerId, whiteSocketId, blackPlayerId, blackSocketId);

    // Store in both maps for O(1) access from either direction
    this.games.set(game.gameId, game);
    this.playerGameMap.set(whitePlayerId, game.gameId);
    this.playerGameMap.set(blackPlayerId, game.gameId);

    console.log(`[GameManager] Game created: ${game.gameId} | White: ${whitePlayerId} | Black: ${blackPlayerId}`);
    return game;
  }

  // ─── O(1) Lookups ─────────────────────────────────────────────────────

  public getGame(gameId: string): Game | undefined {
    return this.games.get(gameId); // O(1)
  }

  public getGameByPlayerId(playerId: string): Game | undefined {
    const gameId = this.playerGameMap.get(playerId); // O(1)
    if (!gameId) return undefined;
    return this.games.get(gameId); // O(1)
  }

  public isPlayerInGame(playerId: string): boolean {
    return this.playerGameMap.has(playerId); // O(1)
  }

  // ─── Remove completed game ────────────────────────────────────────────

  public removeGame(gameId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    const state = game.getState();
    this.playerGameMap.delete(state.players.white.id);
    this.playerGameMap.delete(state.players.black.id);
    game.destroy();
    this.games.delete(gameId);

    console.log(`[GameManager] Game removed: ${gameId} | Active games: ${this.games.size}`);
  }

  // ─── Stats ────────────────────────────────────────────────────────────

  public getActiveGameCount(): number {
    return this.games.size;
  }

  public getAllGameStates(): GameState[] {
    return Array.from(this.games.values()).map((game) => game.getState());
  }

  // ─── Cleanup completed games (periodic) ───────────────────────────────

  public cleanupCompletedGames(maxAgeMs: number = 5 * 60 * 1000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [gameId, game] of this.games) {
      const state = game.getState();
      if (state.status === 'completed' && now - state.lastMoveAt > maxAgeMs) {
        this.removeGame(gameId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[GameManager] Cleaned up ${cleaned} completed games`);
    }
    return cleaned;
  }
}
