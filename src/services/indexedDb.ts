import { Movie, Review } from '../types';

const DB_NAME = 'RefraCinemaDB';
const DB_VERSION = 1;

export interface HistoryItem {
  id: string;
  movieId: string;
  title: string;
  posterUrl: string;
  backdropUrl?: string;
  progressPercent: number;
  durationString?: string;
  lastWatchedTimestamp: number;
  season?: number;
  episode?: number;
}

export interface TraktSession {
  username: string;
  name?: string;
  avatarUrl?: string;
  joinedAt?: string;
  isVip?: boolean;
  accessToken?: string;
  refreshToken?: string;
  lastSyncedTimestamp?: number;
  stats?: {
    moviesWatched?: number;
    episodesWatched?: number;
    totalMinutes?: number;
  };
}

export interface LocalDbStats {
  watchlistCount: number;
  historyCount: number;
  reviewsCount: number;
  settingsCount: number;
  storageUsageBytes: number;
  storageQuotaBytes: number;
  traktConnected: boolean;
  traktUsername: string | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('watchlist')) {
        db.createObjectStore('watchlist', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('history')) {
        const histStore = db.createObjectStore('history', { keyPath: 'id' });
        histStore.createIndex('lastWatchedTimestamp', 'lastWatchedTimestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains('reviews')) {
        const revStore = db.createObjectStore('reviews', { keyPath: 'id' });
        revStore.createIndex('mediaId', 'mediaId', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('trakt_session')) {
        db.createObjectStore('trakt_session', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ----------------- WATCHLIST OPERATIONS -----------------
export async function getIndexedDbWatchlist(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readonly');
      const store = tx.objectStore('watchlist');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).map((item: any) => item.id);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read watchlist error:', err);
    // fallback to localStorage
    try {
      const saved = localStorage.getItem('refra_watchlist') || localStorage.getItem('luma_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
}

export async function saveIndexedDbWatchlist(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('watchlist', 'readwrite');
      const store = tx.objectStore('watchlist');
      store.clear();
      ids.forEach((id) => {
        store.put({ id, addedAt: Date.now() });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write watchlist error:', err);
  }
}

export async function toggleIndexedDbWatchlist(id: string): Promise<string[]> {
  const current = await getIndexedDbWatchlist();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  await saveIndexedDbWatchlist(next);
  return next;
}

// ----------------- HISTORY & CONTINUE WATCHING -----------------
export async function getIndexedDbHistory(): Promise<HistoryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const store = tx.objectStore('history');
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result || []) as HistoryItem[];
        items.sort((a, b) => b.lastWatchedTimestamp - a.lastWatchedTimestamp);
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read history error:', err);
    return [];
  }
}

export async function saveIndexedDbHistoryItem(item: HistoryItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write history error:', err);
  }
}

// ----------------- USER REVIEWS STORE -----------------
export async function getIndexedDbReviews(mediaId?: string): Promise<Review[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reviews', 'readonly');
      const store = tx.objectStore('reviews');
      const req = store.getAll();
      req.onsuccess = () => {
        let items = (req.result || []) as Review[];
        if (mediaId) {
          items = items.filter((r: any) => r.mediaId === mediaId);
        }
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read reviews error:', err);
    return [];
  }
}

export async function saveIndexedDbReview(review: Review & { mediaId: string }): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      store.put(review);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write review error:', err);
  }
}

// ----------------- SETTINGS STORE -----------------
export async function getIndexedDbSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function saveIndexedDbSetting<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write setting error:', err);
  }
}

