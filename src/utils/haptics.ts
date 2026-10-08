/**
 * PWA Haptic Feedback Utility
 * Provides subtle tactile feedback for mobile and PWA users via navigator.vibrate.
 * Safely guards against unsupported browsers (e.g., iOS Safari or non-vibrating devices).
 */

export type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 8,     // 8ms micro-pulse for tab switching or filter clicks
  light: 12,        // 12ms subtle pulse for button taps
  medium: 20,       // 20ms distinct pulse for play or bookmark toggle
  heavy: 35,        // 35ms firm pulse for deletions or high-impact actions
  success: [10, 30, 15], // double tap for saved / success
  warning: [20, 50, 20],
};

const STORAGE_KEY = 'refra_haptics_enabled';

/**
 * Check if haptic vibration is supported on this device.
 */
export function isHapticsSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Check if the user has enabled haptics in their settings.
 * Defaults to true if supported.
 */
export function isHapticsEnabled(): boolean {
  if (!isHapticsSupported()) return false;
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    return pref === null || pref === 'true';
  } catch {
    return true;
  }
}

/**
 * Toggle or set haptic feedback preference.
 */
export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {}
}

/**
 * Trigger a haptic feedback vibration.
 * @param type Haptic intensity preset or custom duration in milliseconds
 */
export function triggerHaptic(type: HapticType | number = 'light'): void {
  if (!isHapticsEnabled()) return;

  try {
    const pattern = typeof type === 'number' ? type : HAPTIC_PATTERNS[type] || 12;
    navigator.vibrate(pattern);
  } catch {
    // Graceful fallback for security sandboxes or restricted iframes
  }
}
