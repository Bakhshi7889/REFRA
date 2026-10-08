import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('refra_cookie_consent');
      if (!consent) {
        // Small delay for smooth entry after initial paint
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('refra_cookie_consent', 'true');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Cookie and Privacy Consent"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-24 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40"
      >
        <div
          className="rounded-3xl border p-4 sm:p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden"
          style={{
            backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.96))',
            borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.20)',
          }}
        >
          <div className="flex items-start gap-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 mt-0.5"
              style={{
                backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.08))',
                borderColor: 'var(--badge-border, rgba(255, 255, 255, 0.15))',
              }}
            >
              <Cookie className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Zero Telemetry &amp; Local Storage
                </h4>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-neutral-400 leading-relaxed mb-3.5">
                Refra uses local-first IndexedDB storage to preserve your watchlist and custom settings directly on your device. We use zero marketing trackers or third-party cookies.
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.96] shadow-md shadow-black/30"
                  style={{
                    backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                    color: 'var(--btn-primary-text, #0a0a0c)',
                  }}
                >
                  Acknowledge &amp; Accept
                </button>

                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
