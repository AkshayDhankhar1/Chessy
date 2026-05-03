const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export async function loginAsGuest(username) {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error('Failed to get guest token');
  return res.json(); // { token, playerId, username }
}

export async function getStats() {
  const res = await fetch(`${API_URL}/api/stats`);
  if (!res.ok) throw new Error('Failed to get stats');
  return res.json();
}
