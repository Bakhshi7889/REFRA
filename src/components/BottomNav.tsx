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
              scale: isActive ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <Home
              className={`w-4 h-4 transition-all duration-150 ${
                isActive
                  ? 'text-white nav-svg-shadow-active drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-neutral-400 hover:text-neutral-200 nav-svg-shadow drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>
        );

      case 'explore':
        return (
          <motion.div
            animate={{
              rotate: isActive ? [0, 45, 0] : 0,
              scale: isActive ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative flex items-center justify-center origin-center"
          >
            <Compass
              className={`w-4 h-4 transition-all duration-150 ${
                isActive
                  ? 'text-white nav-svg-shadow-active drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-neutral-400 hover:text-neutral-200 nav-svg-shadow drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>
        );

      case 'search':
        return (
          <motion.div
            animate={{
              scale: isActive ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <Search
              className={`w-4 h-4 transition-all duration-150 ${
                isActive
                  ? 'text-white nav-svg-shadow-active drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-neutral-400 hover:text-neutral-200 nav-svg-shadow drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>
        );

      case 'watchlist':
        return (
          <motion.div
            animate={{
              scale: isActive ? [1, 1.18, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative flex items-center justify-center overflow-visible"
          >
            <Bookmark
              className={`w-4 h-4 transition-all duration-150 ${
                isActive
                  ? 'text-white fill-white nav-svg-shadow-active drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-neutral-400 hover:text-neutral-200 nav-svg-shadow drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>
        );

      case 'profile':
      default:
        return (
          <motion.div
            animate={{
              scale: isActive ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative flex items-center justify-center"
          >
            <User
              className={`w-4 h-4 transition-all duration-150 ${
                isActive
                  ? 'text-white nav-svg-shadow-active drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]'
                  : 'text-neutral-400 hover:text-neutral-200 nav-svg-shadow drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>
        );
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-5 pt-2 sm:pb-6 pointer-events-none flex justify-center safe-bottom">
      <nav
        aria-label="Bottom Navigation"
        className="pointer-events-auto liquid-glass liquid-glass-pill rounded-full px-2 py-1.5 flex items-center justify-between gap-1 max-w-sm w-full relative bg-[#101218]/65 border-white/12 shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onTabChange(tab.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-full text-xs transition-colors min-h-[44px] cursor-pointer overflow-hidden"
              aria-label={tab.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomTabIndicator"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  style={{ willChange: 'transform, opacity' }}
                  className="absolute inset-0.5 rounded-full bg-neutral-900/40 border border-white/15 shadow-[inset_0_1.2px_1px_rgba(255,255,255,0.22),inset_0_-1px_1px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.35)] pointer-events-none"
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {renderNavIcon(tab.id, isActive)}
                <span
                  className={`text-[10px] tracking-tight font-medium transition-colors duration-150 ${
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


