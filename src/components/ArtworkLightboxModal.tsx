import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ChevronLeft, ChevronRight, Check, Maximize2 } from 'lucide-react';

interface ArtworkLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworks: string[];
  initialIndex?: number;
  aspectRatio?: '16/9' | '9/16';
  movieTitle: string;
  type?: 'fanart' | 'poster';
}

export const ArtworkLightboxModal: React.FC<ArtworkLightboxModalProps> = ({
  isOpen,
  onClose,
  artworks,
  initialIndex = 0,
  aspectRatio = '16/9',
  movieTitle,
  type = 'fanart',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'downloaded'>('idle');

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Keyboard navigation (Arrow keys, Esc)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, artworks.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (artworks.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
  }, [artworks.length]);

  const handlePrev = useCallback(() => {
    if (artworks.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
  }, [artworks.length]);

  // Download full resolution image to device
  const handleDownloadImage = async () => {
    const currentUrl = artworks[currentIndex];
    if (!currentUrl) return;

    setDownloadState('downloading');
    const safeTitle = movieTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_${type}_${currentIndex + 1}_fullres.jpg`;

    try {
      // Use client fetch -> blob -> anchor download
      const res = await fetch(currentUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);

      setDownloadState('downloaded');
      setTimeout(() => setDownloadState('idle'), 2500);
    } catch {
      // Fallback: direct window or anchor navigation
      const link = document.createElement('a');
      link.href = currentUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadState('downloaded');
      setTimeout(() => setDownloadState('idle'), 2500);
    }
  };

  if (!isOpen || artworks.length === 0) return null;

  const currentArt = artworks[currentIndex] || artworks[0];
  const isPoster = aspectRatio === '9/16' || type === 'poster';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center select-none overflow-hidden">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/92 backdrop-blur-2xl cursor-pointer"
        />

        {/* Ambient Blur Background Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
          <img
            src={currentArt}
            alt=""
            className="w-full h-full object-cover filter blur-3xl scale-125"
          />
        </div>

        {/* Floating Top Bar */}
        <div className="absolute top-4 inset-x-4 sm:inset-x-8 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-xs text-neutral-300">
            <span className="font-semibold text-white">{movieTitle}</span>
            <span>•</span>
            <span className="text-neutral-400">
              {isPoster ? 'Poster' : 'Still'} {currentIndex + 1} of {artworks.length}
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {/* Download Button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={handleDownloadImage}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
              title="Download full resolution to device"
            >
              {downloadState === 'downloaded' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved to Device</span>
                </>
              ) : downloadState === 'downloading' ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download High-Res</span>
                </>
              )}
            </motion.button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Fullscreen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Artwork Stage */}
        <div className="relative z-10 w-full h-full max-h-[85vh] sm:max-h-[90vh] flex items-center justify-center p-4 sm:p-10 pointer-events-none">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={`pointer-events-auto relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center bg-black/40 ${
              isPoster ? 'aspect-[9/16] h-full max-h-[82vh] w-auto' : 'aspect-[16/9] w-full max-w-5xl h-auto'
            }`}
          >
            <img
              src={currentArt}
              alt={`${movieTitle} ${type}`}
              className="w-full h-full object-contain pointer-events-auto"
            />
          </motion.div>
        </div>

        {/* Navigation Arrows */}
        {artworks.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xl"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xl"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bottom Thumbnail Strip */}
        {artworks.length > 1 && (
          <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center px-4 pointer-events-none">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-md overflow-x-auto max-w-lg pointer-events-auto hide-scrollbar">
              {artworks.map((art, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer border ${
                    isPoster ? 'w-8 h-12 aspect-[9/16]' : 'w-14 h-9 aspect-[16/9]'
                  } ${
                    idx === currentIndex
                      ? 'border-white ring-2 ring-white/50 scale-105'
                      : 'border-white/15 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={art} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