// ----------------- TRAKT SESSION STORE -----------------
export async function getIndexedDbTraktSession(): Promise<TraktSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('trakt_session', 'readonly');
      const store = tx.objectStore('trakt_session');
      const req = store.get('current_user');
      req.onsuccess = () => {
        resolve(req.result ? req.result.data : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    try {
      const saved = localStorage.getItem('refra_trakt_session') || localStorage.getItem('luma_trakt_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }
}

export async function saveIndexedDbTraktSession(session: TraktSession | null): Promise<void> {
  try {
    if (session) {
      localStorage.setItem('refra_trakt_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('refra_trakt_session');
      localStorage.removeItem('luma_trakt_session');
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trakt_session', 'readwrite');
      const store = tx.objectStore('trakt_session');
      if (session) {
        store.put({ key: 'current_user', data: session });
      } else {
        store.delete('current_user');
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write trakt session error:', err);
  }
}

// ----------------- STATS & MANAGEMENT -----------------
export async function getIndexedDbStats(): Promise<LocalDbStats> {
  let watchlistCount = 0;
  let historyCount = 0;
  let reviewsCount = 0;
  let settingsCount = 0;
  let traktConnected = false;
  let traktUsername: string | null = null;
  let storageUsageBytes = 0;
  let storageQuotaBytes = 0;

  try {
    const db = await openDB();

    const countStore = (storeName: string): Promise<number> =>
      new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.count();
          req.onsuccess = () => resolve(req.result || 0);
          req.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });

    [watchlistCount, historyCount, reviewsCount, settingsCount] = await Promise.all([
      countStore('watchlist'),
      countStore('history'),
      countStore('reviews'),
      countStore('settings'),
    ]);

    const trakt = await getIndexedDbTraktSession();
    if (trakt) {
      traktConnected = true;
      traktUsername = trakt.username;
    }

    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      storageUsageBytes = est.usage || 0;
      storageQuotaBytes = est.quota || 0;
    }
  } catch (err) {
    console.warn('IndexedDB stats error:', err);
  }

  return {
    watchlistCount,
    historyCount,
    reviewsCount,
    settingsCount,
    storageUsageBytes,
    storageQuotaBytes,
    traktConnected,
    traktUsername,
  };
}

export async function exportIndexedDbBackup(): Promise<string> {
  const db = await openDB();

  const fetchAll = (storeName: string): Promise<any[]> =>
    new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });

  const [watchlist, history, reviews, settings, trakt] = await Promise.all([
    fetchAll('watchlist'),
    fetchAll('history'),
    fetchAll('reviews'),
    fetchAll('settings'),
    fetchAll('trakt_session'),
  ]);

  const backupObject = {
    app: 'Refra Cinema',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      watchlist,
      history,
      reviews,
      settings,
      trakt,
    },
  };

  return JSON.stringify(backupObject, null, 2);
}

export async function importIndexedDbBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) throw new Error('Invalid backup schema');

    const db = await openDB();

    const importStore = (storeName: string, items: any[]): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!items || !items.length) {
          resolve();
          return;
        }
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

    await Promise.all([
      importStore('watchlist', parsed.data.watchlist || []),
      importStore('history', parsed.data.history || []),
      importStore('reviews', parsed.data.reviews || []),
      importStore('settings', parsed.data.settings || []),
      importStore('trakt_session', parsed.data.trakt || []),
    ]);

    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}

export async function clearAllIndexedDb(): Promise<void> {
  try {
    const db = await openDB();
    const storeNames = ['watchlist', 'history', 'reviews', 'settings', 'trakt_session'];
    await Promise.all(
      storeNames.map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(name, 'readwrite');
            const store = tx.objectStore(name);
            store.clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          })
      )
    );

    localStorage.removeItem('refra_watchlist');
    localStorage.removeItem('refra_trakt_session');
    localStorage.removeItem('refra_cinema_settings');
    localStorage.removeItem('refra_embed_settings');
    localStorage.removeItem('luma_watchlist');
    localStorage.removeItem('luma_trakt_session');
    localStorage.removeItem('luma_cinema_settings');
    localStorage.removeItem('luma_embed_settings');
  } catch (err) {
    console.warn('Clear IndexedDB error:', err);
  }
}
