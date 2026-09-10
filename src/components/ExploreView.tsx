import React from 'react';
import {
  Sparkles,
  Clapperboard,
  Flame,
  Award,
  Film,
  Tv,
  Eye,
  ChevronRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Movie, CategoryFilter } from '../types';
import { toWebpUrl } from '../utils/imageHelpers';

interface ExploreViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie, originRect?: DOMRect) => void;
  onSelectCategory: (cat: string) => void;
}

interface DirectorItem {
  name: string;
  avatarUrl: string;
  signatureFilm: string;
  badge: string;
  query: string;
}

interface StudioHub {
  name: string;
  tagline: string;
  badge: string;
  query: string;
}

const DIRECTORS: DirectorItem[] = [
  {
    name: 'Christopher Nolan',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Oppenheimer • Interstellar',
    badge: '7 Oscars',
    query: 'Christopher Nolan',
  },
  {
    name: 'Denis Villeneuve',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Dune • Blade Runner 2049',
    badge: 'Sci-Fi Master',
    query: 'Denis Villeneuve',
  },
  {
    name: 'Hayao Miyazaki',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Spirited Away • Mononoke',
    badge: 'Ghibli Legend',
    query: 'Hayao Miyazaki',
  },
  {
    name: 'Quentin Tarantino',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Pulp Fiction • Django',
    badge: 'Palme d\'Or',
    query: 'Quentin Tarantino',
  },
  {
    name: 'Makoto Shinkai',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Your Name • Suzume',
    badge: 'Visual Poet',
    query: 'Makoto Shinkai',
  },
  {
    name: 'Martin Scorsese',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=240&q=80',
    signatureFilm: 'Killers of the Flower Moon',
    badge: 'AFI Lifetime',
    query: 'Martin Scorsese',
  },
];

const STUDIOS: StudioHub[] = [
  { name: 'Studio Ghibli', tagline: 'Enchanted anime masterpieces', badge: 'Japan', query: 'Ghibli' },
  { name: 'A24', tagline: 'Visionary indie cinema & arthouse', badge: 'Auteur', query: 'A24' },
  { name: 'IMAX 70mm', tagline: 'Uncompressed cinematic scale', badge: '4K HDR', query: 'IMAX' },
  { name: 'Marvel Studios', tagline: 'Interconnected comic sagas', badge: 'MCU', query: 'Marvel' },
  { name: 'HBO / Warner Bros', tagline: 'Prestige cinema & blockbusters', badge: 'WB', query: 'Warner' },
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  movies,
  onSelectMovie,
  onSelectCategory,
}) => {
  const genres = [
    { name: 'Sci-Fi', icon: Sparkles, count: '14 films', desc: 'Cosmic scale & synthetic horizons' },
    { name: 'Anime', icon: Tv, count: '18 films', desc: 'Dual-Audio Japanese & English simulcasts' },
    { name: 'Neo-Noir', icon: Flame, count: '9 films', desc: 'Urban shadows & digital crime' },
    { name: 'Arthouse', icon: Award, count: '12 films', desc: 'Experimental auteur cinema & Palme d\'Or' },
    { name: 'Drama', icon: Clapperboard, count: '24 films', desc: 'Character-driven narratives & prestige' },
    { name: 'Thriller', icon: Film, count: '16 films', desc: 'Psychological tension & dread' },
  ];

  return (
    <div className="w-full px-4 py-3 space-y-6 pb-20">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Explore Cinema
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Curated channels, auteur filmographies, and studio archives
        </p>
      </div>

      {/* Curated Channels */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Curated Channels
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {genres.map((g) => {
            const Icon = g.icon;
            return (
              <motion.div
                whileTap={{ scale: 0.98 }}
                key={g.name}
                onClick={() => onSelectCategory(g.name)}
                className="p-3.5 rounded-2xl bg-[#14161f] border border-white/5 hover:bg-[#1b1f2b] transition-colors cursor-pointer flex items-center justify-between group shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#1d212e] text-neutral-200 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{g.name}</h4>
                    <p className="text-[11px] text-neutral-400 font-light truncate">{g.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] font-medium text-neutral-400 px-2 py-0.5 rounded-full bg-[#1b1f2a]">
                    {g.count}
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Studio & Franchise Hubs */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Studios & Franchise Vaults
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {STUDIOS.map((s) => (
            <motion.div
              whileTap={{ scale: 0.98 }}
              key={s.name}
              onClick={() => onSelectCategory(s.query)}
              className="p-3.5 rounded-2xl bg-[#14161f] border border-white/5 hover:bg-[#1c202d] transition-colors cursor-pointer flex items-center justify-between shadow-md group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white group-hover:text-white transition-colors">
                    {s.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-mono">
                    {s.badge}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5">{s.tagline}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors shrink-0" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Directors in Focus (Real clickable Auteurs) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Directors in Focus
          </h3>
          <span className="text-[10px] text-neutral-500">Tap to browse filmography</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {DIRECTORS.map((director) => (
            <motion.div
              whileTap={{ scale: 0.96 }}
              key={director.name}
              onClick={() => onSelectCategory(director.query)}
              className="p-3.5 rounded-2xl bg-[#14161f] border border-white/5 hover:bg-[#1b1f2b] transition-all cursor-pointer flex flex-col items-center text-center space-y-2 group shadow-md"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[#202534] border border-white/10 shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                <img
                  src={toWebpUrl(director.avatarUrl, 120)}
                  alt={director.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-full min-w-0">
                <div className="text-xs font-bold text-white truncate group-hover:text-white">
                  {director.name}
                </div>
                <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                  {director.signatureFilm}
                </div>
                <div className="mt-1.5 inline-block text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-white/5">
                  {director.badge}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
