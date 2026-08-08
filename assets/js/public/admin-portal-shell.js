(() => {
  const styleLayers = [
    ['adminFigmaTabsFixStyles', './assets/css/public/admin-figma-tabs-fix.css?v=1.0'],
    ['adminFigmaTemplateV3Styles', './assets/css/public/admin-figma-template-v3.css?v=1.0'],
    ['adminGamesTabsV4Styles', './assets/css/public/admin-games-tabs-v4.css?v=1.4'],
    ['adminPublishedIconsFixStyles', './assets/css/public/admin-published-icons-fix.css?v=1.1'],
    ['adminModeratorLayoutV5Styles', './assets/css/public/admin-moderator-layout-v5.css?v=1.1'],
    ['adminInterfaceRefinementV8Styles', './assets/css/public/admin-interface-refinement-v8.css?v=1.0']
  ];

  styleLayers.forEach(([id, href]) => {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });

  if (!document.getElementById('adminGamesTabsV4Script')) {
    const script = document.createElement('script');
    script.id = 'adminGamesTabsV4Script';
    script.src = './assets/js/public/admin-games-tabs-v4.js?v=1.8';
    script.defer = true;
    document.head.appendChild(script);
  }

  if (!document.getElementById('adminPublishedIconsFixScript')) {
    const script = document.createElement('script');
    script.id = 'adminPublishedIconsFixScript';
    script.src = './assets/js/public/admin-published-icons-fix.js?v=1.1';
    script.defer = true;
    document.head.appendChild(script);
  }

  const portal = document.getElementById('adminPortal');
  const openButton = document.getElementById('adminPortalOpen');
  const closeButton = document.getElementById('adminPortalClose');
  const proposalExitLinks = [...document.querySelectorAll('.site-header a[href="#top"], .site-header a[href="#catalog"]')];
  const adminSection = document.getElementById('adminSection');
  const viewButtons = [...document.querySelectorAll('[data-admin-view]')];
  if (!portal || !openButton || !closeButton) return;

  const gameTools = document.querySelector('.proposal-game-tools');
  const proposalFilters = gameTools?.querySelector('.proposal-filter-box');
  const proposalSort = proposalFilters?.querySelector('.proposal-sort');
  const proposalReset = document.getElementById('proposalFiltersReset');
  if (gameTools && proposalSort) gameTools.appendChild(proposalSort);
  const proposalReleaseLegend = proposalFilters?.querySelector('fieldset:first-of-type legend');
  if (proposalReleaseLegend) proposalReleaseLegend.textContent = 'Статус выхода';
  const proposalPlayerFieldset = proposalFilters?.querySelector('fieldset:nth-of-type(2)');
  const proposalPlayerInputs = proposalPlayerFieldset ? [...proposalPlayerFieldset.querySelectorAll('input[type="number"]')] : [];
  const proposalPlayerContainer = proposalPlayerFieldset?.querySelector('div');
  if (proposalPlayerContainer && proposalPlayerInputs.length === 2) {
    const labels = proposalPlayerInputs.map(input => input.closest('label'));
    labels.forEach((label, index) => {
      if (!label) return;
      label.replaceChildren(proposalPlayerInputs[index]);
    });
    const separator = document.createElement('span');
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '–';
    labels[0]?.after(separator);
    proposalPlayerContainer.classList.add('proposal-player-range');
  }
  if (proposalFilters && proposalReset && !document.getElementById('proposalFiltersApply')) {
    const actions = document.createElement('div');
    actions.className = 'proposal-filter-actions';
    proposalReset.textContent = '';
    proposalReset.innerHTML = '<span class="filter-action-label">Очистить</span><span class="filter-action-icon" aria-hidden="true">↗</span>';
    const apply = document.createElement('button');
    apply.id = 'proposalFiltersApply';
    apply.type = 'button';
    apply.innerHTML = '<span class="filter-action-label">Применить</span><span class="filter-action-icon" aria-hidden="true">↗</span>';
    apply.addEventListener('click', () => {
      document.getElementById('proposalPlayersMin')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    actions.append(proposalReset, apply);
    proposalFilters.appendChild(actions);
  }

  const mediaPanel = document.getElementById('adminMediaPanel');
  const mediaTypeTabs = mediaPanel?.querySelector('.admin-media-type-tabs');
  if (adminSection && mediaTypeTabs && !document.getElementById('adminMediaFilters')) {
    const mediaFilters = document.createElement('details');
    mediaFilters.id = 'adminMediaFilters';
    mediaFilters.className = 'proposal-filter-box admin-media-filter-box';
    mediaFilters.open = true;
    mediaFilters.innerHTML = `
      <summary>Фильтры</summary>
      <fieldset>
        <legend>Формат</legend>
        <div class="admin-media-format-slot"></div>
      </fieldset>
      <div class="proposal-filter-actions admin-media-filter-actions">
        <button data-admin-media-filter-action="clear" type="button"><span class="filter-action-label">Очистить</span><span class="filter-action-icon" aria-hidden="true">↗</span></button>
        <button data-admin-media-filter-action="apply" type="button"><span class="filter-action-label">Применить</span><span class="filter-action-icon" aria-hidden="true">↗</span></button>
      </div>`;
    mediaFilters.querySelector('.admin-media-format-slot')?.appendChild(mediaTypeTabs);
    mediaFilters.addEventListener('click', event => {
      const action = event.target.closest('[data-admin-media-filter-action]')?.dataset.adminMediaFilterAction;
      if (action === 'clear') mediaTypeTabs.querySelector('[data-admin-media-type="video"]')?.click();
      if (action === 'apply') mediaTypeTabs.querySelector('.active')?.click();
    });
    adminSection.appendChild(mediaFilters);
  }

  let lastFocused = null;

  function setView(view = 'games', proposalMode = true) {
    const target = ['games', 'media', 'catalog'].includes(view) ? view : 'games';
    adminSection?.setAttribute('data-admin-view', target);
    portal.dataset.portalMode = proposalMode ? 'proposal' : 'catalog';
    document.body.classList.toggle('proposal-portal-open', proposalMode);
    viewButtons.forEach(button => button.classList.toggle('active', button.dataset.adminView === target));
  }

  function openPortal(view = 'games', proposalMode = true) {
    setView(view, proposalMode);
    lastFocused = document.activeElement;
    portal.hidden = false;
    portal.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('admin-portal-open');
    requestAnimationFrame(() => { portal.classList.add('is-open'); closeButton.focus(); });
  }

  function closePortal() {
    portal.classList.remove('is-open');
    portal.setAttribute('aria-hidden','true');
    openButton.setAttribute('aria-expanded','false');
    document.body.classList.remove('admin-portal-open');
    document.body.classList.remove('proposal-portal-open');
    window.setTimeout(() => { portal.hidden = true; lastFocused?.focus(); },360);
  }

  openButton.addEventListener('click',() => openPortal('games', true));
  proposalExitLinks.forEach(link => link.addEventListener('click',() => {
    if (portal.dataset.portalMode === 'proposal' && !portal.hidden) closePortal();
  }));
  viewButtons.forEach(button => button.addEventListener('click',() => setView(button.dataset.adminView, true)));
  closeButton.addEventListener('click',closePortal);
  portal.addEventListener('click',event => { if (event.target.matches('[data-admin-portal-close]')) closePortal(); });
  document.addEventListener('keydown',event => {
    if (portal.hidden) return;
    if (event.key === 'Escape') closePortal();
    if (event.key !== 'Tab') return;
    const focusable = [...portal.querySelectorAll('button:not([hidden]):not(:disabled),a[href],input:not([type="hidden"]):not(:disabled),textarea:not(:disabled),select:not(:disabled)')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  window.CR7_ADMIN_PORTAL = { open: openPortal, close: closePortal, setView };
  if (location.hash === '#admin') openPortal('games', true);
})();
