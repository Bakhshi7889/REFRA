import React, { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { UiThemeConfig } from '../services/themeStore';
import { getPosterUrl, handleImageError } from '../utils/imageHelpers';

interface StickyMobileCTAProps {
  movie?: Movie | null;
  onPlay: (movie: Movie) => void;
  onSearch: () => void;
  themeConfig?: UiThemeConfig;
}

export const StickyMobileCTA: React.FC<StickyMobileCTAProps> = ({ movie, onPlay, themeConfig }) => {
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop;
      // Reveal once scrolled down 380px past the hero spotlight
      if (scrollPos > 380 && !isDismissed) {
        setIsScrolledPast(true);
      } else {
        setIsScrolledPast(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!isScrolledPast || isDismissed || !movie) return null;

  const hasProgress = Boolean(movie.progress);
  const progressPercent = movie.progress?.percentage;
  const progressTimeLeft = movie.progress?.timeLeft;

  return (
    <aside aria-label="Mobile quick action" className="fixed bottom-20 left-3 right-3 z-30 sm:hidden">
      <motion.div
        initial={{ opacity: 0, y: 25, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 25, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.92))',
          borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.15))',
          fontFamily: 'var(--font-family-current, inherit)',
          boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.20)',
          backdropFilter: 'var(--liquid-filter-url, none) blur(var(--glass-blur-strength, 8px))',
          WebkitBackdropFilter: 'var(--liquid-filter-url, none) blur(var(--glass-blur-strength, 8px))',
        }}
        className="rounded-full liquid-glass liquid-glass-pill border p-2 px-3 shadow-2xl flex items-center justify-between gap-2.5 relative overflow-hidden transition-colors"
      >
        {/* Movie Info Thumbnail & Titles */}
        <div
          onClick={() => onPlay(movie)}
          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer pl-0.5"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 shrink-0 border border-white/20 relative shadow-inner">
            <img
              src={getPosterUrl(movie.posterUrl, 'w342', movie.backdropUrl)}
              alt={movie.title}
              onError={(e) => handleImageError(e, false)}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {typeof progressPercent === 'number' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(5, progressPercent))}%`,
                    backgroundColor: 'var(--color-accent, #ffffff)',
                  }}
                />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-bold text-white truncate flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-family-current, inherit)' }}
            >
              <span className="truncate">{movie.title}</span>
            </div>
            <div
              className="text-[10px] text-neutral-400 flex items-center gap-1.5 min-w-0 flex-wrap"
              style={{ fontFamily: 'var(--font-family-current, inherit)' }}
            >
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border shrink-0 uppercase"
                style={{
                  backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.12))',
                  color: 'var(--badge-text, #ffffff)',
                  borderColor: 'var(--badge-border, rgba(255, 255, 255, 0.2))',
                }}
              >
                {hasProgress ? 'Last Played' : '4K UHD'}
              </span>
              {progressTimeLeft ? (
                <span
                  className="font-semibold truncate"
                  style={{ color: 'var(--color-accent, #ffffff)' }}
                >
                  {progressTimeLeft}
                </span>
              ) : (
                <span>{movie.releaseYear || 2024}</span>
              )}
              {typeof progressPercent === 'number' && (
                <span className="text-neutral-400 font-medium">({progressPercent}%)</span>
              )}
            </div>
          </div>
        </div>

        {/* Play / Resume CTA Button */}
        <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
          <button
            type="button"
            onClick={() => onPlay(movie)}
            style={{
              backgroundColor: 'var(--btn-primary-bg, #ffffff)',
              color: 'var(--btn-primary-text, #0a0a0c)',
              fontFamily: 'var(--font-family-current, inherit)',
            }}
            className="px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer active:scale-[0.96] shadow-md shadow-black/25 shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>{hasProgress ? 'Resume' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss quick play bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </aside>
  );
};
