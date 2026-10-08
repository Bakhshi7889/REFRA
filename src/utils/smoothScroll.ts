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
 * Native smooth scrolling helper across PC and mobile.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onNativeScroll = () => {
    const doc = document.documentElement;
    const scrollH = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const maxScroll = Math.max(1, scrollH - window.innerHeight);
    const currentScroll = window.scrollY || doc.scrollTop || 0;
    emitScroll(Math.min(1, Math.max(0, currentScroll / maxScroll)), currentScroll);
  };
  
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  return () => {
    window.removeEventListener('scroll', onNativeScroll);
  };
}

export function pauseSmoothScroll() {}

export function resumeSmoothScroll() {}

export function scrollToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function scrollToElement(target: string | HTMLElement, offset = 0) {
  if (typeof window === 'undefined') return;
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

