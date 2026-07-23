'use strict';

(function setupTankzorSidePortraits() {
  const leftRail = document.getElementById('sidePortraitsLeft');
  const rightRail = document.getElementById('sidePortraitsRight');
  if (!leftRail || !rightRail) return;

  const portraitDefinitions = [
    { key: 'witcher', label: 'Witcher mode', names: ['tankzor-witcher'] },
    { key: 'cyberpunk', label: 'Cyberpunk mode', names: ['tankzor-cyberpunk'] },
    { key: 'mafia', label: 'Mafia mode', names: ['tankzor-mafia-2', 'tankzor-mafia2'] },
    { key: 'rdr', label: 'Wild West mode', names: ['tankzor-rdr-2', 'tankzor-rdr2'] },
    { key: 'survivor', label: 'Survivor mode', names: ['tankzor-last-of-us', 'tankzor-lastofus'] },
    { key: 'warzone', label: 'Tactical mode', names: ['tankzor-warzone', 'tankzor-cod'] },
    { key: 'elden', label: 'Dark fantasy mode', names: ['tankzor-elden-ring', 'tankzor-eldenring'] }
  ];

  const directories = [
    './assets/images/tankzor-games/',
    './assets/images/portraits/'
  ];
  const extensions = ['png', 'webp', 'jpg', 'jpeg'];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = window.matchMedia('(min-width: 1360px) and (min-height: 620px)');
  let loadedPortraits = [];
  let currentStep = -1;
  let previousScrollY = window.scrollY;
  let scrollTicking = false;
  let pointerTicking = false;

  function createCard(className) {
    const figure = document.createElement('figure');
    figure.className = `side-portrait-card ${className}`;

    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;

    const caption = document.createElement('figcaption');
    caption.className = 'side-portrait-caption';

    figure.append(image, caption);
    return { figure, image, caption };
  }

  function buildRail(rail) {
    const stage = document.createElement('div');
    stage.className = 'side-portrait-stage';
    const back = createCard('side-portrait-card--back');
    const front = createCard('side-portrait-card--front');
    stage.append(back.figure, front.figure);
    rail.replaceChildren(stage);
    return { rail, stage, front, back, index: -1, timer: 0 };
  }

  const left = buildRail(leftRail);
  const right = buildRail(rightRail);

  function testImage(url) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(url);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function findPortrait(definition) {
    for (const directory of directories) {
      for (const name of definition.names) {
        for (const extension of extensions) {
          const src = `${directory}${name}.${extension}`;
          const found = await testImage(src);
          if (found) return { ...definition, src: found };
        }
      }
    }
    return null;
  }

  function applyPortrait(card, portrait) {
    if (!portrait) return;
    card.image.src = portrait.src;
    card.caption.textContent = portrait.label;
  }

  function setRailPortrait(railState, index, immediate = false) {
    if (!loadedPortraits.length) return;
    const normalized = ((index % loadedPortraits.length) + loadedPortraits.length) % loadedPortraits.length;
    if (normalized === railState.index && !immediate) return;

    const nextPortrait = loadedPortraits[normalized];
    const backPortrait = loadedPortraits[(normalized + Math.min(2, loadedPortraits.length - 1)) % loadedPortraits.length];
    window.clearTimeout(railState.timer);

    if (immediate || reducedMotion.matches) {
      applyPortrait(railState.front, nextPortrait);
      applyPortrait(railState.back, backPortrait);
      railState.index = normalized;
      railState.rail.classList.add('is-ready');
      return;
    }

    railState.rail.classList.add('is-switching');
    railState.timer = window.setTimeout(() => {
      applyPortrait(railState.front, nextPortrait);
      applyPortrait(railState.back, backPortrait);
      railState.index = normalized;
      requestAnimationFrame(() => railState.rail.classList.remove('is-switching'));
    }, 260);
  }

  function updatePortraitsFromScroll(force = false) {
    if (!desktopQuery.matches || !loadedPortraits.length) return;
    const distance = Math.max(420, window.innerHeight * .55);
    const step = Math.floor(window.scrollY / distance);
    if (!force && step === currentStep) return;

    const movingDown = window.scrollY >= previousScrollY;
    previousScrollY = window.scrollY;
    currentStep = step;
    const base = ((step * 2) % loadedPortraits.length + loadedPortraits.length) % loadedPortraits.length;
    setRailPortrait(left, movingDown ? base : base + 1, force);
    setRailPortrait(right, movingDown ? base + 1 : base, force);
  }

  function updateScrollParallax() {
    const scroll = window.scrollY;
    const float = Math.sin(scroll / 380) * 7;
    const roll = Math.sin(scroll / 720) * .9;
    leftRail.style.setProperty('--float-y', `${float}px`);
    rightRail.style.setProperty('--float-y', `${-float}px`);
    leftRail.style.setProperty('--scroll-roll', `${roll}deg`);
    rightRail.style.setProperty('--scroll-roll', `${roll}deg`);
  }

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updatePortraitsFromScroll();
      if (!reducedMotion.matches) updateScrollParallax();
      scrollTicking = false;
    });
  }

  function onPointerMove(event) {
    if (!desktopQuery.matches || reducedMotion.matches || pointerTicking) return;
    pointerTicking = true;
    requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth) - .5;
      const y = (event.clientY / window.innerHeight) - .5;
      const tiltX = `${y * -5.5}deg`;
      const tiltY = `${x * 5.5}deg`;
      for (const rail of [leftRail, rightRail]) {
        rail.style.setProperty('--tilt-x', tiltX);
        rail.style.setProperty('--tilt-y', tiltY);
      }
      pointerTicking = false;
    });
  }

  function resetPointerTilt() {
    for (const rail of [leftRail, rightRail]) {
      rail.style.setProperty('--tilt-x', '0deg');
      rail.style.setProperty('--tilt-y', '0deg');
    }
  }

  function handleViewportChange() {
    const canShow = desktopQuery.matches && loadedPortraits.length > 0;
    leftRail.classList.toggle('is-ready', canShow);
    rightRail.classList.toggle('is-ready', canShow);
    if (canShow) updatePortraitsFromScroll(true);
  }

  async function init() {
    const results = await Promise.all(portraitDefinitions.map(findPortrait));
    loadedPortraits = results.filter(Boolean);

    if (!loadedPortraits.length) {
      console.warn('[Tankzor cards] Images were not found. Check assets/images/tankzor-games/ and file names.');
      return;
    }

    applyPortrait(left.front, loadedPortraits[0]);
    applyPortrait(left.back, loadedPortraits[Math.min(2, loadedPortraits.length - 1)]);
    applyPortrait(right.front, loadedPortraits[1 % loadedPortraits.length]);
    applyPortrait(right.back, loadedPortraits[Math.min(3, loadedPortraits.length - 1)]);

    handleViewportChange();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', resetPointerTilt);
    desktopQuery.addEventListener('change', handleViewportChange);
    reducedMotion.addEventListener('change', handleViewportChange);
  }

  init().catch(error => console.warn('[Tankzor cards] Disabled:', error));
})();
