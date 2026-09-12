import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;
let rafId: number | null = null;

/**
 * Initializes fluid, inertial smooth scrolling across the entire application (PC and mobile).
 * Automatically respects prefers-reduced-motion.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (prefersReducedMotion) return () => {};

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

  function raf(time: number) {
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf);

  return () => {
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
