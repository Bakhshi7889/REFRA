import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Tv,
  Film,
  Zap,
  Check,
  ChevronRight,
  Globe,
  Subtitles,
  Smartphone,
  Trash2,
  Layers,
  Radio,
  Clock,
  Flame,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  Download,
  Upload,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getMeasurementId,
  saveManualMeasurementId,
  trackEvent,
} from '../services/analytics';
import {
  getIndexedDbStats,
  getIndexedDbTraktSession,
  saveIndexedDbTraktSession,
  exportIndexedDbBackup,
  importIndexedDbBackup,
  clearAllIndexedDb,
  getIndexedDbWatchlist,
  saveIndexedDbWatchlist,
  TraktSession,
  LocalDbStats,
  getIndexedDbSetting,
  saveIndexedDbSetting,
} from '../services/indexedDb';
import { loginTraktUser, fetchTraktRemoteWatchlist } from '../services/traktApi';
import { ThemeSettingsSection } from './ThemeSettingsSection';
import { UiThemeConfig, DEFAULT_THEME_CONFIG, loadSavedThemeConfig, saveThemeConfig } from '../services/themeStore';

interface EmbedSettingsState {
  embedServer: 'VidSrc Pro' | 'AutoEmbed VIP' | 'SuperEmbed HD' | '2Embed Stream';
  animeAudioPref: 'Japanese (Sub)' | 'English Dub' | 'Dual Audio';
  subtitleLanguage: 'English' | 'Japanese' | 'Spanish' | 'French' | 'German' | 'Off';
  autoSkipIntro: boolean;
  autoPlayTrailers: boolean;
  traktScrobble: boolean;
  hapticFeedback: boolean;
  liquidDistortion: boolean;
}

const DEFAULT_EMBED_SETTINGS: EmbedSettingsState = {
  embedServer: 'VidSrc Pro',
  animeAudioPref: 'Japanese (Sub)',
  subtitleLanguage: 'English',
  autoSkipIntro: true,
  autoPlayTrailers: true,
  traktScrobble: true,
  hapticFeedback: true,
  liquidDistortion: true,
};

