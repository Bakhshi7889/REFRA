import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface AppLinkItem {
  id: string;
  name: string;
  url: string;
  type: 'production' | 'dev' | 'preview';
  description: string;
}

export const APP_LINKS: AppLinkItem[] = [
  {
    id: 'prod-netlify',
    name: 'Refra Production',
    url: 'https://refra.netlify.app',
    type: 'production',
    description: 'Primary global edge network on Netlify',
  },
  {
    id: 'dev-cloudrun',
    name: 'Refra Dev Environment',
    url: 'https://ais-dev-jo4xeehosqztzz7luqerik-89441985033.asia-southeast1.run.app',
    type: 'dev',
    description: 'Cloud Run active development deployment',
  },
  {
    id: 'preview-cloudrun',
    name: 'Refra Shared Preview',
    url: 'https://ais-pre-jo4xeehosqztzz7luqerik-89441985033.asia-southeast1.run.app',
    type: 'preview',
    description: 'Cloud Run shared preview runtime',
  },
];

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isChromium, setIsChromium] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [swStatus, setSwStatus] = useState<'active' | 'installing' | 'unsupported' | 'checking'>('checking');
  const [currentOrigin, setCurrentOrigin] = useState('');

  useEffect(() => {
    // Determine iframe status
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    setIsIframe(inIframe);

    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }

    // Detect standalone mode (already installed as PWA or launched via Home Screen)
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsInstalled(isStandalone);

    // Platform user-agent heuristics
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    const isChromeOrEdge = /chrome|edg|crios|opr/.test(ua) && !/edge\//.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChromium(isChromeOrEdge);

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          if (reg.active) setSwStatus('active');
          else if (reg.installing) setSwStatus('installing');
        } else {
          setSwStatus('unsupported');
        }
      }).catch(() => setSwStatus('unsupported'));
    } else {
      setSwStatus('unsupported');
    }

    // Handle native browser install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Allow Chrome to show its default native mini-infobar / ambient prompt automatically
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Native install prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  const updateServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isChromium,
    isIframe,
    swStatus,
    currentOrigin,
    appLinks: APP_LINKS,
    install,
    updateServiceWorker,
  };
}
