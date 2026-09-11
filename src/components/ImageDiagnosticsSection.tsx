import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  Globe,
  Trash2,
  Layers,
  ArrowRightLeft,
  Check,
  Server,
  Cpu,
  WifiOff,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UiThemeConfig,
  ImageRoutingMode,
  ImageResolutionQuality,
  getImageRoutingMode,
  setImageRoutingMode,
  getImageResolutionQuality,
  setImageResolutionQuality,
} from '../services/themeStore';
import { clearMovieApiCache } from '../services/movieApi';

interface ImageDiagnosticsSectionProps {
  activeThemeConfig: UiThemeConfig;
  onThemeChange: (newConfig: UiThemeConfig) => void;
  showToast: (msg: string) => void;
}

type PingStatus = 'idle' | 'testing' | 'ok' | 'blocked' | 'error';

export const ImageDiagnosticsSection: React.FC<ImageDiagnosticsSectionProps> = ({
  activeThemeConfig,
  onThemeChange,
  showToast,
}) => {
  const currentRoutingMode: ImageRoutingMode = activeThemeConfig.imageRoutingMode || getImageRoutingMode();
  const currentResolutionQuality: ImageResolutionQuality = activeThemeConfig.imageResolutionQuality || getImageResolutionQuality();

  // Diagnostics test state
  const [directCdnStatus, setDirectCdnStatus] = useState<PingStatus>('idle');
  const [directCdnLatency, setDirectCdnLatency] = useState<number | null>(null);
  const [proxyStatus, setProxyStatus] = useState<PingStatus>('idle');
  const [proxyLatency, setProxyLatency] = useState<number | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [swStatusText, setSwStatusText] = useState<string>('Checking...');
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // Visual test poster image states
  const testImagePath = '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg'; // Dune: Part Two TMDB poster
  const [directImgLoaded, setDirectImgLoaded] = useState<boolean | null>(null);
  const [proxyImgLoaded, setProxyImgLoaded] = useState<boolean | null>(null);
  const [testKey, setTestKey] = useState<number>(1);

  // Check Service Worker status on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        setSwStatusText('Active (v7 Bypass direct TMDB)');
      } else {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg) {
            setSwStatusText(reg.active ? 'Active' : 'Installed / Waiting');
          } else {
            setSwStatusText('Not Registered');
          }
        }).catch(() => {
          setSwStatusText('Unavailable');
        });
      }
    } else {
      setSwStatusText('Unsupported in Browser');
    }

    if ('caches' in window) {
      window.caches.keys().then((keys) => {
        setCacheCount(keys.length);
      }).catch(() => {});
    }
  }, []);

  // Run full network diagnostics
  const runDiagnostics = useCallback(async () => {
    setIsDiagnosing(true);
    setDirectCdnStatus('testing');
    setProxyStatus('testing');
    setDirectCdnLatency(null);
    setProxyLatency(null);
    setDirectImgLoaded(null);
    setProxyImgLoaded(null);
    setTestKey((prev) => prev + 1);

    const testUrl = `https://image.tmdb.org/t/p/w185${testImagePath}`;
    const proxyUrl = `/api/image?url=${encodeURIComponent(testUrl)}`;

    // 1. Direct TMDB CDN ping test with 3500ms timeout
    const testDirect = async () => {
      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(testUrl, {
          method: 'GET',
          mode: 'no-cors', // standard image loading mode
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timer);
        const duration = Math.round(performance.now() - start);
        setDirectCdnLatency(duration);
        setDirectCdnStatus('ok');
      } catch (err: any) {
        clearTimeout(timer);
        setDirectCdnStatus('blocked');
      }
    };

    // 2. Refra Cloud Proxy ping test
    const testProxy = async () => {
      const start = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);

      try {
        const res = await fetch(proxyUrl, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timer);
        const duration = Math.round(performance.now() - start);
        if (res.ok) {
          setProxyLatency(duration);
          setProxyStatus('ok');
        } else {
          setProxyStatus('error');
        }
      } catch {
        clearTimeout(timer);
        setProxyStatus('error');
      }
    };

    await Promise.all([testDirect(), testProxy()]);
    setIsDiagnosing(false);
  }, []);

  // Handle routing mode change
  const handleRoutingModeChange = async (mode: ImageRoutingMode) => {
    const updated = await setImageRoutingMode(mode);
    onThemeChange({ ...activeThemeConfig, imageRoutingMode: mode });
    window.dispatchEvent(new CustomEvent('refra_refresh_catalog'));
    showToast(
      mode === 'proxy'
        ? 'Refra Cloud Proxy active: 100% ISP block bypass'
        : mode === 'direct'
        ? 'Direct TMDB CDN mode set'
        : 'Auto-Failover mode active'
    );
  };

  // Handle resolution quality change
  const handleQualityChange = async (quality: ImageResolutionQuality) => {
    const updated = await setImageResolutionQuality(quality);
    onThemeChange({ ...activeThemeConfig, imageResolutionQuality: quality });
    window.dispatchEvent(new CustomEvent('refra_refresh_catalog'));
    showToast(`Resolution profile set to ${quality.toUpperCase()}`);
  };

  // Purge all caches and reset
  const handlePurgeAllCaches = async () => {
    setIsPurging(true);
    try {
      // 1. Send PURGE message to SW
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PURGE_ALL_CACHES' });
      }

      // 2. Clear window Cache Storage
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
        setCacheCount(0);
      }

      // 3. Clear movie catalog API memory and local storage
      clearMovieApiCache();
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('refra_cached_movies') || k.startsWith('refra_swr') || k.startsWith('luma_cached_movies'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}

      // 4. Force catalog reload
      window.dispatchEvent(new CustomEvent('refra_refresh_catalog'));

      showToast('All image & data caches purged successfully');
      setTestKey((k) => k + 1);
    } catch (err) {
      console.error('Cache purge error:', err);
      showToast('Cache purge completed with notice');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Image Delivery & Network Diagnostics
          </h4>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
            currentRoutingMode === 'proxy'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : currentRoutingMode === 'direct'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {currentRoutingMode === 'proxy' ? 'Proxy Forced' : currentRoutingMode === 'direct' ? 'Direct Only' : 'Auto Failover'}
        </span>
      </div>

      <div className="rounded-3xl bg-neutral-900/40 backdrop-blur-2xl border border-white/10 p-4 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        
        {/* Network Route Inspector Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              Route Connectivity Status
            </span>
            <button
              type="button"
              onClick={runDiagnostics}
              disabled={isDiagnosing}
              className="py-1 px-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin text-emerald-400' : 'text-neutral-300'}`} />
              <span>{isDiagnosing ? 'Pinging...' : 'Test Routes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Direct TMDB CDN Card */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">Direct TMDB CDN</span>
                {directCdnStatus === 'ok' ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {directCdnLatency ? `${directCdnLatency}ms` : 'Reachable'}
                  </span>
                ) : directCdnStatus === 'blocked' ? (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                    <XCircle className="w-3 h-3" />
                    Blocked by ISP
                  </span>
                ) : directCdnStatus === 'testing' ? (
                  <span className="text-[10px] text-amber-400 animate-pulse font-medium">Testing...</span>
                ) : (
                  <span className="text-[10px] text-neutral-500 font-normal">Tap Test Routes</span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono truncate">
                image.tmdb.org
              </div>
            </div>

            {/* Refra Cloud Proxy Card */}
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">Refra Cloud Proxy</span>
                {proxyStatus === 'ok' ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    {proxyLatency ? `${proxyLatency}ms` : 'Operational'}
                  </span>
                ) : proxyStatus === 'error' ? (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                    <XCircle className="w-3 h-3" />
                    Error
                  </span>
                ) : proxyStatus === 'testing' ? (
                  <span className="text-[10px] text-amber-400 animate-pulse font-medium">Testing...</span>
                ) : (
                  <span className="text-[10px] text-neutral-500 font-normal">Tap Test Routes</span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono truncate">
                /api/image (Node.js Proxy)
              </div>
            </div>
          </div>
        </div>

        {/* ISP Block Detection Callout Banner */}
        <AnimatePresence>
          {directCdnStatus === 'blocked' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl p-3.5 bg-rose-500/10 border border-rose-500/25 space-y-2.5 overflow-hidden"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-rose-200">
                    ISP Restriction Detected on image.tmdb.org
                  </div>
                  <div className="text-[11px] text-rose-300/80 leading-relaxed">
                    Your internet provider or mobile carrier (frequent on Jio, Airtel, Vi in India) is actively blocking direct connection to TMDB image hosts. Enable <strong>Refra Cloud Proxy</strong> to bypass this block immediately.
                  </div>
                </div>
              </div>
              {currentRoutingMode !== 'proxy' && (
                <button
                  type="button"
                  onClick={() => handleRoutingModeChange('proxy')}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98 shadow-md"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Switch to Refra Cloud Proxy (Recommended)</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Visual Verification Sandbox */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              Live Visual Verification Test
            </span>
            <span className="text-[10px] text-neutral-400">Comparing Real-Time Renders</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Direct TMDB Render Preview */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="relative w-20 h-28 rounded-xl bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-inner">
                <img
                  key={`direct-${testKey}`}
                  src={`https://image.tmdb.org/t/p/w185${testImagePath}?t=${testKey}`}
                  alt="Direct Test"
                  referrerPolicy="no-referrer"
                  onLoad={() => setDirectImgLoaded(true)}
                  onError={() => setDirectImgLoaded(false)}
                  className="w-full h-full object-cover"
                />
                {directImgLoaded === false && (
                  <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-1 text-center">
                    <XCircle className="w-5 h-5 text-rose-400 mb-1" />
                    <span className="text-[8px] text-rose-300 font-semibold leading-tight">Blocked</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] font-medium text-neutral-300">Direct CDN</div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${directImgLoaded === true ? 'bg-emerald-500/20 text-emerald-300' : directImgLoaded === false ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-500'}`}>
                {directImgLoaded === true ? '200 OK' : directImgLoaded === false ? 'Blocked' : 'Loading...'}
              </span>
            </div>

            {/* Cloud Proxy Render Preview */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="relative w-20 h-28 rounded-xl bg-neutral-900 border border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-inner">
                <img
                  key={`proxy-${testKey}`}
                  src={`/api/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w185${testImagePath}`)}&t=${testKey}`}
                  alt="Proxy Test"
                  onLoad={() => setProxyImgLoaded(true)}
                  onError={() => setProxyImgLoaded(false)}
                  className="w-full h-full object-cover"
                />
                {proxyImgLoaded === false && (
                  <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-1 text-center">
                    <XCircle className="w-5 h-5 text-rose-400 mb-1" />
                    <span className="text-[8px] text-rose-300 font-semibold leading-tight">Proxy Err</span>
                  </div>
                )}
              </div>
              <div className="text-[10px] font-medium text-emerald-300 font-semibold">Refra Proxy</div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${proxyImgLoaded === true ? 'bg-emerald-500/20 text-emerald-300' : proxyImgLoaded === false ? 'bg-rose-500/20 text-rose-300' : 'text-neutral-500'}`}>
                {proxyImgLoaded === true ? '200 OK' : proxyImgLoaded === false ? 'Failed' : 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* Image Delivery Routing Mode Selector */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-400" />
            Image Delivery Routing Mode
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Auto-Failover */}
            <button
              type="button"
              onClick={() => handleRoutingModeChange('auto')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                currentRoutingMode === 'auto'
                  ? 'bg-white/10 border-white/30 shadow-md'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>Auto-Failover</span>
                  <span className="text-[10px] text-neutral-400 font-normal">(Default)</span>
                </div>
                <div className="text-[10px] text-neutral-400 leading-relaxed">
                  Tries high-speed TMDB CDN directly first. If direct fails or is blocked by network, smoothly routes via Refra Cloud Proxy.
                </div>
              </div>
              {currentRoutingMode === 'auto' && (
                <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Refra Cloud Proxy */}
            <button
              type="button"
              onClick={() => handleRoutingModeChange('proxy')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                currentRoutingMode === 'proxy'
                  ? 'bg-purple-500/20 border-purple-400/40 shadow-md'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span className="text-purple-300 font-bold">Refra Cloud Proxy</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 font-semibold">
                    Anti-Block
                  </span>
                </div>
                <div className="text-[10px] text-neutral-300/80 leading-relaxed">
                  Forces 100% of posters, backdrops, and logos through server proxy. Recommended if images are blank due to ISP or country filtering.
                </div>
              </div>
              {currentRoutingMode === 'proxy' && (
                <div className="w-5 h-5 rounded-full bg-purple-400 text-black flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Direct CDN Only */}
            <button
              type="button"
              onClick={() => handleRoutingModeChange('direct')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                currentRoutingMode === 'direct'
                  ? 'bg-white/10 border-white/30 shadow-md'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
              }`}
            >
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-semibold text-white">Direct TMDB CDN Only</div>
                <div className="text-[10px] text-neutral-400 leading-relaxed">
                  Connects strictly to image.tmdb.org without proxy fallback. Fastest on unrestricted fiber connections.
                </div>
              </div>
              {currentRoutingMode === 'direct' && (
                <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Poster & Backdrop Resolution Quality Selector */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              Poster & Backdrop Resolution
            </span>
            <span className="text-[10px] text-neutral-400 font-mono uppercase">
              {currentResolutionQuality}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'auto', label: 'Auto', desc: 'Dynamic' },
              { id: 'ultra', label: 'Ultra 4K', desc: 'w780 / Orig' },
              { id: 'high', label: 'High', desc: 'w500 / 1080p' },
              { id: 'balanced', label: 'Balanced', desc: 'w342 / 720p' },
              { id: 'compact', label: 'Compact', desc: 'w185 / 300p' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQualityChange(item.id as ImageResolutionQuality)}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                  currentResolutionQuality === item.id
                    ? 'bg-white text-black border-white font-bold shadow'
                    : 'bg-white/[0.03] text-neutral-300 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-[11px] font-semibold">{item.label}</div>
                <div className={`text-[9px] ${currentResolutionQuality === item.id ? 'text-neutral-700' : 'text-neutral-400'}`}>
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cache & Service Worker Diagnostics & Purge */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                Service Worker & Image Caches
              </div>
              <div className="text-[10px] text-neutral-400">
                SW Status: <span className="text-neutral-200 font-medium">{swStatusText}</span> • {cacheCount} Caches Stored
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePurgeAllCaches}
              disabled={isPurging}
              className="flex-1 py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-xs font-semibold text-red-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className={`w-3.5 h-3.5 text-red-400 ${isPurging ? 'animate-spin' : ''}`} />
              <span>{isPurging ? 'Purging Caches...' : 'Purge All Caches & Reload'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
