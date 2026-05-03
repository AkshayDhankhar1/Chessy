import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'chessy-secret-key-2024';

export interface TokenPayload {
  playerId: string;
  username: string;
  iat?: number;
  exp?: number;
}

// Generate a guest JWT token (no database needed)
export function generateGuestToken(username?: string): { token: string; playerId: string; username: string } {
  const playerId = uuidv4();
  const guestName = username || `Player_${playerId.slice(0, 6)}`;

  const token = jwt.sign(
    { playerId, username: guestName } as TokenPayload,
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { token, playerId, username: guestName };
}

// Verify and decode a JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
