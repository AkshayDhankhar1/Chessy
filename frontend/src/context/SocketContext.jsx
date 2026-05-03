import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { connectSocket, getSocket, disconnectSocket } from '../utils/socket';
import { loginAsGuest } from '../utils/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerInfo, setPlayerInfo] = useState(null);

  // Ref for immediate access (avoids stale closures)
  const socketRef = useRef(null);

  const connect = useCallback(async (username) => {
    try {
      // 1. Get guest JWT from server
      const authData = await loginAsGuest(username);

      // Store auth data
      localStorage.setItem('chessy_token', authData.token);
      localStorage.setItem('chessy_player', JSON.stringify(authData));
      setPlayerInfo(authData);

      // 2. Connect socket with JWT and WAIT for actual connection
      const sock = connectSocket(authData.token);

      return new Promise((resolve, reject) => {
        // If already connected (instant), resolve immediately
        if (sock.connected) {
          socketRef.current = sock;
          setSocket(sock);
          setIsConnected(true);
          resolve(sock);
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 8000);

        sock.on('connect', () => {
          clearTimeout(timeout);
          socketRef.current = sock;
          setSocket(sock);
          setIsConnected(true);
          resolve(sock);
        });

        sock.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        sock.on('disconnect', () => {
          setIsConnected(false);
        });
      });
    } catch (err) {
      console.error('Connection failed:', err);
      throw err;
    }
  }, []);

  const reconnect = useCallback(() => {
    const token = localStorage.getItem('chessy_token');
    const player = localStorage.getItem('chessy_player');
    if (token && player) {
      setPlayerInfo(JSON.parse(player));
      const sock = connectSocket(token);

      return new Promise((resolve) => {
        if (sock.connected) {
          socketRef.current = sock;
          setSocket(sock);
          setIsConnected(true);
          resolve(sock);
          return;
        }

        sock.on('connect', () => {
          socketRef.current = sock;
          setSocket(sock);
          setIsConnected(true);
          resolve(sock);
        });

        sock.on('disconnect', () => setIsConnected(false));
      });
    }
    return Promise.resolve(null);
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    socketRef.current = null;
    setSocket(null);
    setIsConnected(false);
    setPlayerInfo(null);
    localStorage.removeItem('chessy_token');
    localStorage.removeItem('chessy_player');
  }, []);

  return (
    <SocketContext.Provider value={{
      socket, isConnected, playerInfo, socketRef,
      connect, reconnect, disconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be inside SocketProvider');
  return ctx;
}
