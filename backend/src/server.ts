import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { GameManager } from './engine/GameManager';
import { SessionManager } from './session/SessionManager';
import { MatchmakingQueue } from './matchmaking/MatchmakingQueue';
import { setupSocketHandlers } from './socket/connectionSocket';
import { setupMatchmaking } from './socket/matchmakingSocket';
import { generateGuestToken } from './auth/jwt';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Socket.io Server ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// ─── Core Instances ───────────────────────────────────────────────────────────
const gameManager = new GameManager();
const sessionManager = new SessionManager();
const matchmakingQueue = new MatchmakingQueue();

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// Guest auth — generates a JWT with a unique player ID
app.post('/api/auth/guest', (req, res) => {
  const { username } = req.body;
  const result = generateGuestToken(username);
  res.json(result);
});

// Server stats
app.get('/api/stats', (_req, res) => {
  res.json({
    activeGames: gameManager.getActiveGameCount(),
    onlinePlayers: sessionManager.getActiveSessionCount(),
    queueSize: matchmakingQueue.getQueueSize(),
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── Setup Socket Handlers ────────────────────────────────────────────────────
setupMatchmaking(io, gameManager, matchmakingQueue, sessionManager);
setupSocketHandlers(io, gameManager, sessionManager, matchmakingQueue);

// ─── Periodic Cleanup ─────────────────────────────────────────────────────────
setInterval(() => {
  gameManager.cleanupCompletedGames();
}, 60_000);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🏰 Chessy server running on http://localhost:${PORT}`);
  console.log(`   WebSocket ready for connections\n`);
});
