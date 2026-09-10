export interface RegionOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_REGIONS: RegionOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GLOBAL', name: 'Global / Worldwide', flag: '🌐' },
];

const REGION_STORAGE_KEY = 'refra_user_region';
const REGION_MODE_KEY = 'refra_user_region_mode'; // 'auto' | 'manual'

export function detectUserCountry(): string {
  try {
    // 1. Timezone detection
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone) {
      if (timeZone.includes('Kolkata') || timeZone.includes('Calcutta') || timeZone.startsWith('Asia/Kolkata')) return 'IN';
      if (
        timeZone.startsWith('America/New_York') ||
        timeZone.startsWith('America/Chicago') ||
        timeZone.startsWith('America/Los_Angeles') ||
        timeZone.startsWith('America/Denver') ||
        timeZone.startsWith('America/Phoenix') ||
        timeZone.startsWith('America/Detroit') ||
        timeZone.startsWith('America/Indiana') ||
        timeZone.startsWith('America/Kentucky') ||
        timeZone.startsWith('America/Boise') ||
        timeZone.startsWith('America/Juneau') ||
        timeZone.startsWith('Pacific/Honolulu')
      ) return 'US';
      if (timeZone.startsWith('Europe/London') || timeZone === 'GB' || timeZone.includes('Belfast')) return 'GB';
      if (
        timeZone.startsWith('America/Toronto') ||
        timeZone.startsWith('America/Vancouver') ||
        timeZone.startsWith('America/Montreal') ||
        timeZone.startsWith('America/Edmonton') ||
        timeZone.startsWith('America/Winnipeg') ||
        timeZone.startsWith('America/Halifax')
      ) return 'CA';
      if (timeZone.startsWith('Australia/')) return 'AU';
      if (timeZone.startsWith('Asia/Tokyo')) return 'JP';
      if (timeZone.startsWith('Asia/Seoul')) return 'KR';
      if (timeZone.startsWith('Europe/Berlin')) return 'DE';
      if (timeZone.startsWith('Europe/Paris')) return 'FR';
      if (timeZone.startsWith('Europe/Rome')) return 'IT';
      if (timeZone.startsWith('Europe/Madrid')) return 'ES';
      if (timeZone.startsWith('America/Sao_Paulo') || timeZone.startsWith('America/Bahia')) return 'BR';
      if (timeZone.startsWith('America/Mexico_City') || timeZone.startsWith('America/Cancun')) return 'MX';
      if (timeZone.startsWith('Europe/Amsterdam')) return 'NL';
      if (timeZone.startsWith('Europe/Stockholm')) return 'SE';
      if (timeZone.startsWith('Pacific/Auckland')) return 'NZ';
      if (timeZone.startsWith('Asia/Singapore')) return 'SG';
      if (timeZone.startsWith('Asia/Dubai')) return 'AE';
    }

    // 2. Navigator locale detection
    const navLangs = navigator.languages || [navigator.language];
    for (const lang of navLangs) {
      if (lang && lang.includes('-')) {
        const parts = lang.split('-');
        const possibleCountry = parts[parts.length - 1].toUpperCase();
        if (possibleCountry.length === 2) {
          const match = SUPPORTED_REGIONS.find((r) => r.code === possibleCountry);
          if (match) return match.code;
        }
      }
    }
  } catch (err) {
    console.warn('Auto-detect country error:', err);
  }

  return 'US';
}

export function getUserRegionInfo(): { code: string; isManual: boolean; detectedCode: string } {
  const detectedCode = detectUserCountry();
  try {
    const savedMode = localStorage.getItem(REGION_MODE_KEY);
    const savedCode = localStorage.getItem(REGION_STORAGE_KEY);

    if (savedMode === 'manual' && savedCode) {
      return { code: savedCode, isManual: true, detectedCode };
    }

    // If never initialized or in auto mode, save the detected country
    if (!savedCode) {
      localStorage.setItem(REGION_STORAGE_KEY, detectedCode);
      localStorage.setItem(REGION_MODE_KEY, 'auto');
    }

    return {
      code: savedCode || detectedCode,
      isManual: savedMode === 'manual',
      detectedCode,
    };
  } catch {
    return { code: detectedCode, isManual: false, detectedCode };
  }
}

export function getUserRegion(): string {
  const info = getUserRegionInfo();
  return info.code === 'GLOBAL' ? '' : info.code;
}

export function setUserRegion(code: string, isManual: boolean = true): void {
  try {
    if (!isManual || code === 'AUTO') {
      const detected = detectUserCountry();
      localStorage.setItem(REGION_STORAGE_KEY, detected);
      localStorage.setItem(REGION_MODE_KEY, 'auto');
    } else {
      localStorage.setItem(REGION_STORAGE_KEY, code);
      localStorage.setItem(REGION_MODE_KEY, 'manual');
    }

    // Dispatch global event for instantaneous feed re-fetching
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('refra_region_changed', {
          detail: { region: code === 'AUTO' ? detectUserCountry() : code, isManual },
        })
      );
    }
  } catch (err) {
    console.warn('Set user region error:', err);
  }
}
