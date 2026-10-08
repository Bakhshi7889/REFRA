import React, { useState } from 'react';
import { Film, Home, Compass, Search, ArrowLeft, Disc } from 'lucide-react';
import { motion } from 'motion/react';

interface NotFoundViewProps {
  onGoHome: () => void;
  onExplore: () => void;
  onSearch: (query: string) => void;
}

const POPULAR_SUGGESTIONS = [
  'Oppenheimer',
  'Dune',
  'Attack on Titan',
  'Interstellar',
  'Spirited Away',
  'Cyberpunk: Edgerunners',
];

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome, onExplore, onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full"
      >
        {/* Optical 404 Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-neutral-300 mb-6 backdrop-blur-md">
          <Disc className="w-3.5 h-3.5 text-[#FA0019] animate-spin" style={{ animationDuration: '8s' }} />
          <span>Error 404 — Reel Not Found</span>
        </div>

        {/* Big Cinematic Display */}
        <h1
          className="text-6xl sm:text-8xl font-black tracking-tight text-white mb-4"
          style={{ fontFamily: 'var(--font-family-current, inherit)' }}
        >
          4<span style={{ color: 'var(--color-accent, #FA0019)' }}>0</span>4
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-neutral-200 mb-3 tracking-tight">
          This Scene Slipped Off the Reel
        </h2>

        <p className="text-sm sm:text-base text-neutral-400 max-w-md mx-auto mb-8 leading-relaxed">
          The cinema title, direct stream endpoint, or decentralized indexing path you requested is unavailable or has been archived.
        </p>

        {/* Quick Direct Search Input */}
        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto mb-6">
          <div
            className="relative flex items-center rounded-2xl border p-1.5 transition-all shadow-xl"
            style={{
              backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.85))',
              borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.12))',
            }}
          >
            <Search className="w-4 h-4 ml-3 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search films, anime, directors..."
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              style={{
                backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                color: 'var(--btn-primary-text, #0a0a0c)',
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto mb-10 text-xs">
          <span className="text-neutral-500 mr-1">Popular:</span>
          {POPULAR_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onSearch(tag)}
              className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer text-xs active:scale-[0.96]"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-[0.96] shadow-lg shadow-black/40"
            style={{
              backgroundColor: 'var(--btn-primary-bg, #ffffff)',
              color: 'var(--btn-primary-text, #0a0a0c)',
            }}
          >
            <Home className="w-4 h-4" />
            <span>Return to Cinema</span>
          </button>

          <button
            type="button"
            onClick={onExplore}
            className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-all cursor-pointer active:scale-[0.96]"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Catalog</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
