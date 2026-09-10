import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Sparkles,
  Server,
  Cloud,
  Download,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Film,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lockScroll } from '../utils/scrollLock';
import { toWebpUrl } from '../utils/imageHelpers';

export interface AppNotification {
  id: string;
  type: 'premiere' | 'server' | 'anime' | 'trakt' | 'download';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  movieId?: string;
  posterUrl?: string;
  badge?: string;
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_dune',
    type: 'premiere',
    title: 'Dune: Part Two (2024)',
    message: 'Now streaming in IMAX Enhanced 4K UHD Master with uncompressed Dolby Atmos spatial sound.',
    time: '15m ago',
    isRead: false,
    movieId: 'tmdb_693134',
    posterUrl: 'https://image.tmdb.org/t/p/w500/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
    badge: '4K Premiere',
  },
  {
    id: 'notif_anime',
    type: 'anime',
    title: 'Chainsaw Man & Solo Leveling',
    message: 'Simulcast dual-audio tracks (Japanese sub & English dub) verified with zero-lag buffering.',
    time: '2h ago',
    isRead: false,
    movieId: 'tmdb_anime_chainsaw',
    posterUrl: 'https://image.tmdb.org/t/p/w500/npdB6eFz4425vyxhV7prNXUM3bn.jpg',
    badge: 'Anime Dub',
  },
  {
    id: 'notif_server',
    type: 'server',
    title: '10 Gbps Edge CDN Nodes Online',
    message: 'VidSrc, AutoEmbed VIP, and PenguPlay scrapers operating at 100% capacity with 32ms latency.',
    time: '5h ago',
    isRead: false,
    badge: 'Node Status',
  },
  {
    id: 'notif_trakt',
    type: 'trakt',
    title: 'Trakt.tv Scrobbler Connected',
    message: 'Continuous background scrobbling and cloud watchlist backup active for your session.',
    time: '1d ago',
    isRead: true,
    badge: 'Cloud Sync',
  },
  {
    id: 'notif_download',
    type: 'download',
    title: 'Offline Cinema Engine Ready',
    message: 'Multi-part high-speed downloading enabled with IndexedDB local caching.',
    time: '2d ago',
    isRead: true,
    badge: 'Storage',
  },
];

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovieById?: (movieId: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectMovieById,
  onUnreadCountChange,
}) => {
  const [filter, setFilter] = useState<'all' | 'releases' | 'system'>('all');
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const savedRead = localStorage.getItem('refra_read_notifications');
      if (savedRead) {
        const readIds = new Set<string>(JSON.parse(savedRead));
        return INITIAL_NOTIFICATIONS.map((n) => ({
          ...n,
          isRead: readIds.has(n.id) || n.isRead,
        }));
      }
    } catch {}
    return INITIAL_NOTIFICATIONS;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Lock background scroll cleanly on mobile when open
  useEffect(() => {
    if (!isOpen) return;
    const unlock = lockScroll();
    return () => {
      unlock();
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      try {
        localStorage.setItem(
          'refra_read_notifications',
          JSON.stringify(updated.map((n) => n.id))
        );
      } catch {}
      return updated;
    });
  };

  const markSingleAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      try {
        const readIds = updated.filter((n) => n.isRead).map((n) => n.id);
        localStorage.setItem('refra_read_notifications', JSON.stringify(readIds));
      } catch {}
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (n: AppNotification) => {
    markSingleAsRead(n.id);
    if (n.movieId && onSelectMovieById) {
      onSelectMovieById(n.movieId);
      onClose();
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'releases') return n.type === 'premiere' || n.type === 'anime';
    if (filter === 'system') return n.type === 'server' || n.type === 'trakt' || n.type === 'download';
    return true;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-50 pointer-events-none flex justify-end px-3 sm:px-6 pt-3.5 max-w-md sm:max-w-xl md:max-w-2xl mx-auto safe-top">
        {/* Transparent Dismissal Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto z-40"
        />

        {/* Signature Blurred Menu Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.90, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.90, y: -10 }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 30,
            mass: 0.6,
          }}
          style={{
            transformOrigin: 'top right',
            willChange: 'transform, opacity',
          }}
          className="pointer-events-auto z-50 mt-12 w-[calc(100vw-24px)] max-w-[410px] backdrop-blur-2xl rounded-[28px] bg-[#101218]/92 border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.22)] p-4 flex flex-col max-h-[82vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[16px] bg-white/10 text-white flex items-center justify-center shadow-inner relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center shadow">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Cinema Updates
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {unreadCount > 0 ? `${unreadCount} unread announcements` : 'All alerts up to date'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Read all</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmented Filter Bar */}
          <div className="mt-3 flex rounded-[16px] bg-black/40 p-1 border border-white/6">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 rounded-[12px] text-[11px] font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('releases')}
              className={`flex-1 py-1.5 rounded-[12px] text-[11px] font-semibold transition-all cursor-pointer ${
                filter === 'releases'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Premieres & Dubs
            </button>
            <button
              type="button"
              onClick={() => setFilter('system')}
              className={`flex-1 py-1.5 rounded-[12px] text-[11px] font-semibold transition-all cursor-pointer ${
                filter === 'system'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              System & CDN
            </button>
          </div>

          {/* Notifications Scrollable List */}
          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <Bell className="w-7 h-7 mx-auto opacity-30" />
                <p className="text-xs">No updates in this filter.</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 rounded-[18px] border transition-all cursor-pointer flex gap-3 items-start relative ${
                    n.isRead
                      ? 'bg-white/[0.02] border-white/6 opacity-80 hover:opacity-100 hover:bg-white/[0.05]'
                      : 'bg-white/[0.06] border-white/15 hover:bg-white/[0.09]'
                  }`}
                >
                  {/* Unread dot indicator */}
                  {!n.isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] animate-pulse" />
                  )}

                  {/* Thumbnail / Icon */}
                  {n.posterUrl ? (
                    <img
                      src={toWebpUrl(n.posterUrl, 100)}
                      alt={n.title}
                      className="w-10 h-14 object-cover rounded-[10px] shrink-0 shadow border border-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-[14px] bg-white/10 flex items-center justify-center text-white shrink-0">
                      {n.type === 'server' ? (
                        <Server className="w-4 h-4 text-emerald-400" />
                      ) : n.type === 'trakt' ? (
                        <Cloud className="w-4 h-4 text-neutral-200" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}

                  {/* Text Details */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                      {n.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-medium shrink-0">
                          {n.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-300 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-neutral-400 font-mono">{n.time}</span>
                      {n.movieId && (
                        <span className="text-[10px] text-white flex items-center gap-0.5 font-semibold hover:underline">
                          <span>Open title</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="pt-2.5 mt-2 border-t border-white/8 flex items-center justify-between text-[11px] text-neutral-400">
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer text-[10px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear history</span>
              </button>
              <div className="flex items-center gap-1.5 text-neutral-400 text-[10px]">
                <ShieldCheck className="w-3 h-3 text-neutral-300" />
                <span>Refra Cinema Dispatcher</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
