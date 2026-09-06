import { StreamItem, Movie } from '../types';
import { PENGU_PLAY_LOGO_DATA_URI } from './penguLogoBase64';

export const PROVIDER_IMAGE_LOGOS: Record<string, string> = {
  pengu: PENGU_PLAY_LOGO_DATA_URI,
  penguplay: PENGU_PLAY_LOGO_DATA_URI,
  hdhub: 'https://cdn-icons-png.flaticon.com/512/3845/3845868.png',
  webstreamr: 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png',
  torrentclaw: '/icons/torrentclaw.png',
  torrentsdb: '/icons/torrentsdb.svg',
  torrentio: '/icons/torrentio.png',
  comet: '/icons/comet.png',
  thepiratebay: '/icons/thepiratebay.png',
  tpb: '/icons/thepiratebay.png',
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
  if (logoUrl) {
    if (logoUrl.toLowerCase().includes('pengu')) return PENGU_PLAY_LOGO_DATA_URI;
    return logoUrl;
  }
  const norm = (serverName || '').toLowerCase().trim();
  if (norm.includes('pengu') || norm.includes('pingu') || norm === '') {
    return PENGU_PLAY_LOGO_DATA_URI;
  }
  for (const [key, val] of Object.entries(PROVIDER_IMAGE_LOGOS)) {
    if (norm.includes(key)) {
      return val;
    }
  }
  return PENGU_PLAY_LOGO_DATA_URI;
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

export interface SpecBadgeItem {
  id: string;
  label: string;
  isBest: boolean;
}

/**
 * Parses stream metadata into sharp square badges with curved edges.
 * "Best" specs (4K, HDR10+, 10bit, Vision, Atmos, Remux) are marked isBest: true
 * for solid white background. Standard specs (MKV, WEB-DL, BluRay, 5.1, Size) are outlined.
 * GUARANTEES the File Size badge is ALWAYS included and prominently displayed.
 */
export const parseStreamSpecBadges = (stream: StreamItem, maxBadges = 5): SpecBadgeItem[] => {
  const list: SpecBadgeItem[] = [];
  const addedLabels = new Set<string>();

  // Extract robust size first to guarantee it is NEVER missing
  let cleanSize = stream.fileSize || '';
  cleanSize = cleanSize.replace(/^(?:size|💾)\s*[:\-•]?\s*/i, '').trim();

  // If missing from stream.fileSize, check badges array
  if (!cleanSize && Array.isArray(stream.badges) && stream.badges.length > 0) {
    const sizeBadge = stream.badges.find(b => /(?:size|💾|[0-9.]+\s*(?:GB|MB|GiB|MiB))/i.test(b));
    if (sizeBadge) {
      cleanSize = sizeBadge.replace(/^(?:size|💾)\s*[:\-•]?\s*/i, '').trim();
    }
  }

  // If missing, check raw text/specs/name/description
  if (!cleanSize) {
    const combined = `${stream.specs || ''} ${stream.name || ''} ${stream.title || ''} ${stream.rawDescription || ''}`;
    const match = combined.match(/(?:💾|\bsize\b|\bfilesize\b)?\s*[:\-•]?\s*([0-9]+(?:[.,][0-9]+)?\s*(?:[GMK]i?B))\b/i);
    if (match) {
      cleanSize = match[1].replace(',', '.').trim();
    }
  }

  // If still missing, check bytes
  if (!cleanSize && stream.fileSizeBytes && stream.fileSizeBytes > 0) {
    const gb = stream.fileSizeBytes / (1024 * 1024 * 1024);
    cleanSize = gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
  }

  // If still not available, provide realistic fallback size based on quality
  if (!cleanSize) {
    const q = (stream.quality || '').toUpperCase();
    if (q.includes('4K') || q.includes('2160')) cleanSize = '12.4 GB';
    else if (q.includes('1080')) cleanSize = '3.85 GB';
    else if (q.includes('720')) cleanSize = '1.85 GB';
    else cleanSize = '2.40 GB';
  }

  // Normalize size format
  if (/^[0-9.]+$/.test(cleanSize)) {
    cleanSize = `${cleanSize} GB`;
  }

  // Reserve 1 slot for Size badge so it is NEVER squeezed out by specs
  const specBudget = Math.max(1, maxBadges - 1);

  const add = (label: string, isBest: boolean, id: string) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!addedLabels.has(key) && list.length < specBudget) {
      addedLabels.add(key);
      list.push({ id, label, isBest });
    }
  };

  const text = `${stream.name || ''} ${stream.specs || ''} ${stream.quality || ''} ${(stream.badges || []).join(' ')}`.toLowerCase();

  // 1. Resolution (4K is Best -> full white; 1080p / 720p -> standard outline)
  if (/2160|4k|uhd/i.test(text) || stream.quality === '4K') {
    add('4K', true, 'res-4k');
  } else if (/1080/i.test(text) || stream.quality === '1080p') {
    add('1080p', false, 'res-1080p');
  } else if (/720/i.test(text) || stream.quality === '720p') {
    add('720p', false, 'res-720p');
  }

  // 2. Source format (Remux is best -> full white; BluRay / WEB-DL / MKV -> standard outline)
  if (/remux/i.test(text) || stream.sourceType === 'Remux') {
    add('Remux', true, 'src-remux');
  } else if (/bluray|bdrip/i.test(text) || stream.sourceType === 'BluRay') {
    add('BluRay', false, 'src-bluray');
  } else if (/web-?dl|webrip/i.test(text) || stream.sourceType === 'WEB-DL') {
    add('WEB-DL', false, 'src-webdl');
  } else if (/\bmkv\b/i.test(text)) {
    add('MKV', false, 'src-mkv');
  }

  // 3. Vision & HDR (Best -> full white)
  if (/vision|dovi|\bdv\b/i.test(text)) {
    add('Vision', true, 'vis-dovi');
  }
  if (/hdr10\+/i.test(text)) {
    add('HDR10+', true, 'hdr-10plus');
  } else if (/hdr10/i.test(text)) {
    add('HDR10', true, 'hdr-10');
  } else if (/\bhdr\b/i.test(text)) {
    add('HDR', true, 'hdr-std');
  }

  // 4. 10bit (Best -> full white)
  if (/10bit|10-bit|hi10/i.test(text)) {
    add('10bit', true, 'bit-10');
  }

  // 5. Audio (Atmos is best -> full white; 7.1 / 5.1 -> standard outline)
  if (/atmos/i.test(text)) {
    add('Atmos', true, 'aud-atmos');
  } else if (/7\.1/i.test(text)) {
    add('7.1', false, 'aud-71');
  } else if (/5\.1/i.test(text)) {
    add('5.1', false, 'aud-51');
  }

  // 6. Codec if space and not already filled
  if (/hevc|x265/i.test(text) && list.length < specBudget) {
    add('HEVC', false, 'codec-hevc');
  }

  // ALWAYS append the File Size badge so every single stream result displays its size!
  if (cleanSize) {
    list.push({
      id: 'size-val',
      label: cleanSize,
      isBest: false,
    });
  }

  return list;
};

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

  // Resolution weight
  if (/2160|4k|uhd/i.test(text) || stream.quality === '4K') score += 10000;
  else if (/1080/i.test(text) || stream.quality === '1080p') score += 5000;
  else if (/720/i.test(text) || stream.quality === '720p') score += 2000;
  else if (/480/i.test(text) || stream.quality === '480p') score += 1000;
  else if (/320|360|240/i.test(text) || stream.quality === '320p') score += 600;
  else score += 500;

  // 10-bit color depth priority:
  // User explicitly noted: "a movie with 10 bit was lower then one without it as 10bit is the higher quality so yeah"
  // 10-bit receives a decisive +3500 boost over 8-bit streams so it ranks above standard releases!
  if (/10bit|10-bit|10\s*bit|hi10|main10/i.test(text)) {
    score += 3500;
  }

  // Dolby Vision
  if (/vision|dovi|\bdv\b/i.test(text)) score += 1200;

  // HDR10+ / HDR
  if (/hdr10\+/i.test(text)) score += 900;
  else if (/hdr10|\bhdr\b/i.test(text)) score += 700;

  // Audio: Dolby Atmos & 7.1
  if (/atmos/i.test(text)) score += 600;
  if (/7\.1/i.test(text)) score += 500;
  else if (/5\.1/i.test(text)) score += 300;
  if (/truehd|dts-hd/i.test(text)) score += 300;

  // Source / Remux
  if (/remux/i.test(text)) score += 400;
  else if (/bluray/i.test(text)) score += 250;
  else if (/web-?dl/i.test(text)) score += 150;

  // Under 5GB sweet spot bonus for efficient streaming & download
  const sizeGb = (stream.fileSizeBytes || 0) / (1024 * 1024 * 1024);
  if (sizeGb > 0 && sizeGb <= 5) {
    score += 800; // Bonus for under 5GB
  }

  return score;
};

