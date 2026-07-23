'use strict';

(function setupTankzorStaticPortraits() {
  const leftRail = document.getElementById('sidePortraitsLeft');
  const rightRail = document.getElementById('sidePortraitsRight');
  if (!leftRail || !rightRail) return;

  const portraits = [
    { slot: 1, side: 'left', names: ['tankzor-witcher'] },
    { slot: 2, side: 'right', names: ['tankzor-cyberpunk'] },
    { slot: 3, side: 'left', names: ['tankzor-mafia-2', 'tankzor-mafia2'] },
    { slot: 4, side: 'right', names: ['tankzor-rdr-2', 'tankzor-rdr2'] },
    { slot: 5, side: 'left', names: ['tankzor-last-of-us', 'tankzor-lastofus'] },
    { slot: 6, side: 'right', names: ['tankzor-warzone', 'tankzor-cod'] }
  ];

  const directories = [
    './assets/images/tankzor-games/',
    './assets/images/portraits/'
  ];
  const extensions = ['png', 'webp', 'jpg', 'jpeg'];
  const desktopQuery = window.matchMedia('(min-width: 1580px) and (min-height: 650px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let ready = false;
  let pointerFrame = 0;

  function testImage(url) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(url);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function findImage(definition) {
    for (const directory of directories) {
      for (const name of definition.names) {
        for (const extension of extensions) {
          const url = `${directory}${name}.${extension}`;
          const found = await testImage(url);
          if (found) return { ...definition, src: found };
        }
      }
    }
    return null;
  }

  function createCard(definition) {
    const figure = document.createElement('figure');
    figure.className = `side-portrait-card side-portrait-card--slot-${definition.slot}`;
    figure.dataset.slot = String(definition.slot);
    figure.dataset.side = definition.side;
    figure.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    image.alt = '';
    image.src = definition.src;
    image.decoding = 'async';
    image.loading = 'eager';
    image.draggable = false;
    image.addEventListener('load', () => figure.classList.add('is-loaded'), { once: true });

    figure.append(image);
    return figure;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateVisibility() {
    const show = ready && desktopQuery.matches;
    leftRail.classList.toggle('is-ready', show);
    rightRail.classList.toggle('is-ready', show);
    if (!show) resetTilt();
  }

  function applyTilt(event) {
    if (!ready || !desktopQuery.matches || reducedMotion.matches) return;

    const nx = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
    const ny = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);

    document.querySelectorAll('.side-portrait-card').forEach(card => {
      card.style.setProperty('--tilt-x', `${(-ny * 3.8).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(nx * 4.8).toFixed(2)}deg`);
      card.style.setProperty('--image-x', `${(nx * 4.2).toFixed(2)}px`);
      card.style.setProperty('--image-y', `${(ny * 3.2).toFixed(2)}px`);
      card.style.setProperty('--light-x', `${((nx + 1) * 50).toFixed(1)}%`);
      card.style.setProperty('--light-y', `${((ny + 1) * 50).toFixed(1)}%`);
    });
  }

  function onPointerMove(event) {
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      applyTilt(event);
      pointerFrame = 0;
    });
  }

  function resetTilt() {
    document.querySelectorAll('.side-portrait-card').forEach(card => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--image-x', '0px');
      card.style.setProperty('--image-y', '0px');
      card.style.setProperty('--light-x', '50%');
      card.style.setProperty('--light-y', '24%');
    });
  }

  async function init() {
    const found = (await Promise.all(portraits.map(findImage))).filter(Boolean);
    if (!found.length) {
      console.warn('[Tankzor portraits] Images not found.');
      return;
    }

    const leftFragment = document.createDocumentFragment();
    const rightFragment = document.createDocumentFragment();

    found.forEach(definition => {
      const card = createCard(definition);
      if (definition.side === 'left') leftFragment.append(card);
      else rightFragment.append(card);
    });

    leftRail.replaceChildren(leftFragment);
    rightRail.replaceChildren(rightFragment);
    ready = true;

    requestAnimationFrame(updateVisibility);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', resetTilt);
    window.addEventListener('blur', resetTilt);
    desktopQuery.addEventListener('change', updateVisibility);
    reducedMotion.addEventListener('change', resetTilt);
  }

  init().catch(error => console.warn('[Tankzor portraits] Disabled:', error));
})();
