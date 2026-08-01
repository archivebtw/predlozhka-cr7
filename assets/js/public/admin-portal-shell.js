(() => {
  const portal = document.getElementById('adminPortal');
  const openButton = document.getElementById('adminPortalOpen');
  const closeButton = document.getElementById('adminPortalClose');
  const proposalTriggers = [...document.querySelectorAll('.proposal-desk-trigger')];
  const proposalExitLinks = [...document.querySelectorAll('.site-header a[href="#top"], .site-header a[href="#catalog"]')];
  const adminSection = document.getElementById('adminSection');
  const viewButtons = [...document.querySelectorAll('[data-admin-view]')];
  if (!portal || !openButton || !closeButton) return;

  let lastFocused = null;

  function setView(view = 'catalog', proposalMode = false) {
    const target = ['games', 'media', 'catalog'].includes(view) ? view : 'catalog';
    adminSection?.setAttribute('data-admin-view', target);
    portal.dataset.portalMode = proposalMode ? 'proposal' : 'catalog';
    document.body.classList.toggle('proposal-portal-open', proposalMode);
    viewButtons.forEach(button => button.classList.toggle('active', button.dataset.adminView === target));
  }

  function openPortal(view = 'catalog', proposalMode = false) {
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

  openButton.addEventListener('click',() => openPortal('catalog', false));
  proposalTriggers.forEach(trigger => trigger.addEventListener('click',() => openPortal(trigger.dataset.proposalTab || 'games', true)));
  proposalExitLinks.forEach(link => link.addEventListener('click',() => {
    if (portal.dataset.portalMode === 'proposal' && !portal.hidden) closePortal();
  }));
  viewButtons.forEach(button => button.addEventListener('click',() => setView(button.dataset.adminView, button.dataset.adminView !== 'catalog')));
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
  if (location.hash === '#admin') openPortal('catalog', false);
})();
