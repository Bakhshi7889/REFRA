// Centralized Scroll Lock Manager with reference counting
// Prevents scroll freezing when chaining modals (MovieDetails -> VideoPlayer -> ServerSelector)

let activeLocks = 0;

export function lockScroll(): () => void {
  activeLocks++;
  if (activeLocks === 1) {
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.documentElement.classList.remove('scroll-locked');
      document.body.classList.remove('scroll-locked');
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('overscroll-behavior');
    }
  };
}

export function forceUnlockScroll() {
  activeLocks = 0;
  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('overscroll-behavior');
}
