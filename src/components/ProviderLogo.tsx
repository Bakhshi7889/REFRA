import React, { useState } from 'react';
import { PENGU_PLAY_LOGO_DATA_URI } from '../utils/penguLogoBase64';

interface ProviderLogoProps {
  serverName?: string;
  logoUrl?: string;
  className?: string;
}

export const ProviderLogo: React.FC<ProviderLogoProps> = ({
  serverName = 'PenguPlay',
  logoUrl,
  className = 'w-10 h-10',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const norm = (serverName || '').toLowerCase().trim();

  // 1. PenguPlay: Always use official PenguPlay logo
  if (
    norm.includes('pengu') ||
    norm.includes('pingu') ||
    norm === '' ||
    norm.includes('refra') ||
    (logoUrl && logoUrl.includes('pengu'))
  ) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none`}>
        <img
          src={PENGU_PLAY_LOGO_DATA_URI}
          alt={serverName || 'PenguPlay'}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          loading="lazy"
        />
      </div>
    );
  }

  // 2. The Pirate Bay / ThePirateBay+ (TPB) - Authentic official galleon logo
  if (norm.includes('pirate') || norm.includes('tpb')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none rounded-xl bg-[#1e1710]/80 p-0.5 border border-amber-900/40 shadow-sm`}>
        <img
          src="/icons/thepiratebay.png"
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://i.imgur.com/dPa2clS.png';
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // 3. TorrentClaw / TorrentClaw (EN) - Authentic official TorrentClaw logo
  if (norm.includes('torrentclaw') || norm.includes('claw')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none rounded-xl bg-[#0b0f19]/90 p-0.5 border border-cyan-500/30 shadow-sm`}>
        <img
          src="/icons/torrentclaw.png"
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://torrentclaw.com/icon-512.png';
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // 4. Comet - Authentic official Comet logo
  if (norm.includes('comet')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none rounded-xl bg-[#120a21]/90 p-0.5 border border-purple-500/30 shadow-sm`}>
        <img
          src="/icons/comet.png"
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/g0ldyy/comet/refs/heads/main/comet/assets/icon.png';
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // 5. Torrentio - Authentic official Torrentio logo
  if (norm.includes('torrentio')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none rounded-xl bg-[#0d2818]/90 p-0.5 border border-emerald-500/30 shadow-sm`}>
        <img
          src="/icons/torrentio.png"
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/TheBeastLT/torrentio-scraper/master/addon/static/images/logo_v1.png';
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // 6. TorrentsDB - Authentic official TorrentsDB logo
  if (norm.includes('torrentsdb') || norm.includes('tdb')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none rounded-xl bg-[#0c1a2d]/90 p-0.5 border border-cyan-500/30 shadow-sm`}>
        <img
          src="/icons/torrentsdb.svg"
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://torrentsdb.com/icon.svg';
          }}
          loading="lazy"
        />
      </div>
    );
  }

  // 7. If custom/external image URL is valid and hasn't failed, render it
  if (logoUrl && !imgFailed) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none`}>
        <img
          src={logoUrl}
          alt={serverName}
          className="w-full h-full object-contain pointer-events-none drop-shadow"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // 8. Netflix
  if (norm.includes('netflix')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 rounded-xl bg-black border border-red-600/50 shadow-md select-none`}>
        <span className="text-red-600 font-black text-xl font-sans tracking-tight">N</span>
      </div>
    );
  }

  // 9. HdHub / 4KHDHub
  if (norm.includes('hdhub') || norm.includes('4khdhub')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 rounded-xl bg-[#18181b] border border-amber-400/40 shadow-md p-1 select-none`}>
        <span className="text-[10px] sm:text-xs font-black tracking-tighter text-amber-400 font-mono">
          4K<span className="text-white">HD</span>
        </span>
      </div>
    );
  }

  // 10. WebStreamr
  if (norm.includes('webstreamr')) {
    return (
      <div className={`${className} flex items-center justify-center shrink-0 rounded-xl bg-[#032b43] border border-cyan-400/40 shadow-md p-1 select-none`}>
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full text-cyan-400">
          <circle cx="24" cy="24" r="4" fill="currentColor" />
          <path d="M16 16a11 11 0 0116 0M12 12a17 17 0 0124 0M16 32a11 11 0 0016 0M12 36a17 17 0 0024 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default: Official PenguPlay logo
  return (
    <div className={`${className} flex items-center justify-center shrink-0 relative overflow-hidden select-none`}>
      <img
        src={PENGU_PLAY_LOGO_DATA_URI}
        alt={serverName || 'PenguPlay'}
        className="w-full h-full object-contain pointer-events-none drop-shadow"
        loading="lazy"
      />
    </div>
  );
};