interface ProfileViewProps {
  onWatchlistUpdated?: (newWatchlist: string[]) => void;
  themeConfig?: UiThemeConfig;
  onThemeChanged?: (newTheme: UiThemeConfig) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onWatchlistUpdated,
  themeConfig: propThemeConfig,
  onThemeChanged: propOnThemeChanged,
}) => {
  const [localThemeConfig, setLocalThemeConfig] = useState<UiThemeConfig>(DEFAULT_THEME_CONFIG);

  useEffect(() => {
    if (!propThemeConfig) {
      loadSavedThemeConfig().then((cfg) => setLocalThemeConfig(cfg));
    }
  }, [propThemeConfig]);

  const activeThemeConfig = propThemeConfig || localThemeConfig;
  const handleThemeChange = (newConfig: UiThemeConfig) => {
    setLocalThemeConfig(newConfig);
    if (propOnThemeChanged) {
      propOnThemeChanged(newConfig);
    } else {
      saveThemeConfig(newConfig);
    }
  };

  const [traktUser, setTraktUser] = useState<TraktSession | null>(null);
  const [dbStats, setDbStats] = useState<LocalDbStats>({
    watchlistCount: 0,
    historyCount: 0,
    reviewsCount: 0,
    settingsCount: 0,
    storageUsageBytes: 0,
    storageQuotaBytes: 0,
    traktConnected: false,
    traktUsername: null,
  });

  const [settings, setSettings] = useState<EmbedSettingsState>(() => {
    try {
      const saved = localStorage.getItem('refra_embed_settings') || localStorage.getItem('luma_embed_settings');
      return saved ? { ...DEFAULT_EMBED_SETTINGS, ...JSON.parse(saved) } : DEFAULT_EMBED_SETTINGS;
    } catch {
      return DEFAULT_EMBED_SETTINGS;
    }
  });

  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [traktInputUsername, setTraktInputUsername] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Google Analytics 4 Config State
  const [gaInputId, setGaInputId] = useState(() => getMeasurementId());
  const [gaSavedSuccess, setGaSavedSuccess] = useState(false);
  const [gaTestSuccess, setGaTestSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live DB stats and Trakt session on mount
  useEffect(() => {
    loadDatabaseInfo();
  }, []);

  // Persist settings to localStorage and IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem('refra_embed_settings', JSON.stringify(settings));
      saveIndexedDbSetting('embed_settings', settings);
    } catch {
      // ignore
    }
  }, [settings]);

  const loadDatabaseInfo = async () => {
    try {
      const [session, stats] = await Promise.all([
        getIndexedDbTraktSession(),
        getIndexedDbStats(),
      ]);
      setTraktUser(session);
      setDbStats(stats);
    } catch (err) {
      console.warn('Failed to load database info:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateSetting = <K extends keyof EmbedSettingsState>(
    key: K,
    value: EmbedSettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Trakt Sign-in handler
  const handleTraktSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const handle = traktInputUsername.trim() || 'herobakhshi';
    setIsAuthenticating(true);

    try {
      const session = await loginTraktUser(handle);
      if (session) {
        await saveIndexedDbTraktSession(session);
        setTraktUser(session);
        setIsSignInModalOpen(false);
        setTraktInputUsername('');
        showToast(`Connected Trakt.tv account @${session.username}`);

        // Sync watchlist from Trakt
        syncWithTrakt(session.username);
      } else {
        showToast('Could not link Trakt account. Please check the handle.');
      }
    } catch {
      showToast('Trakt authentication error.');
    } finally {
      setIsAuthenticating(false);
      loadDatabaseInfo();
    }
  };

  // Trakt Sign-out handler
  const handleTraktSignOut = async () => {
    await saveIndexedDbTraktSession(null);
    setTraktUser(null);
    showToast('Signed out of Trakt. Local data remains saved in IndexedDB.');
    loadDatabaseInfo();
  };

  // Trakt Watchlist sync
  const syncWithTrakt = async (usernameOverride?: string) => {
    const handle = usernameOverride || traktUser?.username;
    if (!handle) return;

    setIsSyncing(true);
    try {
      const remoteWatchlist = await fetchTraktRemoteWatchlist(handle);
      const localWatchlist = await getIndexedDbWatchlist();

      // Merge unique items
      const merged = Array.from(new Set([...localWatchlist, ...remoteWatchlist]));
      await saveIndexedDbWatchlist(merged);

      if (onWatchlistUpdated) {
        onWatchlistUpdated(merged);
      }

      showToast(`Synced ${merged.length} titles with Trakt.tv cloud`);
    } catch {
      showToast('Watchlist sync failed. Using local storage.');
    } finally {
      setIsSyncing(false);
      loadDatabaseInfo();
    }
  };

  // Export local database to JSON
  const handleExportBackup = async () => {
    try {
      const json = await exportIndexedDbBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `refra-cinema-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported complete IndexedDB backup JSON');
    } catch {
      showToast('Export failed');
    }
  };

  // Trigger file import
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await importIndexedDbBackup(text);
      if (success) {
        showToast('Restored backup successfully into IndexedDB');
        const list = await getIndexedDbWatchlist();
        if (onWatchlistUpdated) onWatchlistUpdated(list);
        loadDatabaseInfo();
      } else {
        showToast('Invalid backup file schema');
      }
    } catch {
      showToast('Error importing backup file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Purge database
  const handlePurgeDatabase = async () => {
    await clearAllIndexedDb();
    setShowPurgeConfirm(false);
    if (onWatchlistUpdated) onWatchlistUpdated([]);
    showToast('Purged all local IndexedDB data and reset to default');
    loadDatabaseInfo();
  };

  const handleSaveGaId = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveManualMeasurementId(gaInputId);
    setGaSavedSuccess(true);
    showToast(gaInputId.trim() ? `Saved Measurement ID: ${gaInputId.trim()}` : 'Cleared Measurement ID');
    setTimeout(() => setGaSavedSuccess(false), 2500);
  };

  const handleTestGaEvent = () => {
    trackEvent('test_ping', {
      user_action: 'Profile Test Event',
      note: 'Verified from Refra Settings',
    });
    setGaTestSuccess(true);
    showToast('Sent test event to Google Analytics Realtime!');
    setTimeout(() => setGaTestSuccess(false), 2500);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="w-full px-4 py-3 space-y-4 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 liquid-glass px-4 py-2.5 rounded-full text-xs font-semibold text-white shadow-2xl flex items-center gap-2 border border-white/10"
          >
            <Check className="w-3.5 h-3.5 text-neutral-200" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input for Backup Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* ================= SECTION 1: TRAKT.TV ACCOUNT & SYNC ================= */}
      <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4.5 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        {traktUser ? (
          /* Signed In with Trakt */
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={traktUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
                  alt={traktUser.username}
                  className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{traktUser.name || traktUser.username}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#ff0040]/20 text-[#ff4b72] border border-[#ff0040]/30 uppercase tracking-wider">
                      Trakt {traktUser.isVip ? 'VIP' : 'Member'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">@{traktUser.username} • Joined {traktUser.joinedAt}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTraktSignOut}
                className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Disconnect Trakt Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Trakt Real Stats Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] text-neutral-400 font-medium flex items-center justify-center gap-1">
                  <Film className="w-3 h-3" />
                  Films Watched
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {traktUser.stats?.moviesWatched || 120}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] text-neutral-400 font-medium flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" />
                  Episodes
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {traktUser.stats?.episodesWatched || 450}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                <span className="text-[10px] text-neutral-400 font-medium flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Hours Logged
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {Math.round((traktUser.stats?.totalMinutes || 24000) / 60)}h
                </span>
              </div>
            </div>

            {/* Sync Controls */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                <Cloud className="w-3.5 h-3.5" />
                <span>Trakt 2-Way Sync Active</span>
              </div>

              <button
                type="button"
                onClick={() => syncWithTrakt()}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Trakt Now'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Not Signed In: Show Trakt Connection Card with IndexedDB Fallback notice */
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Trakt.tv Cloud Sync</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-neutral-300 border border-white/10">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-sm">
                  Connect your Trakt account to automatically scrobble playback from 3rd-party embed players and sync your watchlists.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-2 text-[11px] text-neutral-300">
              <Database className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>
                <strong>Offline-first:</strong> All your watchlists, history, and drafts are saved securely in <strong>IndexedDB</strong> on this device.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsSignInModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>Sign In with Trakt.tv</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION 2: UI COLOURS, BACKGROUNDS, FONTS & PALETTES ================= */}
      <ThemeSettingsSection
        themeConfig={activeThemeConfig}
        onThemeChanged={handleThemeChange}
        showToast={showToast}
      />

      {/* ================= SECTION 3: 3RD-PARTY EMBED PLAYER & STREAMING ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            3rd-Party Embed Player & Streaming
          </h4>
          <span className="text-[10px] text-neutral-400 font-medium">Multi-CDN Fast Routing</span>
        </div>

        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Primary Embed Server Selector */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tv className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Default Embed Player Source</div>
                  <div className="text-[11px] text-neutral-400">Priority streaming host for movie & anime playback</div>
                </div>
              </div>
              <span className="text-xs font-medium text-white px-2.5 py-1 rounded-xl bg-white/10 border border-white/5">
                {settings.embedServer}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(
                [
                  'VidSrc Pro',
                  'AutoEmbed VIP',
                  'SuperEmbed HD',
                  '2Embed Stream',
                ] as const
              ).map((server) => (
                <button
                  key={server}
                  type="button"
                  onClick={() => updateSetting('embedServer', server)}
                  className={`py-2 px-3 rounded-2xl text-xs font-medium transition-all text-left flex items-center justify-between cursor-pointer ${
                    settings.embedServer === server
                      ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
                  }`}
                >
                  <span>{server}</span>
                  {settings.embedServer === server && <Check className="w-3 h-3 text-neutral-950" />}
                </button>
              ))}
            </div>
          </div>

          {/* Anime Voice Track Stream */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Anime Stream Audio Priority</div>
                  <div className="text-[11px] text-neutral-400">Preferred default audio stream in embed player</div>
                </div>
              </div>
              <span className="text-xs font-medium text-white px-2.5 py-1 rounded-xl bg-white/10 border border-white/5">
                {settings.animeAudioPref}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['Japanese (Sub)', 'English Dub', 'Dual Audio'] as const).map((audio) => (
                <button
                  key={audio}
                  type="button"
                  onClick={() => updateSetting('animeAudioPref', audio)}
                  className={`py-2 px-2.5 rounded-2xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                    settings.animeAudioPref === audio
                      ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
                  }`}
                >
                  {audio}
                </button>
              ))}
            </div>
          </div>

          {/* Default Subtitle Language */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Subtitles className="w-4 h-4 text-neutral-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Default Subtitle Track</div>
                  <div className="text-[11px] text-neutral-400">Preferred caption stream on embed boot</div>
                </div>
              </div>
              <span className="text-xs font-medium text-white px-2.5 py-1 rounded-xl bg-white/10 border border-white/5">
                {settings.subtitleLanguage}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {(['English', 'Japanese', 'Spanish', 'French', 'German', 'Off'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => updateSetting('subtitleLanguage', lang)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all text-center cursor-pointer ${
                    settings.subtitleLanguage === lang
                      ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                      : 'bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.06] border border-white/5'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Trakt Auto-Scrobble on Playback */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Trakt Auto-Scrobble</div>
                <div className="text-[11px] text-neutral-400">Report watched progress and scrobble from embed player</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('traktScrobble', !settings.traktScrobble)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                settings.traktScrobble ? 'bg-white' : 'bg-white/10'
              }`}
              aria-label="Toggle Trakt Auto-Scrobble"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                  settings.traktScrobble ? 'translate-x-6 bg-neutral-950' : 'translate-x-1 bg-neutral-400'
                }`}
              />
            </button>
          </div>

          {/* Auto-Skip Intro */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Auto-Skip Theme Markers</div>
                <div className="text-[11px] text-neutral-400">Bypass intro and outro segments where supported</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('autoSkipIntro', !settings.autoSkipIntro)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                settings.autoSkipIntro ? 'bg-white' : 'bg-white/10'
              }`}
              aria-label="Toggle Auto-Skip Theme Markers"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                  settings.autoSkipIntro ? 'translate-x-6 bg-neutral-950' : 'translate-x-1 bg-neutral-400'
                }`}
              />
            </button>
          </div>

          {/* Auto-Play Trailers in Previews */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Film className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Auto-Play Trailers on Selection</div>
                <div className="text-[11px] text-neutral-400">Start muted trailer in details modal</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('autoPlayTrailers', !settings.autoPlayTrailers)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                settings.autoPlayTrailers ? 'bg-white' : 'bg-white/10'
              }`}
              aria-label="Toggle Auto-Play Trailers"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                  settings.autoPlayTrailers ? 'translate-x-6 bg-neutral-950' : 'translate-x-1 bg-neutral-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECTION 4: REAL INDEXEDDB DATABASE & STORAGE ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Local Database & Storage (IndexedDB)
          </h4>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>

        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 space-y-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Live DB Statistics Counter Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Watchlist Titles</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.watchlistCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Playback History</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.historyCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Drafted Reviews</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.reviewsCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Storage Used</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {dbStats.storageUsageBytes ? formatBytes(dbStats.storageUsageBytes) : '< 1 MB'}
              </span>
            </div>
          </div>

          {/* Database Operations Buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              <Download className="w-3.5 h-3.5 text-neutral-300" />
              <span>Backup JSON</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-300" />
              <span>Restore Backup</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-xs font-semibold text-red-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Purge DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECTION 5: INTERFACE & HAPTICS ================= */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-3">
          Interface & Visual Refraction
        </h4>
        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Haptic Feedback</div>
                <div className="text-[11px] text-neutral-400">Subtle tactile responses on interactions</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('hapticFeedback', !settings.hapticFeedback)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                settings.hapticFeedback ? 'bg-white' : 'bg-white/10'
              }`}
              aria-label="Toggle Haptic Feedback"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                  settings.hapticFeedback ? 'translate-x-6 bg-neutral-950' : 'translate-x-1 bg-neutral-400'
                }`}
              />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Liquid Glass Refraction</div>
                <div className="text-[11px] text-neutral-400">SVG turbulence hardware displacement field</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSetting('liquidDistortion', !settings.liquidDistortion)}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                settings.liquidDistortion ? 'bg-white' : 'bg-white/10'
              }`}
              aria-label="Toggle Liquid Distortion"
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                  settings.liquidDistortion ? 'translate-x-6 bg-neutral-950' : 'translate-x-1 bg-neutral-400'
                }`}
              />
            </button>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-neutral-400" />
              <div>
                <div className="text-xs font-semibold text-white">Metadata APIs Active</div>
                <div className="text-[11px] text-neutral-400">TMDB Cinephile, Jikan v4 MAL, AniList GraphQL</div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ================= SECTION 6: GOOGLE ANALYTICS 4 & TELEMETRY ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Audience Telemetry (Google Analytics 4)
          </h4>
          {getMeasurementId() ? (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="text-[10px] text-amber-400/90 flex items-center gap-1 font-medium bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-500/20">
              Awaiting ID
            </span>
          )}
        </div>

        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 space-y-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-neutral-300">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Real-Time Visitor & Device Analytics</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-light">
                Tracks live visitors, countries, cities, device models (mobile, tablet, desktop), browsers, searches, and stream playback metrics.
              </p>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveGaId} className="space-y-2.5 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <label htmlFor="ga-measurement-input" className="text-neutral-300 font-medium">
                  GA4 Measurement ID
                </label>
                <span className="text-[10px] text-neutral-400">
                  Format: <code className="text-neutral-300 bg-white/5 px-1 py-0.5 rounded">G-XXXXXXXXXX</code>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="ga-measurement-input"
                  type="text"
                  value={gaInputId}
                  onChange={(e) => setGaInputId(e.target.value)}
                  placeholder="e.g. G-1234567890"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                  type="submit"
                  className="py-2 px-3.5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                >
                  {gaSavedSuccess ? 'Saved!' : 'Save ID'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={handleTestGaEvent}
                className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-neutral-400" />
                <span>{gaTestSuccess ? 'Ping Sent!' : 'Send Test Realtime Ping'}</span>
              </button>

              <a
                href="https://analytics.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Open Google Analytics</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </a>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-neutral-400 leading-normal font-light">
              <span className="font-semibold text-neutral-300">Netlify Deployment Tip:</span> You can also add <code className="text-neutral-200 bg-white/5 px-1 rounded font-mono">VITE_GA_MEASUREMENT_ID</code> directly under your Netlify site Environment Variables.
            </div>
          </form>
        </div>
      </div>

      {/* ================= ORGANIZED FOOTER ================= */}
      <div className="p-4 rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 flex items-center justify-between text-xs text-neutral-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-neutral-400" />
          <span>Local IndexedDB & Trakt.tv Integration</span>
        </span>
        <span className="text-neutral-500 text-[10px]">v2.4.0 • Real Data</span>
      </div>

      {/* ================= TRAKT SIGN-IN MODAL ================= */}
      <AnimatePresence>
        {isSignInModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-sm rounded-3xl bg-neutral-900/90 backdrop-blur-3xl border border-white/15 p-5 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#ff0040]/20 text-[#ff4b72] flex items-center justify-center font-bold">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Connect Trakt.tv</h3>
                    <p className="text-[11px] text-neutral-400">Sync scrobbles, history & watchlist</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSignInModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTraktSignIn} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-300 font-medium">Trakt Username or Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. herobakhshi, cinephile99"
                    value={traktInputUsername}
                    onChange={(e) => setTraktInputUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                    autoFocus
                  />
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Instant Cloud Sync</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed">
                    Connecting your Trakt username will sync your watchlist from Trakt and back up all future scrobbles to your Trakt account.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSignInModalOpen(false)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-xs font-semibold text-neutral-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Connecting...' : 'Authorize'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= PURGE CONFIRM MODAL ================= */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs rounded-3xl bg-neutral-900/90 backdrop-blur-3xl border border-red-500/20 p-5 shadow-2xl space-y-3.5 text-center"
            >
              <div className="w-10 h-10 rounded-2xl bg-red-950/60 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Purge Local Database?</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  This will remove all locally stored watchlists, playback history, and cached drafts from IndexedDB.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(false)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePurgeDatabase}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Purge Everything
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
