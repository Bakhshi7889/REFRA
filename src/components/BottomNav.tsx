import React from 'react';
import { Home, Compass, Bookmark, User, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  watchlistCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'explore' as NavTab, label: 'Discover', icon: Compass },
    { id: 'search' as NavTab, label: 'Search', icon: Search },
    { id: 'watchlist' as NavTab, label: 'Saved', icon: Bookmark },
    { id: 'profile' as NavTab, label: 'Cinema', icon: User },
  ];

  const renderNavIcon = (tabId: NavTab, isActive: boolean) => {
    switch (tabId) {
      case 'home':
        return (
          <motion.div
            animate={{
              y: isActive ? [-4, 1, 0] : 0,
              scale: isActive ? [0.92, 1.15, 1] : 1,
            }}
            transition={{
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <Home
              className={`w-4 h-4 transition-all duration-300 ${
                isActive
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            />
          </motion.div>
        );

      case 'explore':
        return (
          <motion.div
            animate={{
              rotate: isActive ? [0, -35, 180, 145, 0] : 0,
              scale: isActive ? [1, 1.18, 1] : 1,
            }}
            transition={{
              duration: 0.6,
              ease: [0.34, 1.3, 0.64, 1],
            }}
            className="relative flex items-center justify-center origin-center"
          >
            <Compass
              className={`w-4 h-4 transition-all duration-300 ${
                isActive
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            />
          </motion.div>
        );

      case 'search':
        return (
          <motion.div
            animate={{
              rotateY: isActive ? [0, 180, 360] : 0,
              scale: isActive ? [1, 1.25, 1] : 1,
              rotate: isActive ? [0, -18, 12, 0] : 0,
            }}
            transition={{
              duration: 0.55,
              ease: [0.25, 1, 0.5, 1],
            }}
            style={{ perspective: 400 }}
            className="relative flex items-center justify-center"
          >
            <Search
              className={`w-4 h-4 transition-all duration-300 ${
                isActive
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            />
          </motion.div>
        );

      case 'watchlist':
        return (
          <motion.div
            animate={{
              y: isActive ? [-15, 2, 0] : 0,
              opacity: isActive ? [0.3, 1, 1] : 1,
              scaleY: isActive ? [0.65, 1.18, 1] : 1,
            }}
            transition={{
              duration: 0.45,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="relative flex items-center justify-center overflow-visible"
          >
            <Bookmark
              className={`w-4 h-4 transition-all duration-300 ${
                isActive
                  ? 'text-white fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            />
          </motion.div>
        );

      case 'profile':
      default:
        return (
          <motion.div
            animate={{
              rotate: isActive ? [0, -14, 14, -6, 0] : 0,
              scale: isActive ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 0.45,
              ease: [0.25, 1, 0.5, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <User
              className={`w-4 h-4 transition-all duration-300 ${
                isActive
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pointer-events-none flex justify-center safe-bottom">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto liquid-glass rounded-full px-2 py-1.5 flex items-center justify-between gap-1 shadow-2xl max-w-sm w-full"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onTabChange(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full text-xs transition-colors min-h-[44px] cursor-pointer"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavTab"
                  className="absolute inset-0 bg-[#262b37] rounded-full shadow-inner"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {renderNavIcon(tab.id, isActive)}
                <span
                  className={`text-[10px] tracking-tight font-medium transition-colors duration-200 ${
                    isActive ? 'text-white font-semibold' : 'text-neutral-400'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};


