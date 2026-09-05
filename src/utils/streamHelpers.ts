import { StreamItem } from '../types';

export const PROVIDER_IMAGE_LOGOS: Record<string, string> = {
  pengu: 'https://pengu.uk/penguplay-icon.png',
  penguplay: 'https://pengu.uk/penguplay-icon.png',
  torrentsdb: 'https://torrents-db.com/logo.png',
  torrentio: 'https://torrentio.strem.fun/images/logo.png',
  comet: 'https://comet.elfhosted.com/logo.png',
  thepiratebay: 'https://thepiratebay.org/static/img/tpb.jpg',
  tpb: 'https://thepiratebay.org/static/img/tpb.jpg',
  kort: 'https://raw.githubusercontent.com/MrKort/kort/main/icon.png',
  netflix: 'https://assets.nflxext.com/ffe/siteui/common/icons/nficon2016.ico',
  mediafusion: 'https://mediafusion.elfhosted.com/static/mediafusion_logo.png',
  easynews: 'https://www.easynews.com/favicon.ico',
  debrid: 'https://real-debrid.com/favicon.ico',
  realdebrid: 'https://real-debrid.com/favicon.ico',
  alldebrid: 'https://alldebrid.com/favicon.ico',
  premiumize: 'https://www.premiumize.me/favicon.ico',
};

export const getProviderLogo = (serverName?: string, logoUrl?: string): string => {
  if (logoUrl) return logoUrl;
  const norm = (serverName || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(PROVIDER_IMAGE_LOGOS)) {
    if (norm.includes(key)) {
      return val;
    }
  }
  return 'https://pengu.uk/penguplay-icon.png';
};

export const getStreamBytes = (stream: StreamItem): number => {
  if (stream.fileSizeBytes && stream.fileSizeBytes > 0) {
    return stream.fileSizeBytes;
  }
  const str = (stream.fileSize || '').toLowerCase();
  const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
  if (str.includes('gb')) return num * 1024 * 1024 * 1024;
  if (str.includes('mb')) return num * 1024 * 1024;
  return num;
};

export const BEST_GREEN = 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 font-semibold';
export const STANDARD_TAG = 'text-neutral-300 bg-white/5 border border-white/10 font-medium';
export const SIZE_TAG = 'text-neutral-200 bg-white/5 border border-white/10 font-mono font-medium';

export interface StreamTag {
  id: string;
  label: string;
  className: string;
}

export const getStreamOrderedTags = (stream: StreamItem): StreamTag[] => {
  const tags: StreamTag[] = [];
  const text = `${stream.name} ${stream.specs || ''} ${stream.quality || ''} ${(stream.badges || []).join(' ')}`.toLowerCase();

  // 1. Quality (4K is Best -> Green; 1080p / 720p -> Standard)
  if (/2160|4k|uhd/i.test(text) || stream.quality === '4K') {
    tags.push({ id: 'q-4k', label: '4K', className: BEST_GREEN });
  } else if (/1080/i.test(text) || stream.quality === '1080p') {
    tags.push({ id: 'q-1080p', label: '1080p', className: STANDARD_TAG });
  } else if (/720/i.test(text) || stream.quality === '720p') {
    tags.push({ id: 'q-720p', label: '720p', className: STANDARD_TAG });
  }

  // 2. HDR10+ / HDR (Best -> Green)
  if (/hdr10\+/i.test(text)) {
    tags.push({ id: 'hdr10plus', label: 'HDR10+', className: BEST_GREEN });
  } else if (/hdr10/i.test(text)) {
    tags.push({ id: 'hdr10', label: 'HDR10', className: BEST_GREEN });
  } else if (/\bhdr\b/i.test(text)) {
    tags.push({ id: 'hdr', label: 'HDR', className: BEST_GREEN });
  }

  // 3. Vision (Best -> Green)
  if (/vision|dovi|\bdv\b/i.test(text)) {
    tags.push({ id: 'vision', label: 'Vision', className: BEST_GREEN });
  }

  // 4. 10bit (Best -> Green)
  if (/10bit|10-bit|hi10/i.test(text)) {
    tags.push({ id: '10bit', label: '10bit', className: BEST_GREEN });
  }

  // 5. Audio: Atmos & 7.1 (Best -> Green); 5.1 -> Standard
  if (/atmos/i.test(text)) {
    tags.push({ id: 'atmos', label: 'Atmos', className: BEST_GREEN });
  }
  if (/7\.1/i.test(text)) {
    tags.push({ id: 'ch-71', label: '7.1', className: BEST_GREEN });
  } else if (/5\.1/i.test(text)) {
    tags.push({ id: 'ch-51', label: '5.1', className: STANDARD_TAG });
  }

  // 6. Source Format (Remux is Best -> Green; BluRay / WebDL -> Standard)
  if (/remux/i.test(text)) {
    tags.push({ id: 'remux', label: 'Remux', className: BEST_GREEN });
  } else if (/bluray|bdrip/i.test(text)) {
    tags.push({ id: 'bluray', label: 'BluRay', className: STANDARD_TAG });
  } else if (/web-?dl|webrip/i.test(text)) {
    tags.push({ id: 'webdl', label: 'WebDL', className: STANDARD_TAG });
  }

  // 7. Size
  let cleanSize = stream.fileSize || '';
  cleanSize = cleanSize.replace(/^size\s*/i, '').trim();
  if (cleanSize) {
    tags.push({ id: 'size', label: cleanSize, className: SIZE_TAG });
  } else if (stream.fileSizeBytes) {
    const gb = stream.fileSizeBytes / (1024 * 1024 * 1024);
    const formatted = gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
    tags.push({ id: 'size', label: formatted, className: SIZE_TAG });
  }

  return tags;
};

// Calculate stream quality ranking score (4K, Vision, HDR10+, 10bit, Atmos, 7.1, Remux at top)
export const computeStreamScore = (stream: StreamItem): number => {
  let score = 0;
  const text = `${stream.name} ${stream.specs || ''} ${stream.quality || ''} ${(stream.badges || []).join(' ')}`.toLowerCase();

  // PenguPlay preferred server boost
  if (/pengu/i.test(stream.serverName || '') || /pengu/i.test(stream.name || '')) {
    score += 1500;
  }

  // Resolution weight: 4K gets top priority
  if (/2160|4k|uhd/i.test(text) || stream.quality === '4K') score += 10000;
  else if (/1080/i.test(text) || stream.quality === '1080p') score += 5000;
  else if (/720/i.test(text) || stream.quality === '720p') score += 2000;
  else score += 500;

  // Dolby Vision
  if (/vision|dovi|\bdv\b/i.test(text)) score += 1200;

  // HDR10+ / HDR
  if (/hdr10\+/i.test(text)) score += 900;
  else if (/hdr10|\bhdr\b/i.test(text)) score += 700;

  // 10bit
  if (/10bit|10-bit|hi10/i.test(text)) score += 500;

  // Audio: Dolby Atmos & 7.1
  if (/atmos/i.test(text)) score += 600;
  if (/7\.1/i.test(text)) score += 500;
  else if (/5\.1/i.test(text)) score += 300;
  if (/truehd|dts-hd/i.test(text)) score += 300;

  // Source / Remux
  if (/remux/i.test(text)) score += 400;
  else if (/bluray/i.test(text)) score += 250;
  else if (/web-?dl/i.test(text)) score += 150;

  // Higher file size / bitrate bonus
  const sizeGb = (stream.fileSizeBytes || 0) / (1024 * 1024 * 1024);
  score += Math.min(sizeGb * 10, 300);

  return score;
};
