import React, { useState, useEffect } from 'react';
import { CheckCircle2, Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lockScroll } from '../utils/scrollLock';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId?: string;
}

export const ThankYouModal: React.FC<ThankYouModalProps> = ({ isOpen, onClose, ticketId }) => {
  const [copied, setCopied] = useState(false);

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

  const handleCopyTicket = () => {
    if (ticketId) {
      navigator.clipboard.writeText(ticketId).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 text-center z-10 overflow-hidden"
          style={{
            backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.96))',
            borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.15))',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.20)',
          }}
        >
          {/* Close corner */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Success Icon */}
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
            Dispatch Received
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
            Thank you for reaching out to Refra. Your inquiry has been routed to our protocol maintenance desk.
          </p>

          {ticketId && (
            <div className="mb-6 p-3.5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between gap-3 text-xs">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Reference ID</span>
                <span className="font-mono font-bold text-white">{ticketId}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyTicket}
                className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.96]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-[0.96]"
            style={{
              backgroundColor: 'var(--btn-primary-bg, #ffffff)',
              color: 'var(--btn-primary-text, #0a0a0c)',
            }}
          >
            Return to Refra
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
