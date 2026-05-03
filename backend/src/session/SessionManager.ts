export interface SessionData {
  playerId: string;
  socketId: string;
  gameId: string | null;
  connected: boolean;
  disconnectedAt: number | null;
  reconnectTimer: NodeJS.Timeout | null;
  username: string;
}

export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private readonly RECONNECT_GRACE_PERIOD = 30_000;

  public createSession(playerId: string, socketId: string, username: string): SessionData {
    const existing = this.sessions.get(playerId);
    if (existing) {
      this.socketToPlayer.delete(existing.socketId);
      if (existing.reconnectTimer) clearTimeout(existing.reconnectTimer);
    }

    const session: SessionData = {
      playerId, socketId, gameId: null,
      connected: true, disconnectedAt: null,
      reconnectTimer: null, username,
    };

    this.sessions.set(playerId, session);
    this.socketToPlayer.set(socketId, playerId);
    console.log(`[Session] Created for ${username} (${playerId})`);
    return session;
  }

  public handleDisconnect(
    socketId: string,
    onTimeout: (playerId: string, gameId: string) => void
  ): SessionData | null {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return null;
    const session = this.sessions.get(playerId);
    if (!session) return null;

    session.connected = false;
    session.disconnectedAt = Date.now();
    this.socketToPlayer.delete(socketId);
    console.log(`[Session] ${session.username} disconnected | Game: ${session.gameId}`);

    if (session.gameId) {
      session.reconnectTimer = setTimeout(() => {
        console.log(`[Session] Grace period expired for ${session.username}`);
        onTimeout(playerId, session.gameId!);
        session.gameId = null;
      }, this.RECONNECT_GRACE_PERIOD);
    }
    return session;
  }

  public handleReconnect(playerId: string, newSocketId: string): SessionData | null {
    const session = this.sessions.get(playerId);
    if (!session) return null;

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
      console.log(`[Session] ${session.username} reconnected within grace period!`);
    }

    session.socketId = newSocketId;
    session.connected = true;
    session.disconnectedAt = null;
    this.socketToPlayer.set(newSocketId, playerId);
    return session;
  }

  public getSession(playerId: string): SessionData | undefined {
    return this.sessions.get(playerId);
  }

  public getPlayerIdBySocketId(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  public setGameId(playerId: string, gameId: string | null): void {
    const session = this.sessions.get(playerId);
    if (session) session.gameId = gameId;
  }

  public removeSession(playerId: string): void {
    const session = this.sessions.get(playerId);
    if (!session) return;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    this.socketToPlayer.delete(session.socketId);
    this.sessions.delete(playerId);
  }

  public getActiveSessionCount(): number {
    let count = 0;
    for (const s of this.sessions.values()) if (s.connected) count++;
    return count;
  }

  public getTotalSessionCount(): number {
    return this.sessions.size;
  }
}
