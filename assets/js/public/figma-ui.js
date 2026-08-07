(() => {
  const assets = [
    ['style','figmaMainFinalStyles','./assets/css/public/figma-main-final.css?v=1.0'],
    ['style','adminFigmaFinalStyles','./assets/css/public/admin-figma-final.css?v=1.0'],
    ['style','proposalWindowsFigmaStyles','./assets/css/public/proposal-windows-figma.css?v=4.5'],
    ['style','proposalMediaFigmaExactStyles','./assets/css/public/proposal-media-figma-exact.css?v=2.1'],
    ['style','adminCardIconsStyles','./assets/css/public/admin-card-icons.css?v=1.1'],
    ['script','proposalWindowsFigmaScript','./assets/js/public/proposal-windows-figma.js?v=3.4'],
    ['script','adminCardIconsScriptV2','./assets/js/public/admin-card-icons-v2.js?v=2.0'],
    ['script','catalogLiveRefreshScript','./assets/js/public/catalog-live-refresh.js?v=1.0']
  ];
  assets.forEach(([type,id,src]) => {
    if (document.getElementById(id)) return;
    const node = document.createElement(type === 'style' ? 'link' : 'script');
    node.id = id;
    if (type === 'style') { node.rel = 'stylesheet'; node.href = src; }
    else { node.src = src; node.defer = true; }
    document.head.appendChild(node);
  });

  const contentToggle = document.getElementById('contentMenuToggle');
  const contentPanel = document.getElementById('contentMenuPanel');
  const servicesToggle = document.getElementById('servicesToggle');
  const servicesMenu = document.getElementById('servicesMenu');
  const filtersToggle = document.getElementById('libraryFiltersToggle');
  const filtersMenu = document.getElementById('libraryFiltersMenu');
  const sortToggle = document.getElementById('catalogSortToggle');
  const sortMenu = document.getElementById('catalogSortMenu');
  const sortSelect = document.getElementById('publicCatalogSort');
  const managementButton = document.getElementById('adminPortalOpen');

  function fontAvailable(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;
    const sample = 'Предложка141WMWM';
    context.font = '72px monospace';
    const fallbackWidth = context.measureText(sample).width;
    context.font = `72px "${name}", monospace`;
    return Math.abs(context.measureText(sample).width - fallbackWidth) > .5;
  }

  function detectDisplayFont() {
    const ready = fontAvailable('Druk Cyr') || fontAvailable('Druk Text Wide Cyr');
    document.body.classList.toggle('has-druk-cyr', ready);
  }

  detectDisplayFont();
  document.fonts?.ready?.then(detectDisplayFont);

  function setPopup(toggle, menu, open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }

  function closeCatalogMenus(except = null) {
    if (except !== filtersMenu) setPopup(filtersToggle, filtersMenu, false);
    if (except !== sortMenu) setPopup(sortToggle, sortMenu, false);
  }

  function togglePopup(toggle, menu, peerCloser) {
    if (!toggle || !menu) return;
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      const open = menu.hidden;
      peerCloser?.();
      setPopup(toggle, menu, open);
    });
    menu.addEventListener('click', event => event.stopPropagation());
  }

  togglePopup(servicesToggle, servicesMenu, () => closeCatalogMenus());
  togglePopup(filtersToggle, filtersMenu, () => {
    setPopup(sortToggle, sortMenu, false);
    setPopup(servicesToggle, servicesMenu, false);
  });
  togglePopup(sortToggle, sortMenu, () => {
    setPopup(filtersToggle, filtersMenu, false);
    setPopup(servicesToggle, servicesMenu, false);
  });

  if (contentToggle && contentPanel) {
    contentToggle.addEventListener('click', event => {
      event.preventDefault();
      const panelRect = contentPanel.getBoundingClientRect();
      const panelTop = window.scrollY + panelRect.top;
      const centeredTop = panelTop - Math.max(0,(window.innerHeight - panelRect.height) / 2);
      const maxScroll = Math.max(0,document.documentElement.scrollHeight - window.innerHeight);
      const target = Math.min(maxScroll,Math.max(0,centeredTop));
      if (window.CR7_LENIS?.scrollTo) window.CR7_LENIS.scrollTo(target,{ duration: 1.1 });
      else window.scrollTo({ top: target, behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.release-filters [data-filter]').forEach(button => {
    button.addEventListener('click', () => setPopup(filtersToggle, filtersMenu, false));
  });

  sortMenu?.querySelectorAll('[data-sort-value]').forEach(button => {
    button.addEventListener('click', () => {
      if (!sortSelect) return;
      sortSelect.value = button.dataset.sortValue;
      sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
      sortMenu.querySelectorAll('[data-sort-value]').forEach(item => item.classList.toggle('active', item === button));
      setPopup(sortToggle, sortMenu, false);
    });
  });

  servicesMenu?.addEventListener('click', event => {
    if (event.target.closest('button')) setPopup(servicesToggle, servicesMenu, false);
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-menu-wrap')) setPopup(servicesToggle, servicesMenu, false);
    if (!event.target.closest('.catalog-menu-wrap')) closeCatalogMenus();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    setPopup(servicesToggle, servicesMenu, false);
    closeCatalogMenus();
  });

  async function refreshAdminState() {
    let isAdmin = false;
    try {
      const client = typeof getConfiguredClient === 'function' ? getConfiguredClient() : window.CR7_SUPABASE_CLIENT;
      if (client) {
        const { data: sessionData } = await client.auth.getSession();
        if (sessionData?.session?.user && !sessionData.session.user.is_anonymous) {
          const { data, error } = await client.rpc('is_site_admin');
          isAdmin = !error && data === true;
        }
      }
    } catch (error) {
      console.warn('Не удалось обновить состояние управления:', error?.message || error);
    }
    document.body.classList.toggle('is-site-admin', isAdmin);
    if (managementButton) {
      managementButton.classList.toggle('is-admin', isAdmin);
      managementButton.setAttribute('aria-label', isAdmin ? 'Открыть управление сайтом' : 'Войти в управление сайтом');
      managementButton.title = isAdmin ? 'Управление сайтом' : 'Вход администратора';
    }
  }

  function bindAdminRefresh() {
    refreshAdminState();
    const client = typeof getConfiguredClient === 'function' ? getConfiguredClient() : window.CR7_SUPABASE_CLIENT;
    client?.auth?.onAuthStateChange?.(() => window.setTimeout(refreshAdminState, 0));
  }

  if (window.CR7_SUPABASE_CLIENT || window.supabase?.createClient) bindAdminRefresh();
  else window.addEventListener('cr7:supabase-ready', bindAdminRefresh, { once: true });
})();
