import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { motion } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'pill' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();

  // Only show when installable and not already installed
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleClick = async () => {
    await install();
  };

  if (variant === 'navbar') {
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        type="button"
        onClick={handleClick}
        className={`h-9 px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/10 text-xs font-semibold shrink-0 ${className}`}
        aria-label="Install Refra"
        title="Install Refra"
      >
        <Download className="w-3.5 h-3.5 text-neutral-300" />
        <span className="hidden xs:inline sm:inline">Install</span>
      </motion.button>
    );
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.96] ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`px-3.5 py-1.5 rounded-full bg-white text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-[0.96] ${className}`}
    >
      <Smartphone className="w-3.5 h-3.5" />
      <span>Install</span>
    </button>
  );
};
