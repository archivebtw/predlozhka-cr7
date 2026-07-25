(() => {
  const stage = document.getElementById('bloodseekerStage');
  const emberLayer = document.getElementById('bloodseekerEmbers');
  if (!stage || !emberLayer) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    const fragment = document.createDocumentFragment();
    const count = window.innerWidth < 760 ? 12 : 22;

    for (let index = 0; index < count; index += 1) {
      const ember = document.createElement('i');
      ember.className = 'bloodseeker-ember';
      ember.style.setProperty('--x', `${6 + Math.random() * 88}%`);
      ember.style.setProperty('--size', `${2 + Math.random() * 3.8}px`);
      ember.style.setProperty('--duration', `${5.8 + Math.random() * 7.5}s`);
      ember.style.setProperty('--delay', `${-Math.random() * 12}s`);
      ember.style.setProperty('--drift', `${-55 + Math.random() * 110}px`);
      ember.style.setProperty('--opacity', `${0.25 + Math.random() * 0.58}`);
      fragment.appendChild(ember);
    }

    emberLayer.appendChild(fragment);
  }

  document.addEventListener('visibilitychange', () => {
    stage.classList.toggle('is-paused', document.hidden);
  });
})();