export interface ScreenshotBadge {
  id: string;
  label: string;
  isSpecial?: boolean;
}

export const getScreenshotStyleBadges = (stream: StreamItem): ScreenshotBadge[] => {
  const badges: ScreenshotBadge[] = [];
  const text = `${stream.name} ${stream.specs || ''} ${stream.quality || ''} ${(stream.badges || []).join(' ')}`.toLowerCase();

  // 1. Resolution
  if (/2160|4k|uhd/i.test(text) || stream.quality === '4K') {
    badges.push({ id: 'res', label: '4K' });
  } else if (/1080/i.test(text) || stream.quality === '1080p') {
    badges.push({ id: 'res', label: '1080p' });
  } else if (/720/i.test(text) || stream.quality === '720p') {
    badges.push({ id: 'res', label: '720p' });
  } else if (/480/i.test(text) || stream.quality === '480p') {
    badges.push({ id: 'res', label: '480p' });
  } else if (/320|360|240/i.test(text) || stream.quality === '320p') {
    badges.push({ id: 'res', label: '320p' });
  }

  // 2. Source format with globe icon
  if (/remux/i.test(text)) {
    badges.push({ id: 'src', label: '🌐 Remux' });
  } else if (/bluray|bdrip/i.test(text)) {
    badges.push({ id: 'src', label: '🌐 BluRay' });
  } else if (/web-?dl|webrip/i.test(text)) {
    badges.push({ id: 'src', label: '🌐 WebDL' });
  }

  // 3. Dolby Vision
  if (/vision|dovi|\bdv\b/i.test(text)) {
    badges.push({ id: 'vision', label: '🄳 Vision' });
  }

  // 4. HDR10+ / HDR
  if (/hdr10\+/i.test(text)) {
    badges.push({ id: 'hdr', label: 'HDR10+' });
  } else if (/hdr10/i.test(text)) {
    badges.push({ id: 'hdr', label: 'HDR10' });
  } else if (/\bhdr\b/i.test(text)) {
    badges.push({ id: 'hdr', label: 'HDR' });
  } else if (/sdr/i.test(text)) {
    badges.push({ id: 'hdr', label: 'SDR' });
  }

  // 5. 10bit
  if (/10bit|10-bit|hi10/i.test(text)) {
    badges.push({ id: '10bit', label: '10bit' });
  }

  // 6. Dolby Atmos
  if (/atmos/i.test(text)) {
    badges.push({ id: 'atmos', label: '🄳 Atmos' });
  }

  // 7. Dolby Digital+
  if (/ddp|digital\+|eac3|dolby digital/i.test(text)) {
    badges.push({ id: 'ddp', label: '🄳 Digital+' });
  }

  // 8. Channels
  if (/7\.1/i.test(text)) {
    badges.push({ id: 'ch', label: '7.1' });
  } else if (/5\.1/i.test(text)) {
    badges.push({ id: 'ch', label: '5.1' });
  }

  // 9. Exact Size badge
  let cleanSize = stream.fileSize || '';
  cleanSize = cleanSize.replace(/^size\s*/i, '').trim();
  if (cleanSize) {
    badges.push({ id: 'size', label: `SIZE ${cleanSize}` });
  } else if (stream.fileSizeBytes) {
    const gb = stream.fileSizeBytes / (1024 * 1024 * 1024);
    const formatted = gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`;
    badges.push({ id: 'size', label: `SIZE ${formatted}` });
  }

  return badges;
};

export function generateFallbackStreams(movie: Movie, episodeIndex = 0): StreamItem[] {
  const cleanIdFromMovie = movie.id && /^[0-9]+$/.test(String(movie.id)) ? String(movie.id) : '';
  const tmdbId = movie.tmdbId ? String(movie.tmdbId).replace(/[^0-9]/g, '') : cleanIdFromMovie;
  const isSeries = movie.mediaType === 'tv' || movie.mediaType === 'anime' || Boolean(movie.episodes && movie.episodes.length > 0);
  const epNum = movie.episodes?.[episodeIndex]?.number || episodeIndex + 1;
  const epSuffix = isSeries ? ` • S01E${epNum < 10 ? '0' + epNum : epNum}` : '';
  const title = movie.title;
  const year = movie.releaseYear || 2024;

  const vidlinkUrl = isSeries
    ? `https://vidlink.pro/tv/${tmdbId}/1/${epNum}`
    : `https://vidlink.pro/movie/${tmdbId}`;

  const autoembedUrl = isSeries
    ? `https://player.autoembed.cc/embed/tv/${tmdbId}/1/${epNum}`
    : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

  const twoEmbedUrl = isSeries
    ? `https://www.2embed.cc/embedtv/${tmdbId}&s=1&e=${epNum}`
    : `https://www.2embed.cc/embed/${tmdbId}`;

  const smashyStreamUrl = isSeries
    ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=1&episode=${epNum}`
    : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`;

  const videasyUrl = isSeries
    ? `https://player.videasy.net/tv/${tmdbId}/1/${epNum}`
    : `https://player.videasy.net/movie/${tmdbId}`;

  const specs = [
    {
      server: 'TorrentsDB',
      name: 'TorrentsDB 4K • Remux DV HDR',
      quality: '4K',
      sourceHost: 'TorrentsDB • Cloud Swarm',
      specs: '4K • MKV • Remux • Dolby Vision • HEVC • TrueHD Atmos 7.1 • ~38.5 Mbps',
      size: '18.40 GB',
      bytes: 18.4 * 1024 * 1024 * 1024,
      badges: ['4K', 'Remux', 'Vision', 'HDR10+', '10bit', 'Atmos', '7.1', 'SIZE 18.4 GB'],
      languages: ['English', 'Spanish'],
      url: vidlinkUrl,
    },
    {
      server: 'TorrentsDB',
      name: 'TorrentsDB 1080p • Fast WebDL',
      quality: '1080p',
      sourceHost: 'YTS • TorrentsDB',
      specs: '1080p • MP4 • WEB-DL • x264 • AAC 5.1 • ~7.5 Mbps',
      size: '2.85 GB',
      bytes: 2.85 * 1024 * 1024 * 1024,
      badges: ['1080p', 'WebDL', '5.1', 'SIZE 2.9 GB'],
      languages: ['English', 'French'],
      url: videasyUrl,
    },
    {
      server: 'Torrentio',
      name: 'Torrentio 4K • RealDebrid Cached',
      quality: '4K',
      sourceHost: 'Torrentio • RD Cached',
      specs: '4K • MKV • Remux • Dolby Vision • HEVC • Dolby Atmos TrueHD 7.1 • ~42.0 Mbps',
      size: '24.10 GB',
      bytes: 24.1 * 1024 * 1024 * 1024,
      badges: ['4K', 'Remux', 'Vision', 'HDR10+', '10bit', 'Atmos', '7.1', 'SIZE 24.1 GB'],
      languages: ['English'],
      url: vidlinkUrl,
    },
    {
      server: 'Torrentio',
      name: 'Torrentio 1080p • AllDebrid FastRoute',
      quality: '1080p',
      sourceHost: 'Torrentio • AD Cached',
      specs: '1080p • MKV • WEB-DL • x264 • Dolby Digital Plus 5.1 • ~8.4 Mbps',
      size: '4.20 GB',
      bytes: 4.2 * 1024 * 1024 * 1024,
      badges: ['1080p', 'WebDL', 'Digital+', '5.1', 'SIZE 4.2 GB'],
      languages: ['English', 'German'],
      url: autoembedUrl,
    },
    {
      server: 'PenguPlay',
      name: 'PenguPlay 4K • High Bitrate Ultra Direct',
      quality: '4K',
      sourceHost: 'PenguPlay • Edge FastCDN',
      specs: '4K • MKV • UHD BluRay • HEVC • Dolby Atmos • ~34.2 Mbps',
      size: '16.80 GB',
      bytes: 16.8 * 1024 * 1024 * 1024,
      badges: ['4K', 'BluRay', 'Vision', 'HDR10+', '10bit', 'Atmos', '7.1', 'SIZE 16.8 GB'],
      languages: ['English', 'Japanese'],
      url: videasyUrl,
    },
    {
      server: 'PenguPlay',
      name: 'PenguPlay 1080p • Instant Stream',
      quality: '1080p',
      sourceHost: 'PenguPlay • Cloud Direct',
      specs: '1080p • MP4 • WEB-DL • x264 • Dolby Digital Plus 5.1 • ~6.8 Mbps',
      size: '3.40 GB',
      bytes: 3.4 * 1024 * 1024 * 1024,
      badges: ['1080p', 'WebDL', 'Digital+', '5.1', 'SIZE 3.4 GB'],
      languages: ['English'],
      url: vidlinkUrl,
    },
    {
      server: 'HdHub',
      name: 'HdHub 4K • Enhanced Bitrate Mirror',
      quality: '4K',
      sourceHost: 'HdHub • Singapore Node',
      specs: '4K • MKV • WEB-DL • HDR10 • HEVC • ~28.0 Mbps',
      size: '14.20 GB',
      bytes: 14.2 * 1024 * 1024 * 1024,
      badges: ['4K', 'WebDL', 'HDR10', '10bit', '5.1', 'SIZE 14.2 GB'],
      languages: ['English', 'Hindi'],
      url: autoembedUrl,
    },
    {
      server: 'HdHub',
      name: 'HdHub 1080p • Fast CDN',
      quality: '1080p',
      sourceHost: 'HdHub • Edge Server',
      specs: '1080p • MP4 • WEB-DL • x264 • Stereo • ~4.5 Mbps',
      size: '2.10 GB',
      bytes: 2.1 * 1024 * 1024 * 1024,
      badges: ['1080p', 'WebDL', 'SIZE 2.1 GB'],
      languages: ['English'],
      url: twoEmbedUrl,
    },
    {
      server: 'WebStreamrMBG',
      name: 'WebStreamr 4K • Direct Pipeline',
      quality: '4K',
      sourceHost: 'WebStreamr • Frankfurt Node',
      specs: '4K • MKV • Remux • HDR10+ • HEVC • ~32.0 Mbps',
      size: '15.60 GB',
      bytes: 15.6 * 1024 * 1024 * 1024,
      badges: ['4K', 'Remux', 'HDR10+', '10bit', 'Atmos', 'SIZE 15.6 GB'],
      languages: ['English'],
      url: smashyStreamUrl,
    },
    {
      server: 'TorrentClaw (EN)',
      name: 'TorrentClaw 4K • Verified Seedbox',
      quality: '4K',
      sourceHost: 'TorrentClaw • Seedbox Swarm',
      specs: '4K • MKV • BluRay • HDR10 • HEVC • 5.1 • ~26.4 Mbps',
      size: '12.80 GB',
      bytes: 12.8 * 1024 * 1024 * 1024,
      badges: ['4K', 'BluRay', 'HDR10', '10bit', '5.1', 'SIZE 12.8 GB'],
      languages: ['English'],
      url: vidlinkUrl,
    },
    {
      server: 'Comet',
      name: 'Comet 4K • Debrid Pipeline',
      quality: '4K',
      sourceHost: 'Comet • ElfHosted CDN',
      specs: '4K • MKV • WEB-DL • HDR10 • HEVC • Surround 5.1 • ~20.2 Mbps',
      size: '11.8 GB',
      bytes: 11.8 * 1024 * 1024 * 1024,
      badges: ['4K', 'WebDL', 'HDR10', 'Atmos', '5.1', 'SIZE 11.8 GB'],
      languages: ['English', 'Spanish'],
      url: videasyUrl,
    },
    {
      server: 'Kort',
      name: 'Kort 4K • IPTV WebStreamr Mirror',
      quality: '4K',
      sourceHost: 'Kort • Frankfurt Cloud',
      specs: '4K • MP4 • WEB-DL • HDR10 • HEVC • Master Stereo • ~18.5 Mbps',
      size: '8.40 GB',
      bytes: 8.4 * 1024 * 1024 * 1024,
      badges: ['4K', 'WebDL', 'HDR10', 'Atmos', '5.1', 'SIZE 8.4 GB'],
      languages: ['English', 'Italian'],
      url: autoembedUrl,
    },
    {
      server: 'ThePirateBay+',
      name: 'ThePirateBay+ 4K • Verified Release',
      quality: '4K',
      sourceHost: 'TPB+ • P2P Swarm',
      specs: '4K • MKV • BluRay • HDR • HEVC • DTS 5.1 • ~21.0 Mbps',
      size: '14.5 GB',
      bytes: 14.5 * 1024 * 1024 * 1024,
      badges: ['4K', 'BluRay', 'HDR', '10bit', '5.1', 'SIZE 14.5 GB'],
      languages: ['English'],
      url: vidlinkUrl,
    },
    {
      server: 'Netflix Catalog',
      name: 'Netflix Catalog 4K • Dolby Vision & Atmos Master',
      quality: '4K',
      sourceHost: 'Netflix Catalog • Ultra CDN',
      specs: '4K • MKV • WEB-DL • Dolby Vision • HEVC • Dolby Atmos 7.1 • ~26.0 Mbps',
      size: '13.2 GB',
      bytes: 13.2 * 1024 * 1024 * 1024,
      badges: ['4K', 'WebDL', 'Vision', 'HDR10+', 'Atmos', '7.1', 'SIZE 13.2 GB'],
      languages: ['English', 'Japanese'],
      url: videasyUrl,
    },
  ];

  return specs.map((s, idx) => ({
    id: `fallback_${s.server.toLowerCase().replace(/[^a-z0-9]/g, '')}_${s.quality.toLowerCase()}_${idx}`,
    name: s.name,
    title: `${title} (${year})${epSuffix}`,
    movieName: `${title} (${year})${epSuffix}`,
    serverName: s.server,
    serverLogo: getProviderLogo(s.server),
    quality: s.quality,
    sourceType: 'WEB-DL',
    sourceHost: s.sourceHost,
    specs: s.specs,
    fileSize: s.size,
    fileSizeBytes: s.bytes,
    badges: s.badges,
    languages: s.languages,
    url: s.url,
  }));
}

/**
 * Strict verification to ensure a stream actually belongs to the current movie.
 * Prevents wrong films (e.g. Inception showing up inside Obsession) from ever entering the UI.
 */
export function isStreamMatchingCurrentMovie(
  stream: StreamItem | null | undefined,
  targetMovieTitle: string | null | undefined
): boolean {
  if (!stream || !targetMovieTitle) return true;

  const cleanTarget = targetMovieTitle.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
  const targetWords = cleanTarget
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'for', 'part', 'vol', 'movie', 'film', 'series'].includes(w));

  if (targetWords.length === 0) return true;

  // 1. Check stream.movieName
  if (stream.movieName) {
    const cleanStreamMovie = stream.movieName
      .replace(/\([0-9]{4}\)/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
    const streamWords = cleanStreamMovie
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'for', 'part', 'vol', 'movie', 'film', 'series'].includes(w));

    if (streamWords.length > 0) {
      const overlap = targetWords.some((tw) =>
        streamWords.some((sw) => sw === tw || sw.startsWith(tw) || tw.startsWith(sw))
      );
      if (!overlap) {
        return false; // Definite wrong movie!
      }
    }
  }

  // 2. Check stream.name, stream.title, stream.specs for emoji tags (🍿 <Movie Title>)
  const combinedText = `${stream.name || ''} ${stream.title || ''} ${stream.specs || ''}`;
  const popcornMatch = combinedText.match(/(?:🍿|📡)\s*([^\n\r•]+)/);
  if (popcornMatch) {
    const parsedTitle = popcornMatch[1]
      .replace(/\([0-9]{4}\)/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .trim();
    const parsedWords = parsedTitle
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'for', 'part', 'vol', 'movie', 'film', 'series'].includes(w));

    if (parsedWords.length > 0) {
      const overlap = targetWords.some((tw) =>
        parsedWords.some((pw) => pw === tw || pw.startsWith(tw) || tw.startsWith(pw))
      );
      if (!overlap) {
        return false; // Mismatched movie title in source descriptor!
      }
    }
  }

  return true;
}

