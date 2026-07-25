'use strict';
(function setupSiteLoader() {
  const loader = document.getElementById('siteLoader');
  if (!loader) return;

  const startedAt = performance.now();
  const minimumVisibleMs = 700;
  const maximumVisibleMs = 9000;

  function hideLoader() {
    const elapsed = performance.now() - startedAt;
    const delay = Math.max(0, minimumVisibleMs - elapsed);
    window.setTimeout(() => {
      loader.classList.add('is-hidden');
      document.body.classList.add('assets-loaded');
      window.setTimeout(() => loader.remove(), 900);
    }, delay);
  }

  window.addEventListener('load', hideLoader, { once: true });
  window.setTimeout(hideLoader, maximumVisibleMs);
})();
