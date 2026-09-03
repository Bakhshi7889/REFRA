import React, { useState, useEffect, useRef } from 'react';
import { Cast, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar: React.FC = () => {
  const [isCastConnected, setIsCastConnected] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [isBellActive, setIsBellActive] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - lastScrollY.current;

          // Always visible at the top of the page
          if (currentScrollY <= 40) {
            setIsVisible(true);
          } else if (delta > 10) {
            // Scrolling down with clear threshold -> smooth hide
            setIsVisible(false);
          } else if (delta < -8) {
            // Scrolling up with clear threshold -> smooth show
            setIsVisible(true);
          }

          lastScrollY.current = Math.max(0, currentScrollY);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Floating Action Pill (Top Right, Ultra-Smooth Scroll-Aware, Pure Liquid Glass) */}
      <motion.header
        initial={{ y: 0 }}
        animate={{
          y: isVisible ? 0 : -72,
        }}
        transition={{
          type: 'spring',
          stiffness: 340,
          damping: 30,
          mass: 0.5,
        }}
        style={{
          willChange: 'transform',
        }}
        className="fixed top-0 left-0 right-0 z-40 pointer-events-none px-4 pt-3.5 flex justify-end max-w-md sm:max-w-xl md:max-w-2xl mx-auto safe-top"
      >
        <div className="pointer-events-auto liquid-glass rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl">
          {/* Cast Button */}
          <motion.button
            whileTap={{ scale: 0.86 }}
            type="button"
            onClick={() => setIsCastConnected(!isCastConnected)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isCastConnected
                ? 'bg-neutral-200 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Cast to screen"
          >
            <motion.div
              animate={{
                scale: isCastConnected ? [1, 1.25, 1] : 1,
                rotate: isCastConnected ? [0, -8, 8, 0] : 0,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <Cast
                className={`w-4 h-4 transition-all duration-300 ${
                  isCastConnected
                    ? 'text-neutral-950 drop-shadow-[0_0_6px_rgba(0,0,0,0.4)]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              />
            </motion.div>
          </motion.button>

          {/* Notification Bell */}
          <motion.button
            whileTap={{ scale: 0.86 }}
            type="button"
            onClick={() => {
              setIsBellActive(true);
              setShowNotificationToast(true);
              setTimeout(() => setIsBellActive(false), 900);
              setTimeout(() => setShowNotificationToast(false), 3000);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors duration-300 relative cursor-pointer"
            aria-label="Notifications"
          >
            <motion.div
              animate={{
                rotate: isBellActive ? [0, 24, -22, 16, -10, 0] : 0,
                scale: isBellActive ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.65, ease: [0.34, 1.3, 0.64, 1] }}
              className="origin-top"
            >
              <Bell
                className={`w-4 h-4 transition-all duration-300 ${
                  isBellActive
                    ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                    : 'text-neutral-300 hover:text-white'
                }`}
              />
            </motion.div>
          </motion.button>
        </div>
      </motion.header>

      {/* Cast & Notification Toasts */}
      <div className="fixed top-16 left-0 right-0 z-50 pointer-events-none flex flex-col items-center px-4 space-y-2">
        <AnimatePresence>
          {isCastConnected && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="pointer-events-auto py-2 px-4 rounded-full liquid-glass text-neutral-200 text-xs flex items-center gap-2 shadow-2xl"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              <span>Casting to Living Room Cinema (4K OLED)</span>
              <button
                type="button"
                onClick={() => setIsCastConnected(false)}
                className="ml-2 text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showNotificationToast && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className="pointer-events-auto py-2 px-4 rounded-full liquid-glass text-neutral-200 text-xs text-center shadow-2xl"
            >
              Dune: Part Two is now streaming in IMAX Enhanced
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

