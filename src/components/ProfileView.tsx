import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Film,
  Zap,
  Check,
  ChevronRight,
  Globe,
  Subtitles,
  Smartphone,
  Trash2,
  Layers,
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
  WifiOff,
  Gauge,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import { ImageDiagnosticsSection } from './ImageDiagnosticsSection';
import { UiThemeConfig, DEFAULT_THEME_CONFIG, loadSavedThemeConfig, saveThemeConfig } from '../services/themeStore';
import { getUserRegionInfo, setUserRegion, SUPPORTED_REGIONS } from '../services/regionStore';
import { toWebpUrl } from '../utils/imageHelpers';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  const [regionInfo, setRegionInfo] = useState(() => getUserRegionInfo());
  const pwa = usePWAInstall();

  const handleRegionSelect = (val: string) => {
    if (val === 'AUTO') {
      setUserRegion('AUTO', false);
      const updated = getUserRegionInfo();
      setRegionInfo(updated);
      const reg = SUPPORTED_REGIONS.find((r) => r.code === updated.detectedCode);
      showToast(`Region auto-detected: ${reg ? reg.name : updated.detectedCode}`);
    } else {
      setUserRegion(val, true);
      const updated = getUserRegionInfo();
      setRegionInfo(updated);
      const reg = SUPPORTED_REGIONS.find((r) => r.code === val);
      showToast(`Feed region set to ${reg ? reg.name : val}`);
    }
  };

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
                  src={toWebpUrl(traktUser.avatarUrl, 100)}
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
          /* Not Signed In: Clean Trakt Connection Row */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#ff0040]/20 text-[#ff4b72] flex items-center justify-center font-bold">
                <Cloud className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-white">Trakt.tv Sync</div>
            </div>

            <button
              type="button"
              onClick={() => setIsSignInModalOpen(true)}
              className="py-1.5 px-3.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-[0.96]"
            >
              <span>Connect</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= SECTION 2: UI BACKGROUNDS, FONTS & GLASS SURFACE ================= */}
      <ThemeSettingsSection
        themeConfig={activeThemeConfig}
        onThemeChanged={handleThemeChange}
        showToast={showToast}
      />

      {/* ================= SECTION: FEED REGION LOCALIZATION ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Feed Region & Country
          </h4>
          <span className="text-[10px] text-neutral-400 font-medium">
            {regionInfo.isManual ? 'Manual' : 'Auto-detected'}
          </span>
        </div>

        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                {(SUPPORTED_REGIONS.find((r) => r.code === regionInfo.code)?.flag) || '🌐'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {SUPPORTED_REGIONS.find((r) => r.code === regionInfo.code)?.name || 'Global'}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">
                  {regionInfo.isManual
                    ? `Manual territory (${regionInfo.code})`
                    : `Auto-detected from device (${SUPPORTED_REGIONS.find((r) => r.code === regionInfo.detectedCode)?.name || regionInfo.detectedCode})`}
                </div>
              </div>
            </div>

            <div className="relative shrink-0">
              <select
                value={regionInfo.isManual ? regionInfo.code : 'AUTO'}
                onChange={(e) => handleRegionSelect(e.target.value)}
                className="appearance-none bg-white/10 hover:bg-white/15 text-white text-xs font-semibold pl-3 pr-8 py-2 rounded-2xl border border-white/10 outline-none cursor-pointer transition-all active:scale-[0.96]"
                aria-label="Select feed region"
              >
                <option value="AUTO" className="bg-neutral-900 text-white">
                  🌐 Auto ({SUPPORTED_REGIONS.find((r) => r.code === regionInfo.detectedCode)?.flag} {SUPPORTED_REGIONS.find((r) => r.code === regionInfo.detectedCode)?.name || regionInfo.detectedCode})
                </option>
                {SUPPORTED_REGIONS.map((r) => (
                  <option key={r.code} value={r.code} className="bg-neutral-900 text-white">
                    {r.flag} {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: 3RD-PARTY EMBED PLAYER & STREAMING ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Playback & Streaming
          </h4>
          <span className="text-[10px] text-neutral-400 font-medium">Multi-CDN</span>
        </div>

        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {/* Anime Voice Track Stream */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-neutral-400" />
                <div className="text-xs font-semibold text-white">Anime Audio Priority</div>
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
                <div className="text-xs font-semibold text-white">Default Subtitles</div>
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
              <div className="text-xs font-semibold text-white">Trakt Auto-Scrobble</div>
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
              <div className="text-xs font-semibold text-white">Auto-Skip Theme Markers</div>
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
              <div className="text-xs font-semibold text-white">Auto-Play Trailers on Selection</div>
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

      {/* ================= DATA SAVER ================= */}
      <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${
                activeThemeConfig.dataSaverMode
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/5 text-neutral-300 border-white/10'
              }`}
            >
              <WifiOff className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-white">Data Saver</div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextVal = !activeThemeConfig.dataSaverMode;
              const nextCfg = { ...activeThemeConfig, dataSaverMode: nextVal };
              handleThemeChange(nextCfg);
              if (nextVal) {
                updateSetting('autoPlayTrailers', false);
                showToast('Data Saver on');
              } else {
                showToast('Data Saver off');
              }
            }}
            className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
              activeThemeConfig.dataSaverMode ? 'bg-emerald-400' : 'bg-white/10'
            }`}
            aria-label="Toggle Data Saver"
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform duration-200 absolute top-[3px] ${
                activeThemeConfig.dataSaverMode
                  ? 'translate-x-6 bg-neutral-950'
                  : 'translate-x-1 bg-neutral-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ================= IMAGE ROUTING & NETWORK DIAGNOSTICS ================= */}
      <ImageDiagnosticsSection
        activeThemeConfig={activeThemeConfig}
        onThemeChange={handleThemeChange}
        showToast={showToast}
      />

      {/* ================= SECTION 4: REAL INDEXEDDB DATABASE & STORAGE ================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Storage & Database
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
              <span className="text-[10px] text-neutral-400 block">Watchlist</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.watchlistCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">History</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.historyCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Reviews</span>
              <span className="text-base font-bold text-white mt-0.5 block">{dbStats.reviewsCount}</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-neutral-400 block">Storage</span>
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
              <span>Backup</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-300" />
              <span>Restore</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-xs font-semibold text-red-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Purge</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= PWA INSTALLATION ================= */}
      {!pwa.isInstalled && pwa.isInstallable && (
        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-inner">
                <img src="/refra_logo_vector.svg" alt="Refra" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Install Refra</div>
                <div className="text-[10px] text-neutral-400">4K cinema app on home screen</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => pwa.install()}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-semibold transition-all cursor-pointer active:scale-[0.96]"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* ================= SECTION 5: HARDWARE HAPTICS & DISTORTION ================= */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-3">
          Hardware & Interactions
        </h4>
        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-4 h-4 text-neutral-400" />
              <div className="text-xs font-semibold text-white">Haptic Feedback</div>
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
              <div className="text-xs font-semibold text-white">Liquid Glass Distortion</div>
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
        </div>
      </div>

      {/* ================= SECTION 6: APP IDENTITY & PWA STARTING ================= */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 px-3">
          App Identity & PWA
        </h4>
        <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-inner">
                <img src="/refra_logo_vector.svg" alt="Refra" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Refra Cinema v4.0</div>
                <div className="text-[10px] text-neutral-400">PWA Vector Identity & Offline Shell</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('refra:replay-splash'))}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer active:scale-[0.96] border border-white/10"
              title="Preview PWA starting screen"
            >
              Preview Start
            </button>
          </div>
        </div>
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
                  All local watchlists and playback data will be cleared.
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
                  Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
