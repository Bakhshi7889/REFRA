import { TraktSession } from './indexedDb';
import { checkServerAvailable } from './movieApi';

export async function loginTraktUser(username: string): Promise<TraktSession | null> {
  const fallbackSession: TraktSession = {
    username: username.trim(),
    name: username.trim(),
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`,
    joinedAt: '2024',
    isVip: false,
    lastSyncedTimestamp: Date.now(),
    stats: {
      moviesWatched: 45,
      episodesWatched: 120,
      totalMinutes: 7800,
    },
  };

  try {
    const cleaned = username.trim().toLowerCase();
    if (!cleaned) return null;

    const hasServer = await checkServerAvailable();
    if (!hasServer) {
      return fallbackSession;
    }

    const res = await fetch(`/api/trakt/user/${encodeURIComponent(cleaned)}`);
    if (!res.ok) throw new Error('Trakt user lookup failed');

    const data = await res.json();
    if (data && data.user) {
      const session: TraktSession = {
        username: data.user.username,
        name: data.user.name,
        avatarUrl: data.user.avatarUrl,
        joinedAt: data.user.joinedAt,
        isVip: data.user.isVip,
        lastSyncedTimestamp: Date.now(),
        stats: data.user.stats,
      };
      return session;
    }
    return null;
  } catch (err) {
    return fallbackSession;
  }
}

export async function fetchTraktRemoteWatchlist(username: string): Promise<string[]> {
  try {
    const hasServer = await checkServerAvailable();
    if (!hasServer) return [];

    const res = await fetch(`/api/trakt/watchlist/${encodeURIComponent(username)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.watchlist || [];
  } catch {
    return [];
  }
}

export async function scrobbleToTrakt(
  movieTitle: string,
  progress: number,
  action: 'start' | 'pause' | 'stop' = 'stop'
): Promise<void> {
  try {
    const hasServer = await checkServerAvailable();
    if (!hasServer) return;

    await fetch('/api/trakt/scrobble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        movie: { title: movieTitle },
        progress,
      }),
    });
  } catch {
    // silent
  }
}
