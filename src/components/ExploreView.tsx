import React from 'react';
import { Sparkles, Clapperboard, Compass, Flame, Award, Film } from 'lucide-react';
import { Movie, CategoryFilter } from '../types';

interface ExploreViewProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie, originRect?: DOMRect) => void;
  onSelectCategory: (cat: CategoryFilter) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  movies,
  onSelectMovie,
  onSelectCategory,
}) => {
  const genres = [
    { name: 'Sci-Fi' as CategoryFilter, icon: Sparkles, count: '14 films', desc: 'Cosmic scale & synthetic horizons' },
    { name: 'Neo-Noir' as CategoryFilter, icon: Flame, count: '9 films', desc: 'Urban shadows & digital crime' },
    { name: 'Arthouse' as CategoryFilter, icon: Award, count: '12 films', desc: 'Experimental auteur cinema' },
    { name: 'Drama' as CategoryFilter, icon: Clapperboard, count: '18 films', desc: 'Character-driven narratives' },
    { name: 'Thriller' as CategoryFilter, icon: Film, count: '11 films', desc: 'Psychological tension & dread' },
  ];

  return (
    <div className="w-full px-4 py-3 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Explore Cinema
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Curated collections and masterworks
        </p>
      </div>

      {/* Curated Channels */}
      <div className="grid grid-cols-1 gap-2.5">
        {genres.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.name}
              onClick={() => onSelectCategory(g.name)}
              className="p-3.5 rounded-2xl bg-[#14161f] border border-white/5 hover:bg-[#1b1f2b] transition-colors cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1d212e] text-neutral-200 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{g.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-light">{g.desc}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-neutral-400 px-2.5 py-1 rounded-full bg-[#1b1f2a]">
                {g.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Directors in Focus */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-white mb-2">
          Directors in Focus
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {['Elena Vance', 'Kenji Sato', 'Claire Delacroix', 'Matthias Brandt'].map((director) => (
            <div
              key={director}
              className="p-3 rounded-2xl bg-[#14161f] border border-white/5 text-center space-y-1"
            >
              <div className="w-10 h-10 rounded-full bg-[#202534] text-white flex items-center justify-center mx-auto text-xs font-bold">
                {director.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="text-xs font-semibold text-white">{director}</div>
              <div className="text-[10px] text-neutral-400">Master Retrospective</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
