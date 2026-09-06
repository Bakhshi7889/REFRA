import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Copy,
  Loader2,
  Film,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Movie, StreamItem } from '../types';
import {
  computeStreamScore,
  getStreamBytes,
  getCuratedDownloadTiers,
  CuratedDownloadTier,
  isStreamMatchingCurrentMovie,
} from '../utils/streamHelpers';

interface DownloadExpanderProps {
  movie: Movie;
  availableStreams?: StreamItem[];
  variant?: 'inline' | 'modal';
  onCloseModal?: () => void;
  className?: string;
}

type ResolutionFilter = 'all' | '4K' | '1080p' | '720p' | '480p' | '320p';
type MaxSizeFilter = 'all' | '1gb' | '2gb' | '3gb' | '5gb';

export const DownloadExpander: React.FC<DownloadExpanderProps> = ({
  movie,
  availableStreams = [],
  variant = 'inline',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(variant === 'modal');
  const [streams, setStreams] = useState<StreamItem[]>(availableStreams);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);

  // Filter drawer toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states
  const [selectedResolution, setSelectedResolution] = useState<ResolutionFilter>('all');
  const [selectedMaxSize, setSelectedMaxSize] = useState<MaxSizeFilter>('all');
  const [require10Bit, setRequire10Bit] = useState(false);

  // Download & copy feedback states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch real stream sources if needed
  useEffect(() => {
    if (availableStreams && availableStreams.length >= 6) {
      setStreams(availableStreams);
      return;
    }

    if (!isExpanded && variant !== 'modal') {
      return;
    }

    let isMounted = true;
    const fetchRealStreams = async () => {
      setIsLoadingStreams(true);
      try {
        const cleanTmdb = movie.tmdbId
          ? String(movie.tmdbId)
          : movie.id && /^[0-9]+$/.test(String(movie.id))
          ? String(movie.id)
          : '';
        const queryParams = new URLSearchParams({
          imdbId: movie.imdbId || '',
          tmdbId: cleanTmdb,
          title: movie.title || '',
          year: movie.releaseYear ? String(movie.releaseYear) : '',
          type: 'movie',
        });

        const res = await fetch(`/api/streams?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.streams && Array.isArray(data.streams) && data.streams.length > 0) {
            const verified = data.streams.filter((s: StreamItem) => isStreamMatchingCurrentMovie(s, movie.title));
            const existingIds = new Set(availableStreams.map((s) => s.id));
            const merged = [...availableStreams.filter((s) => isStreamMatchingCurrentMovie(s, movie.title))];
            for (const s of verified) {
              if (!existingIds.has(s.id)) {
                merged.push(s);
                existingIds.add(s.id);
              }
            }
            setStreams(merged.length > 0 ? merged : verified);
          }
        }
      } catch (err) {
        console.warn('Failed to load extra streams for download:', err);
      } finally {
        if (isMounted) {
          setIsLoadingStreams(false);
        }
      }
    };

    fetchRealStreams();

    return () => {
      isMounted = false;
    };
  }, [isExpanded, variant, availableStreams, movie.imdbId, movie.id, movie.title, movie.releaseYear]);

  // Update streams when availableStreams prop updates
  useEffect(() => {
    if (availableStreams && availableStreams.length > 0) {
      setStreams((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        for (const s of availableStreams) {
          if (!existingIds.has(s.id)) {
            merged.push(s);
            existingIds.add(s.id);
          }
        }
        return merged.length > 0 ? merged : availableStreams;
      });
    }
  }, [availableStreams]);

  // Curated 5 tiers in exact requested order:
  // 1. Best 4K under 5GB
  // 2. Best 1080p under 5GB
  // 3. Best 720p under 5GB
  // 4. Best 480p under 5GB
  // 5. Best 320p under 5GB
  const curatedTiers: CuratedDownloadTier[] = useMemo(() => {
    return getCuratedDownloadTiers(streams, movie);
  }, [streams, movie]);

  const hasActiveFilters = selectedResolution !== 'all' || selectedMaxSize !== 'all' || require10Bit;

  // Filtered streams when user applies custom size/resolution filters
  const filteredStreams = useMemo(() => {
    if (!hasActiveFilters) {
      return [];
    }

    const maxBytesMap: Record<MaxSizeFilter, number> = {
      all: Infinity,
      '1gb': 1 * 1024 * 1024 * 1024,
      '2gb': 2 * 1024 * 1024 * 1024,
      '3gb': 3 * 1024 * 1024 * 1024,
      '5gb': 5 * 1024 * 1024 * 1024,
    };

    const maxBytes = maxBytesMap[selectedMaxSize];

    // Build candidate list from both available streams and curated tier fallbacks
    const allCandidates = [...streams];
    for (const tier of curatedTiers) {
      if (!allCandidates.some((c) => c.id === tier.stream.id)) {
        allCandidates.push(tier.stream);
      }
    }

    const filtered = allCandidates.filter((s) => {
      if (!isStreamMatchingCurrentMovie(s, movie.title)) return false;

      const text = `${s.name} ${s.specs || ''} ${s.quality || ''} ${(s.badges || []).join(' ')}`.toLowerCase();
      const bytes = getStreamBytes(s);

      // 1. Size filter
      if (bytes > 0 && bytes > maxBytes) return false;

      // 2. Resolution filter
      if (selectedResolution !== 'all') {
        if (selectedResolution === '4K' && !(/2160|4k|uhd/i.test(text) || s.quality === '4K')) return false;
        if (selectedResolution === '1080p' && !(/1080/i.test(text) || s.quality === '1080p')) return false;
        if (selectedResolution === '720p' && !(/720/i.test(text) || s.quality === '720p')) return false;
        if (selectedResolution === '480p' && !(/480/i.test(text) || s.quality === '480p')) return false;
        if (selectedResolution === '320p' && !(/320|360|240/i.test(text) || s.quality === '320p')) return false;
      }

      // 3. 10-Bit filter
      if (require10Bit) {
        const is10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(text);
        if (!is10Bit) return false;
      }

      return true;
    });

    // Sort: 10-bit first, then by quality score descending
    return filtered.sort((a, b) => {
      const textA = `${a.name} ${a.specs || ''} ${(a.badges || []).join(' ')}`.toLowerCase();
      const textB = `${b.name} ${b.specs || ''} ${(b.badges || []).join(' ')}`.toLowerCase();
      const a10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(textA);
      const b10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(textB);
      if (a10Bit && !b10Bit) return -1;
      if (!a10Bit && b10Bit) return 1;
      return computeStreamScore(b) - computeStreamScore(a);
    });
  }, [hasActiveFilters, selectedMaxSize, selectedResolution, require10Bit, streams, curatedTiers, movie.title]);

  const resetFilters = () => {
    setSelectedResolution('all');
    setSelectedMaxSize('all');
    setRequire10Bit(false);
  };

  /**
   * Handle Direct Download:
   * Strictly avoids opening new tabs or redirecting to external spam sites.
   * Dispatches direct browser file download through the streaming proxy with
   * Content-Disposition: attachment header.
   */
  const handleDownload = (streamToDownload: StreamItem, customLabel?: string) => {
    const id = streamToDownload.id;
    setDownloadingId(id);
    setStatusMessage(`Starting download: ${customLabel || streamToDownload.name}...`);

    const safeTitle = (movie.title || 'Movie').replace(/[^a-zA-Z0-9_\s-]/g, '').trim();
    const quality = streamToDownload.quality || '1080p';
    const year = movie.releaseYear || '';
    const cleanFileName = `${safeTitle} (${year}) [${quality}].mp4`;

    const rawUrl =
      streamToDownload.directDownloadUrl ||
      streamToDownload.rawDirectUrl ||
      streamToDownload.url ||
      `https://vidlink.pro/movie/${movie.tmdbId || '1084199'}`;

    // 1. If it's a torrent magnet link
    if (rawUrl.startsWith('magnet:?')) {
      try {
        navigator.clipboard.writeText(rawUrl);
        setCopiedId(id);
      } catch {}

      const link = document.createElement('a');
      link.href = rawUrl;
      link.click();

      setDownloadingId(null);
      setDownloadSuccessId(id);
      setStatusMessage('Magnet link dispatched to your torrent downloader!');
      setTimeout(() => {
        setDownloadSuccessId(null);
        setStatusMessage(null);
      }, 4000);
      return;
    }

    // 2. Direct browser download endpoint
    // Uses the proxy with download=1 which sets Content-Disposition: attachment
    const downloadEndpoint =
      rawUrl.startsWith('/api/stream/proxy') && rawUrl.includes('download=1')
        ? rawUrl
        : `/api/stream/proxy?url=${encodeURIComponent(rawUrl)}&download=1&filename=${encodeURIComponent(cleanFileName)}`;

    // Trigger direct file download in the browser WITHOUT navigating away or opening a new site
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = downloadEndpoint;
    document.body.appendChild(iframe);

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = downloadEndpoint;
    anchor.setAttribute('download', cleanFileName);
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      if (document.body.contains(anchor)) document.body.removeChild(anchor);
    }, 10000);

    setDownloadingId(null);
    setDownloadSuccessId(id);
    setStatusMessage('Download started directly to your device!');
    setTimeout(() => {
      setDownloadSuccessId(null);
      setStatusMessage(null);
    }, 4000);
  };

  const handleCopyLink = (streamToCopy: StreamItem) => {
    const url = streamToCopy.directDownloadUrl || streamToCopy.rawDirectUrl || streamToCopy.url || '';
    if (!url) return;
    try {
      navigator.clipboard.writeText(url);
      setCopiedId(streamToCopy.id);
      setStatusMessage('Download URL copied to clipboard');
      setTimeout(() => {
        setCopiedId(null);
        setStatusMessage(null);
      }, 3000);
    } catch {}
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 1. Single Pill / Button on Info Page (Collapsed) */}
      {!isExpanded && variant === 'inline' && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white transition-all cursor-pointer active:scale-[0.98] shadow-md group"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap text-left">
              <span className="text-sm font-bold text-white tracking-wide">Download</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 font-medium border border-white/10">
                4K • 1080p • 720p under 5GB
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400 group-hover:text-white transition-colors">
            <span className="text-xs font-medium hidden sm:inline">Options</span>
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
          </div>
        </button>
      )}

      {/* 2. Expanded Download Section */}
      {(isExpanded || variant === 'modal') && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-3 rounded-2xl bg-neutral-950/80 border border-white/15 p-3.5 sm:p-4 backdrop-blur-xl shadow-2xl"
        >
          {/* Header Bar with Title, Filter Button, and Collapse */}
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate leading-tight">
                  Download {movie.title}
                </h4>
                <p className="text-[11px] text-neutral-400">
                  {hasActiveFilters
                    ? `${filteredStreams.length} filtered results`
                    : 'Curated 4K, 1080p, 720p, 480p, 320p under 5GB'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Small Filter Button */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isFilterOpen || hasActiveFilters
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-white/10 hover:bg-white/15 text-neutral-200 border-white/15'
                }`}
                title="Filter by size, resolution, and 10-bit quality"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>

              {/* Collapse Toggle */}
              {variant === 'inline' && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="Close download list"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Feedback Status Toast */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{statusMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expandable Filter Drawer */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs overflow-hidden"
              >
                {/* Resolution Selector */}
                <div>
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Resolution
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', '4K', '1080p', '720p', '480p', '320p'] as ResolutionFilter[]).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setSelectedResolution(res)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                          selectedResolution === res
                            ? 'bg-white text-black font-bold border-white'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                        }`}
                      >
                        {res === 'all' ? 'All Resolutions' : res}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Maximum Size Selector */}
                <div>
                  <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Maximum File Size
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'All Sizes' },
                        { id: '1gb', label: '< 1 GB' },
                        { id: '2gb', label: '< 2 GB' },
                        { id: '3gb', label: '< 3 GB' },
                        { id: '5gb', label: '< 5 GB' },
                      ] as { id: MaxSizeFilter; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedMaxSize(item.id)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer border ${
                          selectedMaxSize === item.id
                            ? 'bg-white text-black font-bold border-white'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 10-Bit Color Depth Toggle & Reset */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRequire10Bit(!require10Bit)}
                    className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                      require10Bit
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>10-Bit High Quality Only</span>
                  </button>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Streams List */}
          <div className="space-y-2 pt-1">
            {/* If NO filters active: Show the 5 Curated Tiers directly! */}
            {!hasActiveFilters ? (
              <div className="space-y-2">
                {curatedTiers.map((tier, index) => {
                  const isDownloading = downloadingId === tier.stream.id;
                  const isDownloaded = downloadSuccessId === tier.stream.id;
                  const isCopied = copiedId === tier.stream.id;

                  return (
                    <div
                      key={tier.id}
                      className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center justify-between gap-3 group"
                    >
                      {/* Left: Tier Info & Specs */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Priority index badge */}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                            #{index + 1}
                          </span>

                          {/* Resolution Badge */}
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              tier.resolution === '4K'
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                : tier.resolution === '1080p'
                                ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                                : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                            }`}
                          >
                            {tier.resolution}
                          </span>

                          {/* Tier Title */}
                          <span className="text-sm font-bold text-white tracking-tight">
                            {tier.tierTitle}
                          </span>

                          {/* 10-Bit Badge (Prioritized!) */}
                          {tier.is10Bit && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>10-Bit Color</span>
                            </span>
                          )}

                          {/* Under 5GB Size Badge */}
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {tier.formattedSize}
                          </span>
                        </div>

                        {/* Secondary Specs Description */}
                        <div className="text-xs text-neutral-400 mt-1 truncate">
                          {tier.stream.specs || `${tier.resolution} • Direct Cinema Stream • Fast Route`}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(tier.stream)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy direct download link"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Download Trigger Button */}
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() => handleDownload(tier.stream, tier.tierTitle)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md ${
                            isDownloaded
                              ? 'bg-emerald-500 text-black'
                              : isDownloading
                              ? 'bg-white/20 text-white cursor-wait'
                              : 'bg-white text-black hover:bg-neutral-200'
                          }`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isDownloaded ? (
                            <Check className="w-3.5 h-3.5 text-black" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isDownloaded ? 'Started' : isDownloading ? 'Starting' : 'Download'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* If Custom Filter IS Active: Show matching streams */
              <div className="space-y-2">
                {filteredStreams.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs space-y-2">
                    <p>No streams match your active filters.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                    >
                      Reset Filters to Default
                    </button>
                  </div>
                ) : (
                  filteredStreams.map((stream) => {
                    const isDownloading = downloadingId === stream.id;
                    const isDownloaded = downloadSuccessId === stream.id;
                    const isCopied = copiedId === stream.id;
                    const text = `${stream.name} ${stream.specs || ''} ${(stream.badges || []).join(' ')}`.toLowerCase();
                    const is10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(text);

                    return (
                      <div
                        key={stream.id}
                        className="p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                stream.quality === '4K'
                                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                                  : stream.quality === '1080p'
                                  ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30'
                                  : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                              }`}
                            >
                              {stream.quality || '1080p'}
                            </span>

                            <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                              {stream.name}
                            </span>

                            {is10Bit && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                <span>10-Bit</span>
                              </span>
                            )}

                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                              {stream.fileSize || 'Standard Size'}
                            </span>
                          </div>

                          <div className="text-xs text-neutral-400 mt-1 truncate">
                            {stream.specs || stream.sourceHost || 'Direct Download'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(stream)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy link"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownload(stream)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md ${
                              isDownloaded
                                ? 'bg-emerald-500 text-black'
                                : isDownloading
                                ? 'bg-white/20 text-white cursor-wait'
                                : 'bg-white text-black hover:bg-neutral-200'
                            }`}
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isDownloaded ? (
                              <Check className="w-3.5 h-3.5 text-black" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>{isDownloaded ? 'Started' : isDownloading ? 'Starting' : 'Download'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Direct Cinema Protection Guarantee Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct cinema stream • No external redirects • 10-bit prioritized</span>
            </div>
            {isLoadingStreams && (
              <div className="flex items-center gap-1 text-neutral-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking mirrors...</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
