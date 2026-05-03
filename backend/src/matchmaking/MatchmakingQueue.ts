import { EventEmitter } from 'events';

// ─── MatchmakingQueue ─────────────────────────────────────────────────────────
// Event-driven matchmaking with O(1) player pairing.
//
// Architecture:
//   - Uses a FIFO queue (array) for ordering
//   - Companion Set for O(1) existence checks (prevent duplicate joins)
//   - When queue.length >= 2, immediately pops two players and emits 'match_found'
//   - Follows the Observer/Event-Driven pattern for loose coupling
//
// Complexity:
//   - Join:   O(1) — push to queue + add to set
//   - Leave:  O(n) worst case, but rare (players rarely leave queue)
//   - Pair:   O(1) — shift two from front
//   - Check:  O(1) — set.has()

export interface QueuedPlayer {
  playerId: string;
  socketId: string;
  joinedAt: number;
  rating?: number; // For future ELO-based matching
}

export class MatchmakingQueue extends EventEmitter {
  private queue: QueuedPlayer[] = []; // FIFO queue for ordering
  private playerSet: Set<string> = new Set(); // O(1) existence check

  // ─── Join Queue ───────────────────────────────────────────────────────

  public join(playerId: string, socketId: string): boolean {
    // O(1) duplicate check via Set
    if (this.playerSet.has(playerId)) {
      console.log(`[Matchmaking] Player ${playerId} already in queue`);
      return false;
    }

    const player: QueuedPlayer = {
      playerId,
      socketId,
      joinedAt: Date.now(),
    };

    this.queue.push(player); // O(1) amortized
    this.playerSet.add(playerId); // O(1)

    console.log(`[Matchmaking] Player ${playerId} joined queue | Queue size: ${this.queue.length}`);

    // Attempt immediate pairing
    this.tryPair();
    return true;
  }

  // ─── Leave Queue ──────────────────────────────────────────────────────

  public leave(playerId: string): boolean {
    if (!this.playerSet.has(playerId)) return false;

    this.queue = this.queue.filter((p) => p.playerId !== playerId);
    this.playerSet.delete(playerId);

    console.log(`[Matchmaking] Player ${playerId} left queue | Queue size: ${this.queue.length}`);
    return true;
  }

  // ─── O(1) Pairing ────────────────────────────────────────────────────
  // Pops two players from front of queue and emits match_found event

  private tryPair(): void {
    while (this.queue.length >= 2) {
      const player1 = this.queue.shift()!; // O(1) — dequeue
      const player2 = this.queue.shift()!; // O(1) — dequeue

      this.playerSet.delete(player1.playerId); // O(1)
      this.playerSet.delete(player2.playerId); // O(1)

      // Randomly assign colors for fairness
      const isPlayer1White = Math.random() > 0.5;
      const white = isPlayer1White ? player1 : player2;
      const black = isPlayer1White ? player2 : player1;

      console.log(`[Matchmaking] Match found! White: ${white.playerId} vs Black: ${black.playerId}`);

      // Event-driven: emit match for loose coupling with socket layer
      this.emit('match_found', {
        white: { playerId: white.playerId, socketId: white.socketId },
        black: { playerId: black.playerId, socketId: black.socketId },
      });
    }
  }

  // ─── Handle disconnect (remove from queue if queued) ──────────────────

  public handleDisconnect(playerId: string): void {
    this.leave(playerId);
  }

  // ─── Update socket ID (for reconnection) ──────────────────────────────

  public updateSocketId(playerId: string, newSocketId: string): void {
    const player = this.queue.find((p) => p.playerId === playerId);
    if (player) {
      player.socketId = newSocketId;
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────

  public getQueueSize(): number {
    return this.queue.length;
  }

  public isInQueue(playerId: string): boolean {
    return this.playerSet.has(playerId); // O(1)
  }
}
