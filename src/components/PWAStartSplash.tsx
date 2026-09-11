import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAStartSplashProps {
  onComplete?: () => void;
}

export const PWAStartSplash: React.FC<PWAStartSplashProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Check if already displayed in this browser session
    const shown = sessionStorage.getItem('refra_splash_shown');
    return !shown;
  });

  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('refra_splash_shown', 'true');
    }
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Listen for manual replay events (e.g. from Settings or Profile)
    const handleReplay = () => {
      setIsVisible(true);
    };

    window.addEventListener('refra:replay-splash', handleReplay);
    return () => window.removeEventListener('refra:replay-splash', handleReplay);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Fluid auto-dismiss after ~1.35 seconds
    const timer = setTimeout(() => {
      dismiss();
    }, 1350);

    return () => clearTimeout(timer);
  }, [isVisible, dismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="refra-pwa-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.98,
            y: -12,
            transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
          }}
          onClick={dismiss}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0d10] select-none cursor-pointer overflow-hidden safe-top safe-bottom"
          style={{ willChange: 'opacity, transform' }}
          role="dialog"
          aria-label="Refra Starting Screen"
        >
          {/* Subtle Ambient Refraction Aura behind logo */}
          <div
            className="absolute w-72 h-72 rounded-full pointer-events-none opacity-40 blur-3xl"
            style={{
              background: 'radial-gradient(circle, rgba(232,0,24,0.3) 0%, rgba(12,13,16,0) 70%)',
            }}
          />

          {/* Central Logo Container */}
          <motion.div
            initial={{ scale: 0.84, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1], // power3.out fluid-dynamics curve
            }}
            className="relative flex flex-col items-center gap-5"
          >
            {/* Logo Badge */}
            <div className="relative">
              {/* Refraction edge highlight */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-black border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.12)] p-2.5 flex items-center justify-center overflow-hidden">
                <img
                  src="/refra_logo_vector.svg"
                  alt="Refra"
                  className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(250,0,25,0.35)]"
                />
              </div>

              {/* Gentle ambient ring pulse */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: 1.08, opacity: 0 }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  ease: 'easeOut',
                }}
                className="absolute inset-0 rounded-3xl border border-[#FA0019]/40 pointer-events-none"
              />
            </div>

            {/* Typography */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <h1 className="text-xl sm:text-2xl font-black tracking-[0.25em] text-white pl-[0.25em]">
                REFRA
              </h1>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-neutral-400 uppercase pl-[0.2em]">
                4K Ad-Free Cinema
              </p>
            </motion.div>

            {/* Discreet Fluid Launch Shimmer */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 48, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              className="h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#FA0019] to-transparent"
            />
          </motion.div>

          {/* Quick skip hint */}
          <div className="absolute bottom-8 text-[11px] text-neutral-600 font-medium tracking-wide">
            Tap anywhere to enter
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
