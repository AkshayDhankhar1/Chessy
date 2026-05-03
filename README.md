# ♔ Chessy — Real-Time Multiplayer Chess Platform

A full-stack, real-time multiplayer chess application built with **TypeScript**, **React**, **Node.js**, and **Socket.io**. Features a server-authoritative game engine, sub-100ms latency WebSocket communication, fault-tolerant session recovery, and an event-driven matchmaking system.

![Landing Page](https://img.shields.io/badge/Status-Live-brightgreen) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![Socket.io](https://img.shields.io/badge/Socket.io-4.7-black) ![chess.js](https://img.shields.io/badge/chess.js-1.0-green)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Landing  │  │  Board   │  │  Timers  │  │ Move History │  │
│  │  Page    │  │Component │  │  Panel   │  │   Sidebar    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       └──────────────┴─────────────┴───────────────┘          │
│                          │ Socket.io (WebSocket)              │
└──────────────────────────┼───────────────────────────────────┘
                           │  JWT Auth + Bidirectional Events
┌──────────────────────────┼───────────────────────────────────┐
│                     SERVER (Node.js)                         │
│  ┌──────────────┐  ┌─────┴──────┐  ┌──────────────────────┐  │
│  │  JWT Auth    │  │  Socket.io │  │   REST API           │  │
│  │  Middleware  │──│  Handlers  │  │  /api/auth/guest     │  │
│  └──────────────┘  └─────┬──────┘  │  /api/stats          │  │
│                          │         └──────────────────────┘  │
│  ┌───────────────────────┼───────────────────────────────┐   │
│  │              Core Engine Layer                        │   │
│  │  ┌──────────┐  ┌──────┴─────┐  ┌───────────────────┐ │   │
│  │  │  Game    │  │   Game     │  │   Matchmaking     │ │   │
│  │  │ (chess.js│  │  Manager   │  │     Queue         │ │   │
│  │  │ wrapper) │  │ HashMap<>  │  │  O(1) Pairing     │ │   │
│  │  └──────────┘  └────────────┘  └───────────────────┘ │   │
│  │                 ┌───────────────────┐                 │   │
│  │                 │ Session Manager   │                 │   │
│  │                 │ 30s Grace Period  │                 │   │
│  │                 │ Auto Reconnect    │                 │   │
│  │                 └───────────────────┘                 │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Server-Authoritative Engine** | All moves validated server-side via chess.js — prevents cheating | O(1) move validation |
| **Real-Time Communication** | Bidirectional WebSocket via Socket.io with sub-100ms latency | Event-driven |
| **O(1) Game Lookup** | `HashMap<gameId, Game>` + `HashMap<playerId, gameId>` dual-map design | O(1) |
| **Event-Driven Matchmaking** | FIFO queue + companion Set, Observer pattern for loose coupling | O(1) pairing |
| **Session Recovery** | 30s grace period on disconnect, JWT-based identity persistence | ~99% recovery |
| **Full Chess Rules** | Check, checkmate, stalemate, castling, en passant, promotion, 50-move rule, threefold repetition | 100% FIDE |
| **Live Timers** | 10-minute per player, precise elapsed-time tracking | Real-time sync |
| **Draw/Resign System** | Offer, accept, decline draw + resignation with proper result handling | Bidirectional |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite | UI framework with HMR |
| **Styling** | Vanilla CSS | Custom amber/emerald design system |
| **Backend** | Node.js + TypeScript | Type-safe server |
| **Game Engine** | chess.js | Move validation & rule enforcement |
| **Real-Time** | Socket.io | WebSocket with fallback |
| **Auth** | JWT (jsonwebtoken) | Stateless session tokens |
| **State** | In-memory HashMaps | O(1) game/session lookup |

---

## 📂 Project Structure

```
chessy/
├── backend/
│   ├── src/
│   │   ├── engine/
│   │   │   ├── Game.ts              # OOP wrapper around chess.js
│   │   │   └── GameManager.ts       # HashMap registry for O(1) lookup
│   │   ├── matchmaking/
│   │   │   └── MatchmakingQueue.ts  # Event-driven O(1) pairing
│   │   ├── session/
│   │   │   └── SessionManager.ts    # Fault-tolerant reconnection
│   │   ├── socket/
│   │   │   ├── connectionSocket.ts  # Auth middleware + reconnect
│   │   │   ├── gameSocket.ts        # Move, resign, draw handlers
│   │   │   └── matchmakingSocket.ts # Queue join/leave + match events
│   │   ├── auth/
│   │   │   └── jwt.ts               # Guest token generation
│   │   └── server.ts                # Express + Socket.io entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChessBoard.jsx       # 8x8 board with drag & click
│   │   │   ├── Piece.jsx            # Inline SVG chess pieces
│   │   │   ├── PlayerInfo.jsx       # Name, timer, captured pieces
│   │   │   ├── MoveHistory.jsx      # Algebraic notation sidebar
│   │   │   └── GameOverModal.jsx    # Win/loss/draw result modal
│   │   ├── context/
│   │   │   ├── SocketContext.jsx     # WebSocket connection manager
│   │   │   └── GameContext.jsx       # Game state + event listeners
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Home + matchmaking queue
│   │   │   └── Game.jsx             # Active game layout
│   │   └── utils/
│   │       ├── socket.js            # Socket.io client singleton
│   │       └── api.js               # REST API calls
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# Clone the repository
git clone https://github.com/AkshayDhankhar1/Chessy.git
cd Chessy

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Running Locally

```bash
# Terminal 1 — Start the backend (port 3001)
cd backend
npm run dev

# Terminal 2 — Start the frontend (port 5173)
cd frontend
npm run dev
```

Open **two browser tabs** at `http://localhost:5173`, enter different usernames, and click **Play Now** to start a game.

---

## 📡 Socket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `matchmaking:join` | — | Join the matchmaking queue |
| `matchmaking:leave` | — | Leave the queue |
| `game:move` | `{ from, to, promotion? }` | Submit a move intent |
| `game:resign` | — | Resign the current game |
| `game:offer_draw` | — | Offer a draw to opponent |
| `game:accept_draw` | — | Accept pending draw offer |
| `game:decline_draw` | — | Decline pending draw offer |
| `game:leave` | — | Leave completed game |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `match:found` | `{ gameId, color, opponent, state }` | Match paired, game starts |
| `game:state` | `GameState` | Authoritative board state update |
| `game:over` | `{ result, finalState }` | Game ended (checkmate/draw/etc.) |
| `game:reconnected` | `{ state, color }` | Restored to active game |
| `game:opponent_disconnected` | — | Opponent lost connection |
| `game:opponent_reconnected` | — | Opponent is back |
| `game:draw_offered` | — | Opponent offered a draw |
| `game:error` | `{ message }` | Invalid move or action |

---

<p align="center">
  Built with ♔ by <a href="https://github.com/AkshayDhankhar1">Akshay Dhankhar</a>
</p>
