import React, { useState, useEffect, useRef } from 'react';
import { Cast, Bell, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { scrollToTop } from '../utils/smoothScroll';

interface NavbarProps {
  onOpenCast: () => void;
  onOpenNotifications: () => void;
  isCastOpen?: boolean;
  isNotificationsOpen?: boolean;
  isCastConnected?: boolean;
  connectedDeviceName?: string | null;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCast,
  onOpenNotifications,
  isCastOpen = false,
  isNotificationsOpen = false,
  isCastConnected = false,
  connectedDeviceName = null,
  unreadCount = 0,
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
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
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none px-4 sm:px-6 md:px-8 lg:px-10 pt-3.5 sm:pt-4 md:pt-5 flex justify-between items-center w-full max-w-7xl mx-auto safe-top"
    >
      {/* Refra Brand Pill */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={() => {
          scrollToTop();
        }}
        className="pointer-events-auto liquid-glass liquid-glass-pill rounded-full pl-2.5 pr-3.5 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-2.5 bg-[#101218]/65 border border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.4)] cursor-pointer hover:bg-white/10 transition-colors"
        aria-label="Refra Home"
        title="Refra — 4K Ad-Free Cinema"
      >
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-black flex items-center justify-center border border-white/10 shrink-0">
          <img
            src="/refra_logo_vector.svg"
            alt="Refra"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-[12px] sm:text-[13px] font-extrabold tracking-widest text-white/90">REFRA</span>
      </motion.button>

      <div className="pointer-events-auto liquid-glass liquid-glass-pill rounded-full px-2 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 max-w-fit relative overflow-hidden bg-[#101218]/65 border-white/12 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        {/* Chrome Native PWA Install Button */}
        {!isInstalled && isInstallable && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={async () => {
              await install();
            }}
            className="h-9 px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold"
            aria-label="Install Refra"
            title="Install Refra"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden sm:inline">Install</span>
          </motion.button>
        )}

        {/* Cast Button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={onOpenCast}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer relative ${
            isCastOpen || isCastConnected
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          aria-label={isCastConnected ? `Casting to ${connectedDeviceName || 'Screen'}` : 'Cast to Screen or External Player'}
        >
          <motion.div
            animate={{
              scale: isCastConnected ? [1, 1.25, 1] : 1,
              rotate: isCastConnected ? [0, -8, 8, 0] : 0,
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Cast
              className={`w-4 h-4 transition-all duration-200 ${
                isCastOpen || isCastConnected
                  ? 'text-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
                  : 'text-neutral-300 hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
          </motion.div>

          {isCastConnected && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-1 ring-white" />
          )}
        </motion.button>

        {/* Notification Bell */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => {
            setIsBellActive(true);
            setTimeout(() => setIsBellActive(false), 600);
            onOpenNotifications();
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 relative cursor-pointer ${
            isNotificationsOpen
              ? 'bg-white text-black shadow-md'
              : 'text-neutral-300 hover:text-white hover:bg-white/10'
          }`}
          aria-label="Notifications"
        >
          <motion.div
            animate={{
              rotate: isBellActive ? [0, 24, -22, 16, -10, 0] : 0,
              scale: isBellActive ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.65, ease: [0.34, 1.3, 0.64, 1] }}
            className="origin-top relative"
          >
            <Bell
              className={`w-4 h-4 transition-all duration-200 ${
                isNotificationsOpen
                  ? 'text-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
                  : isBellActive
                  ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                  : 'text-neutral-300 hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]'
              }`}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-white text-black text-[9px] font-bold flex items-center justify-center ring-1 ring-[#101218] shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.div>
        </motion.button>
      </div>
    </motion.header>
  );
};
