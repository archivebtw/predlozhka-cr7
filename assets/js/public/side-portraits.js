'use strict';

(function setupTankzorSidePortraitsV2() {
  const leftRail = document.getElementById('sidePortraitsLeft');
  const rightRail = document.getElementById('sidePortraitsRight');
  const hero = document.querySelector('.hero');
  if (!leftRail || !rightRail || !hero) return;

  const portraits = [
    { slot: 1, side: 'left', key: 'witcher', label: 'Ведьмак 3', names: ['tankzor-witcher'] },
    { slot: 2, side: 'right', key: 'cyberpunk', label: 'Cyberpunk 2077', names: ['tankzor-cyberpunk'] },
    { slot: 3, side: 'left', key: 'mafia', label: 'Mafia 2', names: ['tankzor-mafia-2', 'tankzor-mafia2'] },
    { slot: 4, side: 'right', key: 'rdr', label: 'Red Dead Redemption 2', names: ['tankzor-rdr-2', 'tankzor-rdr2'] },
    { slot: 5, side: 'left', key: 'survivor', label: 'The Last of Us', names: ['tankzor-last-of-us', 'tankzor-lastofus'] },
    { slot: 6, side: 'right', key: 'warzone', label: 'Call of Duty', names: ['tankzor-warzone', 'tankzor-cod'] },
    { slot: 7, side: 'left', key: 'elden', label: 'Elden Ring', names: ['tankzor-elden-ring', 'tankzor-eldenring'] }
  ];

  const directories = [
    './assets/images/tankzor-games/',
    './assets/images/portraits/'
  ];
  const extensions = ['png', 'webp', 'jpg', 'jpeg'];
  const desktopQuery = window.matchMedia('(min-width: 1480px) and (min-height: 651px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let scrollQueued = false;
  let pointerQueued = false;
  let ready = false;

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
          const result = await testImage(url);
          if (result) return { ...definition, src: result };
        }
      }
    }
    return null;
  }

  function createPortraitCard(definition) {
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

    const label = document.createElement('figcaption');
    label.className = 'side-portrait-label';
    label.textContent = definition.label;

    figure.append(image, label);
    return figure;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function smoothstep(min, max, value) {
    const x = clamp((value - min) / (max - min), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function updateFromScroll() {
    if (!ready || !desktopQuery.matches) return;

    const heroTop = hero.offsetTop;
    const heroHeight = Math.max(hero.offsetHeight, window.innerHeight * .62);
    const localScroll = window.scrollY - heroTop;
    const progress = clamp(localScroll / heroHeight, 0, 1.15);
    const fade = 1 - smoothstep(.63, .96, progress);

    leftRail.style.setProperty('--hero-fade', fade.toFixed(3));
    rightRail.style.setProperty('--hero-fade', fade.toFixed(3));

    const cards = document.querySelectorAll('.side-portrait-card');
    cards.forEach(card => {
      const slot = Number(card.dataset.slot || 1);
      const direction = slot % 2 === 0 ? -1 : 1;
      const depthFactor = 1 + (slot % 3) * .18;
      const shift = (progress * 18 * direction * depthFactor).toFixed(2);
      const rotation = (progress * .9 * direction).toFixed(2);
      card.style.setProperty('--scroll-y', `${shift}px`);
      card.style.setProperty('--scroll-z', `${rotation}deg`);
    });
  }

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      updateFromScroll();
      scrollQueued = false;
    });
  }

  function updatePointerTilt(event) {
    if (!ready || !desktopQuery.matches || reducedMotion.matches) return;
    const x = clamp(event.clientX / window.innerWidth - .5, -.5, .5);
    const y = clamp(event.clientY / window.innerHeight - .5, -.5, .5);

    document.querySelectorAll('.side-portrait-card').forEach(card => {
      const slot = Number(card.dataset.slot || 1);
      const depth = .55 + (slot % 4) * .16;
      const side = card.dataset.side === 'left' ? 1 : -1;
      card.style.setProperty('--pointer-x', `${(x * 8 * depth * side).toFixed(2)}deg`);
      card.style.setProperty('--pointer-y', `${(y * -6 * depth).toFixed(2)}deg`);
    });
  }

  function onPointerMove(event) {
    if (pointerQueued) return;
    pointerQueued = true;
    requestAnimationFrame(() => {
      updatePointerTilt(event);
      pointerQueued = false;
    });
  }

  function resetPointerTilt() {
    document.querySelectorAll('.side-portrait-card').forEach(card => {
      card.style.setProperty('--pointer-x', '0deg');
      card.style.setProperty('--pointer-y', '0deg');
    });
  }

  function updateVisibility() {
    const show = ready && desktopQuery.matches;
    leftRail.classList.toggle('is-ready', show);
    rightRail.classList.toggle('is-ready', show);
    if (show) updateFromScroll();
  }

  async function init() {
    const found = (await Promise.all(portraits.map(findImage))).filter(Boolean);
    if (!found.length) {
      console.warn('[Tankzor portraits] Images not found in assets/images/tankzor-games/.');
      return;
    }

    const leftFragment = document.createDocumentFragment();
    const rightFragment = document.createDocumentFragment();

    found.forEach(definition => {
      const card = createPortraitCard(definition);
      if (definition.side === 'left') leftFragment.append(card);
      else rightFragment.append(card);
    });

    leftRail.replaceChildren(leftFragment);
    rightRail.replaceChildren(rightFragment);
    ready = true;

    requestAnimationFrame(() => {
      updateVisibility();
      updateFromScroll();
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', resetPointerTilt);
    desktopQuery.addEventListener('change', updateVisibility);
    reducedMotion.addEventListener('change', resetPointerTilt);
  }

  init().catch(error => console.warn('[Tankzor portraits] Disabled:', error));
})();
