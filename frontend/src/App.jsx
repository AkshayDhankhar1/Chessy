import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { useGame } from './context/GameContext';
import Landing from './pages/Landing';
import GamePage from './pages/Game';

function AppContent() {
  const { gameStatus } = useGame();

  // Show game page when playing or game ended
  if (gameStatus === 'playing' || gameStatus === 'ended') {
    return <GamePage />;
  }

  // Show landing (with matchmaking overlay if queuing)
  return <Landing />;
}

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
