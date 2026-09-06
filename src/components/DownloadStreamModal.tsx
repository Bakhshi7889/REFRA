import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { StreamItem, Movie } from '../types';
import { DownloadExpander } from './DownloadExpander';

interface DownloadStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream?: StreamItem | null;
  movie: Movie | null;
  availableStreams?: StreamItem[];
}

export const DownloadStreamModal: React.FC<DownloadStreamModalProps> = ({
  isOpen,
  onClose,
  stream,
  movie,
  availableStreams = [],
}) => {
  if (!isOpen || !movie) return null;

  const combinedStreams = stream
    ? [stream, ...(availableStreams || []).filter((s) => s.id !== stream.id)]
    : availableStreams;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
          className="relative w-full max-w-lg bg-[#0b0d14] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto desktop-scrollbar"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Download Cinema Stream
                </h3>
                <p className="text-xs text-neutral-400 truncate max-w-[260px] sm:max-w-xs">
                  {movie.title} • {movie.releaseYear}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close download modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Frictionless, Toddler-Simple Single Download Button that Expands */}
          <div className="py-1">
            <DownloadExpander
              movie={movie}
              availableStreams={combinedStreams}
              variant="modal"
              onCloseModal={onClose}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
