import React, { useEffect } from 'react';
import { X, ShieldCheck, Lock, Database, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lockScroll } from '../utils/scrollLock';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const unlock = lockScroll();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      unlock();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
          style={{
            backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.95))',
            borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.20)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center border"
                style={{
                  backgroundColor: 'var(--badge-bg, rgba(255, 255, 255, 0.08))',
                  borderColor: 'var(--badge-border, rgba(255, 255, 255, 0.15))',
                }}
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Privacy Policy</h3>
                <p className="text-xs text-neutral-400">Local-first, zero-tracking cinema protocol</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto px-6 py-6 space-y-6 text-xs sm:text-sm text-neutral-300 leading-relaxed custom-scrollbar">
            {/* Core Principle Card */}
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Telemetry Guarantee</span>
              </div>
              <p className="text-xs text-neutral-300">
                Refra is built on a strict zero-telemetry, local-first paradigm. We do not track, collect, monetize, or transmit your viewing history, IP address, device fingerprints, or personal identifiers.
              </p>
            </div>

            {/* Section 1: Data Storage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Database className="w-4 h-4 text-neutral-400" />
                <span>1. Local-First Client Storage (IndexedDB)</span>
              </div>
              <p className="text-neutral-400">
                Your bookmarks, watchlist, continue watching progress, playback volume, and UI customization choices are stored exclusively on your device within your browser’s isolated IndexedDB sandboxed database. This data never leaves your client unless you manually export a backup JSON file or authenticate with your own Trakt.tv account.
              </p>
            </div>

            {/* Section 2: Cookies & Analytics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <EyeOff className="w-4 h-4 text-neutral-400" />
                <span>2. No Third-Party Tracking Cookies</span>
              </div>
              <p className="text-neutral-400">
                Refra utilizes zero third-party tracking scripts, marketing pixels, or analytics trackers (such as Google Analytics or Meta Pixel). The only stored browser item is a local preference flag noting that you acknowledged our local-storage and compliance disclosures.
              </p>
            </div>

            {/* Section 3: Third-Party Indexers & Media Streams */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <Lock className="w-4 h-4 text-neutral-400" />
                <span>3. Decentralized Indexers & Embeds</span>
              </div>
              <p className="text-neutral-400">
                Refra operates as a decentralized client interface. Film metadata and artwork are indexed dynamically from public APIs (such as TMDB and AniList). Video stream sources and torrent manifests are queried via independent community endpoints. External embed servers may log requests in according with their own independent host privacy practices.
              </p>
            </div>

            {/* Section 4: Your Rights */}
            <div className="space-y-2">
              <h4 className="text-white font-bold">4. GDPR & CCPA Compliance Rights</h4>
              <p className="text-neutral-400">
                Because Refra stores zero user data on remote servers, you maintain total sovereign control over your information. You can permanently erase all local watch history, cached artwork, and stored preferences at any time from the Profile settings tab with one click.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
            <span className="text-[11px] text-neutral-500">Updated: September 2026</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                color: 'var(--btn-primary-text, #0a0a0c)',
              }}
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
