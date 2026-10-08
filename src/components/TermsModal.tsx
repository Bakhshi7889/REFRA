import React, { useEffect } from 'react';
import { X, FileText, AlertTriangle, Scale, ShieldAlert, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lockScroll } from '../utils/scrollLock';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
                <Scale className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Terms of Service &amp; DMCA</h3>
                <p className="text-xs text-neutral-400">Decentralized indexing &amp; compliance framework</p>
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
            {/* Disclaimer Alert */}
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Non-Hosting Client Architecture</span>
              </div>
              <p className="text-xs text-neutral-300">
                Refra is an open-standard media catalog indexer and user client interface. Refra does not host, upload, maintain, or control any video, audio, or media files on its servers.
              </p>
            </div>

            {/* Section 1: Service Description */}
            <div className="space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-400" />
                <span>1. Nature of the Protocol</span>
              </h4>
              <p className="text-neutral-400">
                Refra provides an interface that retrieves public metadata from third-party APIs (including TMDB, AniList, and TVMaze) and parses decentralized stream locators. All streaming content is provided by unaffiliated third-party services over which Refra exercises no editorial control.
              </p>
            </div>

            {/* Section 2: Acceptable Use */}
            <div className="space-y-2">
              <h4 className="text-white font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-neutral-400" />
                <span>2. Personal &amp; Fair Use</span>
              </h4>
              <p className="text-neutral-400">
                You agree to use this client solely for personal, non-commercial media discovery. You are responsible for ensuring that your access and playback comply with your local intellectual property laws and copyright regulations.
              </p>
            </div>

            {/* Section 3: DMCA / Takedown Compliance */}
            <div className="space-y-2">
              <h4 className="text-white font-bold">3. DMCA &amp; Copyright Compliance</h4>
              <p className="text-neutral-400">
                Refra respects intellectual property rights and adheres to the provisions of the Digital Millennium Copyright Act (17 U.S.C. § 512). Because no copyrighted media is hosted on our infrastructure, takedown requests regarding streaming files should be directed to the respective third-party hosting providers. However, for any concerns regarding metadata or interface listings, you may contact our legal desk via the Contact modal.
              </p>
            </div>

            {/* Section 4: Limitation of Liability */}
            <div className="space-y-2">
              <h4 className="text-white font-bold">4. Limitation of Liability</h4>
              <p className="text-neutral-400">
                The software and services are provided &quot;as is&quot;, without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of the client.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
            <span className="text-[11px] text-neutral-500">Effective: 2026 Edition</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                color: 'var(--btn-primary-text, #0a0a0c)',
              }}
            >
              Accept &amp; Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
