import {
  loadSavedThemeConfig,
  saveThemeConfig,
  UiThemeConfig,
} from './themeStore';
import { upgradeCachedVisualsTo4K } from './visualQualityManager';

/**
 * Network Manager
 * Automatically detects Wi-Fi vs Cellular / Metered Internet,
 * dynamically switches Data Saver mode on or off, ensures that in Wi-Fi
 * every visual is in 4K UHD, triggers automatic cache upgrade to 4K on Wi-Fi,
 * and preserves cached 4K assets on cellular without recaching in low quality.
 */

export type NetworkPreferenceMode = 'auto' | 'always_off' | 'always_on';
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';

export interface NetworkStatus {
  isOnline: boolean;
  isWifi: boolean;
  connectionType: ConnectionType;
  effectiveType?: string;
  saveData: boolean;
  downlinkMb?: number;
  dataSaverMode: boolean;
  preference: NetworkPreferenceMode;
}

const NETWORK_PREF_KEY = 'refra_network_data_saver_pref_v1';

/**
 * Retrieves the user's network preference ('auto' | 'always_off' | 'always_on')
 * Default is 'auto' (Auto-detect Wi-Fi for 4K and Mobile for Data Saver)
 */
export function getNetworkPreference(): NetworkPreferenceMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(NETWORK_PREF_KEY) as NetworkPreferenceMode;
    if (saved === 'always_off' || saved === 'always_on' || saved === 'auto') {
      return saved;
    }
  } catch {}
  return 'auto';
}

/**
 * Sets the network preference and immediately triggers appropriate mode switch
 */
export async function setNetworkPreference(pref: NetworkPreferenceMode): Promise<NetworkStatus> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NETWORK_PREF_KEY, pref);
    } catch {}
  }

  return await evaluateAndApplyNetworkMode(pref);
}

/**
 * Inspects navigator and connection API to detect if the device is currently on Wi-Fi or high-speed unmetered internet
 */
export function detectIsWifi(): { isWifi: boolean; connectionType: ConnectionType; effectiveType?: string; saveData: boolean; downlink?: number } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { isWifi: true, connectionType: 'unknown', saveData: false };
  }

  if (!navigator.onLine) {
    return { isWifi: false, connectionType: 'offline', saveData: false };
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!conn) {
    // Safari / iOS WebKit or Firefox desktop without Network Information API:
    // When online without explicit saveData, default to broadband / Wi-Fi
    return { isWifi: true, connectionType: 'unknown', saveData: false };
  }

  const type = conn.type as string | undefined;
  const effectiveType = conn.effectiveType as string | undefined;
  const saveData = Boolean(conn.saveData);
  const downlink = typeof conn.downlink === 'number' ? conn.downlink : undefined;

  // If system/browser has Data Saver explicitly enabled
  if (saveData) {
    return {
      isWifi: false,
      connectionType: (type as ConnectionType) || 'cellular',
      effectiveType,
      saveData: true,
      downlink,
    };
  }

  // Explicit type detection
  if (type === 'wifi' || type === 'ethernet') {
    return {
      isWifi: true,
      connectionType: type as ConnectionType,
      effectiveType,
      saveData: false,
      downlink,
    };
  }

  if (type === 'cellular') {
    return {
      isWifi: false,
      connectionType: 'cellular',
      effectiveType,
      saveData: false,
      downlink,
    };
  }

  // If type is not explicitly provided (e.g. Chrome on Windows/macOS desktop), inspect effectiveType & downlink
  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return {
      isWifi: false,
      connectionType: 'cellular',
      effectiveType,
      saveData: false,
      downlink,
    };
  }

  if (typeof downlink === 'number' && downlink < 1.5) {
    return {
      isWifi: false,
      connectionType: 'cellular',
      effectiveType,
      saveData: false,
      downlink,
    };
  }

  // High speed unmetered connection (broadband/Wi-Fi)
  return {
    isWifi: true,
    connectionType: 'wifi',
    effectiveType,
    saveData: false,
    downlink,
  };
}

/**
 * Returns whether Wi-Fi / broadband mode is currently active
 */
export function isWifiConnection(): boolean {
  return detectIsWifi().isWifi;
}

/**
 * Evaluates current network and applies appropriate Data Saver mode and 4K settings
 */
export async function evaluateAndApplyNetworkMode(forcedPref?: NetworkPreferenceMode): Promise<NetworkStatus> {
  const pref = forcedPref || getNetworkPreference();
  const detection = detectIsWifi();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  let shouldEnableDataSaver = false;

  if (pref === 'always_on') {
    shouldEnableDataSaver = true;
  } else if (pref === 'always_off') {
    shouldEnableDataSaver = false;
  } else {
    // 'auto': Switch Data Saver ON when on Cellular/Metered, and OFF when on Wi-Fi
    shouldEnableDataSaver = !detection.isWifi;
  }

  try {
    const currentTheme = await loadSavedThemeConfig();
    const hasDataSaverChanged = currentTheme.dataSaverMode !== shouldEnableDataSaver;
    const isNowWifi4k = !shouldEnableDataSaver && detection.isWifi;

    if (hasDataSaverChanged || (isNowWifi4k && currentTheme.imageResolutionQuality !== 'ultra')) {
      const updatedConfig: UiThemeConfig = {
        ...currentTheme,
        dataSaverMode: shouldEnableDataSaver,
        // When on Wi-Fi and Data Saver is OFF: Set resolution quality to Ultra 4K
        imageResolutionQuality: shouldEnableDataSaver ? 'compact' : 'ultra',
      };

      await saveThemeConfig(updatedConfig);

      // If switched to Wi-Fi / Data Saver OFF: upgrade all cached visuals to 4K immediately!
      if (!shouldEnableDataSaver && isOnline) {
        upgradeCachedVisualsTo4K().catch((err) => {
          console.warn('Background 4K upgrade notice:', err);
        });
      }
    }
  } catch (err) {
    console.warn('Network evaluation notice:', err);
  }

  const status: NetworkStatus = {
    isOnline,
    isWifi: detection.isWifi,
    connectionType: detection.connectionType,
    effectiveType: detection.effectiveType,
    saveData: detection.saveData,
    downlinkMb: detection.downlink,
    dataSaverMode: shouldEnableDataSaver,
    preference: pref,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('refra-network-changed', {
        detail: status,
      })
    );
  }

  return status;
}

/**
 * Initializes listeners for network changes (Wi-Fi connected, mobile data switch, online, offline)
 * Returns cleanup function.
 */
export function initNetworkManager(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Run initial evaluation
  evaluateAndApplyNetworkMode();

  const handleNetworkChange = () => {
    evaluateAndApplyNetworkMode();
  };

  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn && conn.addEventListener) {
    conn.addEventListener('change', handleNetworkChange);
  }

  return () => {
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
    if (conn && conn.removeEventListener) {
      conn.removeEventListener('change', handleNetworkChange);
    }
  };
}
