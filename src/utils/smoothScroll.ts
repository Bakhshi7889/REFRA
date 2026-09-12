import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;
let rafId: number | null = null;

type ScrollProgressCallback = (progress: number, scrollY: number) => void;
const scrollListeners = new Set<ScrollProgressCallback>();

function emitScroll(progress: number, scrollY: number) {
  scrollListeners.forEach((cb) => {
    try {
      cb(progress, scrollY);
    } catch {}
  });
}

export function subscribeScrollProgress(cb: ScrollProgressCallback): () => void {
  scrollListeners.add(cb);
  if (typeof window !== 'undefined') {
    const doc = document.documentElement;
    const scrollH = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const maxScroll = Math.max(1, scrollH - window.innerHeight);
    const currentScroll = window.scrollY || doc.scrollTop || 0;
    cb(Math.min(1, Math.max(0, currentScroll / maxScroll)), currentScroll);
  }
  return () => {
    scrollListeners.delete(cb);
  };
}

/**
 * Initializes fluid, inertial smooth scrolling across the entire application (PC and mobile).
 * Automatically respects prefers-reduced-motion.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (prefersReducedMotion) {
    const onNativeFallback = () => {
      const doc = document.documentElement;
      const scrollH = Math.max(doc.scrollHeight, document.body.scrollHeight);
      const maxScroll = Math.max(1, scrollH - window.innerHeight);
      const currentScroll = window.scrollY || doc.scrollTop || 0;
      emitScroll(Math.min(1, Math.max(0, currentScroll / maxScroll)), currentScroll);
    };
    window.addEventListener('scroll', onNativeFallback, { passive: true });
    return () => {
      window.removeEventListener('scroll', onNativeFallback);
    };
  }

  if (lenisInstance) {
    try {
      lenisInstance.destroy();
    } catch {}
    lenisInstance = null;
  }

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.2,
    infinite: false,
  });

  lenisInstance = lenis;

  lenis.on('scroll', (e: any) => {
    const progress = typeof e.progress === 'number' ? e.progress : (e.scroll / (e.limit || 1));
    emitScroll(Math.min(1, Math.max(0, progress)), e.scroll);
  });

  const onNativeScroll = () => {
    if (!lenisInstance) {
      const doc = document.documentElement;
      const scrollH = Math.max(doc.scrollHeight, document.body.scrollHeight);
      const maxScroll = Math.max(1, scrollH - window.innerHeight);
      const currentScroll = window.scrollY || doc.scrollTop || 0;
      emitScroll(Math.min(1, Math.max(0, currentScroll / maxScroll)), currentScroll);
    }
  };
  window.addEventListener('scroll', onNativeScroll, { passive: true });

  function raf(time: number) {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf);

  return () => {
    window.removeEventListener('scroll', onNativeScroll);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (lenisInstance) {
      lenisInstance.destroy();
      lenisInstance = null;
    }
  };
}

export function pauseSmoothScroll() {
  lenisInstance?.stop();
}

export function resumeSmoothScroll() {
  lenisInstance?.start();
}

export function scrollToTop() {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { duration: 0.85, immediate: false });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function scrollToElement(target: string | HTMLElement, offset = 0) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset, duration: 0.95 });
  } else if (typeof target === 'string') {
    const el = document.querySelector(target);
    el?.scrollIntoView({ behavior: 'smooth' });
  } else {
    target?.scrollIntoView?.({ behavior: 'smooth' });
  }
}