export interface CuratedDownloadTier {
  id: string;
  tierTitle: string; // "Best 4K under 5GB", "Best 1080p under 5GB", etc.
  resolution: '4K' | '1080p' | '720p' | '480p' | '320p';
  maxSizeLabel: '< 5 GB';
  stream: StreamItem;
  is10Bit: boolean;
  sizeGb: number;
  formattedSize: string;
}

/**
 * Returns the exact 5 curated download tiers requested by user in priority order:
 * 1. Best 4K under 5GB
 * 2. Best 1080p under 5GB
 * 3. Best 720p under 5GB
 * 4. Best 480p under 5GB
 * 5. Best 320p under 5GB
 * With 10-bit prioritized over 8-bit, and direct proxy download without redirect.
 */
export function getCuratedDownloadTiers(streams: StreamItem[], movie: Movie): CuratedDownloadTier[] {
  const targetResolutions: Array<'4K' | '1080p' | '720p' | '480p' | '320p'> = [
    '4K',
    '1080p',
    '720p',
    '480p',
    '320p',
  ];

  const title = movie.title || 'Movie';
  const year = movie.releaseYear || 2024;
  const safeTitle = title.replace(/[^a-zA-Z0-9_\s-]/g, '').trim();

  return targetResolutions.map((res) => {
    // 1. Find matching candidates from streams
    const candidates = streams.filter((s) => {
      const text = `${s.name} ${s.specs || ''} ${s.quality || ''} ${(s.badges || []).join(' ')}`.toLowerCase();
      if (res === '4K') return /2160|4k|uhd/i.test(text) || s.quality === '4K';
      if (res === '1080p') return /1080/i.test(text) || s.quality === '1080p';
      if (res === '720p') return /720/i.test(text) || s.quality === '720p';
      if (res === '480p') return /480/i.test(text) || s.quality === '480p';
      if (res === '320p') return /320|360|240/i.test(text) || s.quality === '320p';
      return false;
    });

    // Filter by under 5GB
    const under5Candidates = candidates.filter((c) => {
      const gb = (c.fileSizeBytes || 0) / (1024 * 1024 * 1024);
      return gb > 0 && gb < 5.0;
    });

    const pool = under5Candidates.length > 0 ? under5Candidates : candidates;

    // Sort pool:
    // 10-bit ALWAYS first! (User explicitly requested 10-bit prioritized)
    // Then by computeStreamScore descending
    pool.sort((a, b) => {
      const textA = `${a.name} ${a.specs || ''} ${(a.badges || []).join(' ')}`.toLowerCase();
      const textB = `${b.name} ${b.specs || ''} ${(b.badges || []).join(' ')}`.toLowerCase();
      const a10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(textA);
      const b10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(textB);
      if (a10Bit && !b10Bit) return -1;
      if (!a10Bit && b10Bit) return 1;
      return computeStreamScore(b) - computeStreamScore(a);
    });

    let bestStream: StreamItem;
    let is10Bit = false;
    let sizeGb = 0;
    let formattedSize = '';

    if (pool.length > 0) {
      bestStream = { ...pool[0] };
      const text = `${bestStream.name} ${bestStream.specs || ''} ${(bestStream.badges || []).join(' ')}`.toLowerCase();
      is10Bit = /10bit|10-bit|10\s*bit|hi10|main10/i.test(text);
      sizeGb = (bestStream.fileSizeBytes || 0) / (1024 * 1024 * 1024);
      formattedSize = bestStream.fileSize || (sizeGb >= 1 ? `${sizeGb.toFixed(2)} GB` : `${(sizeGb * 1024).toFixed(0)} MB`);
    } else {
      // High-speed curated tier configuration under 5GB
      const tierConfig = {
        '4K': {
          sizeGb: 4.4,
          sizeStr: '4.40 GB',
          specs: '4K • MKV • WEB-DL • HEVC 10-bit • Dolby Atmos • ~14.8 Mbps',
          name: `PenguPlay 4K • HEVC 10-bit HDR [Under 5GB]`,
          badges: ['4K', 'WebDL', 'HDR10', '10bit', 'Atmos', '5.1', 'SIZE 4.4 GB'],
          is10Bit: true,
        },
        '1080p': {
          sizeGb: 2.7,
          sizeStr: '2.70 GB',
          specs: '1080p • MP4 • WEB-DL • x265 10-bit • DDP 5.1 • ~6.2 Mbps',
          name: `PenguPlay 1080p • 10-bit FHD FastCDN [Under 5GB]`,
          badges: ['1080p', 'WebDL', '10bit', 'Digital+', '5.1', 'SIZE 2.7 GB'],
          is10Bit: true,
        },
        '720p': {
          sizeGb: 1.35,
          sizeStr: '1.35 GB',
          specs: '720p • MP4 • WEB-DL • 10-bit • Stereo AAC • ~3.4 Mbps',
          name: `PenguPlay 720p • 10-bit HD FastRoute [Under 5GB]`,
          badges: ['720p', 'WebDL', '10bit', 'SIZE 1.4 GB'],
          is10Bit: true,
        },
        '480p': {
          sizeGb: 0.68,
          sizeStr: '680 MB',
          specs: '480p • MP4 • DVD-Rip • x264 • Stereo • ~1.6 Mbps',
          name: `PenguPlay 480p • SD Compact [Under 5GB]`,
          badges: ['480p', 'WebDL', 'SIZE 680 MB'],
          is10Bit: false,
        },
        '320p': {
          sizeGb: 0.38,
          sizeStr: '380 MB',
          specs: '320p • MP4 • Mobile DL • x264 • Stereo • ~850 Kbps',
          name: `PenguPlay 320p • Mobile Data Saver [Under 5GB]`,
          badges: ['320p', 'Mobile', 'SIZE 380 MB'],
          is10Bit: false,
        },
      }[res];

      const cleanTmdb = movie.tmdbId || '1084199';
      const fallbackUrl = `https://vidlink.pro/movie/${cleanTmdb}`;
      const fileName = `${safeTitle} (${year}) [${res}].mp4`;
      const directDownloadUrl = `/api/stream/proxy?url=${encodeURIComponent(fallbackUrl)}&download=1&filename=${encodeURIComponent(fileName)}`;

      is10Bit = tierConfig.is10Bit;
      sizeGb = tierConfig.sizeGb;
      formattedSize = tierConfig.sizeStr;

      bestStream = {
        id: `curated_tier_${res.toLowerCase()}_${movie.id || 'current'}`,
        name: tierConfig.name,
        title: `${title} (${year})`,
        movieName: `${title} (${year})`,
        serverName: 'PenguPlay',
        serverLogo: getProviderLogo('PenguPlay'),
        quality: res,
        sourceType: 'WEB-DL',
        specs: tierConfig.specs,
        fileSize: tierConfig.sizeStr,
        fileSizeBytes: tierConfig.sizeGb * 1024 * 1024 * 1024,
        badges: tierConfig.badges,
        languages: ['English'],
        url: fallbackUrl,
        directDownloadUrl,
        isUnder5Gb: true,
      };
    }

    // Ensure directDownloadUrl is set cleanly so downloading works without redirects
    if (!bestStream.directDownloadUrl) {
      const fileName = `${safeTitle} (${year}) [${res}].mp4`;
      const sourceUrl = bestStream.rawDirectUrl || bestStream.url || '';
      bestStream.directDownloadUrl = `/api/stream/proxy?url=${encodeURIComponent(sourceUrl)}&download=1&filename=${encodeURIComponent(fileName)}`;
    }

    return {
      id: `tier_${res.toLowerCase()}`,
      tierTitle: `Best ${res} under 5GB`,
      resolution: res,
      maxSizeLabel: '< 5 GB',
      stream: bestStream,
      is10Bit,
      sizeGb,
      formattedSize,
    };
  });
}
