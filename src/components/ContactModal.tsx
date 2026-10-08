import React, { useState, useEffect } from 'react';
import { X, Mail, Send, MessageSquare, Shield, HelpCircle, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lockScroll } from '../utils/scrollLock';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<'stream' | 'feature' | 'dmca' | 'general'>('stream');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    // Basic email check
    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    // Simulate sending inquiry to Refra Headquarters Dispatch
    setTimeout(() => {
      const ticketNumber = Math.floor(10000 + Math.random() * 90000);
      const ticketId = `REF-${new Date().getFullYear()}-${ticketNumber}`;
      setIsSubmitting(false);
      setName('');
      setEmail('');
      setMessage('');
      onClose();
      onSuccess(ticketId);
    }, 600);
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

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10"
          style={{
            backgroundColor: 'var(--glass-sheet-bg, rgba(14, 16, 22, 0.96))',
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
                <Mail className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Contact Studio</h3>
                <p className="text-xs text-neutral-400">Headquarters dispatch &amp; community support</p>
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

          {/* Body Form */}
          <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 text-xs sm:text-sm custom-scrollbar">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Inquiry Topic</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'stream', label: 'Streaming / Addon', icon: MessageSquare },
                  { id: 'feature', label: 'Feature Request', icon: HelpCircle },
                  { id: 'dmca', label: 'DMCA / Legal Notice', icon: Shield },
                  { id: 'general', label: 'General Feedback', icon: Mail },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as any)}
                    className="p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer text-xs"
                    style={{
                      backgroundColor: category === item.id ? 'var(--badge-bg, rgba(255, 255, 255, 0.15))' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: category === item.id ? 'var(--color-accent, #ffffff)' : 'rgba(255, 255, 255, 0.08)',
                      color: category === item.id ? '#ffffff' : '#a3a3a3',
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-medium truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Message Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Message / Details</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry, stream bug, or request..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.96]"
                style={{
                  backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                  color: 'var(--btn-primary-text, #0a0a0c)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
