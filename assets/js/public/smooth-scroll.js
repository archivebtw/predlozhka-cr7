(() => {
  'use strict';

  if (typeof window.Lenis !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const lenis = new window.Lenis({
    autoRaf: true,
    autoToggle: true,
    anchors: true,
    smoothWheel: true,
    syncTouch: false,
    lerp: 0.1,
    wheelMultiplier: 0.9
  });

  window.CR7_LENIS = lenis;

  window.addEventListener('beforeunload', () => lenis.destroy(), { once: true });
})();
