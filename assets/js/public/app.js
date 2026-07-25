function getConfiguredClient() {
      const config = window.CR7_CONFIG || {};
      const url = String(config.supabaseUrl || '');
      const key = String(config.supabasePublishableKey || '');
      const configured = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && key && !key.includes('YOUR-PUBLISHABLE');
      if (!configured) return null;
      return window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }

    async function loadGames(client) {
      const { data, error } = await client
        .from('games')
        .select('id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source')
        .eq('published', true);

      if (error) throw error;
      state.games = Array.isArray(data) ? data : [];
      render();
    }

    async function start() {
      const client = getConfiguredClient();
      if (!client) {
        showFatal('Supabase ещё не настроен', 'Открой config.js и вставь Project URL и публичный publishable/anon key.');
        return;
      }

      try {
        await loadGames(client);
        setConnection('online', 'Каталог подключён');

        state.channel = client
          .channel('cr7-games-public-v2')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, async () => {
            try { await loadGames(client); } catch (error) { console.error(error); }
          })
          .subscribe(status => {
            if (status === 'SUBSCRIBED') setConnection('online', 'Обновляется онлайн');
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnection('error', 'Связь потеряна');
          });
      } catch (error) {
        console.error(error);
        showFatal('Не удалось загрузить игры', error.message || 'Проверь обновление таблицы и настройки Supabase.');
      }
    }

    elements.search.addEventListener('input', event => {
      state.query = event.target.value;
      render();
    });

    elements.filters.forEach(button => button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      elements.filters.forEach(item => item.classList.toggle('active', item === button));
      render();
    }));


    elements.heroHighlights.addEventListener('click', event => {
      const button = event.target.closest('.quick-game-card');
      if (!button || !button.dataset.gameId) return;
      openGameModal(button.dataset.gameId);
    });

    elements.modalClose.addEventListener('click', closeGameModal);
    elements.modal.addEventListener('click', event => {
      if (event.target.matches('[data-modal-close]')) closeGameModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !elements.modal.hidden) closeGameModal();
    });
    elements.nextRelease.addEventListener('click', () => {
      if (elements.nextRelease.dataset.gameId) openGameModal(elements.nextRelease.dataset.gameId);
    });
    elements.nextRelease.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key) || !elements.nextRelease.dataset.gameId) return;
      event.preventDefault();
      openGameModal(elements.nextRelease.dataset.gameId);
    });

    window.addEventListener('beforeunload', () => {
      if (state.channel) state.channel.unsubscribe();
    });

    const cursorGlow = document.getElementById('cursorGlow');
    if (window.matchMedia('(pointer: fine)').matches && cursorGlow) {
      window.addEventListener('pointermove', event => {
        document.body.classList.add('pointer-active');
        cursorGlow.style.left = `${event.clientX}px`;
        cursorGlow.style.top = `${event.clientY}px`;
      }, { passive: true });
      document.addEventListener('mouseleave', () => document.body.classList.remove('pointer-active'));
    }

    requestAnimationFrame(() => document.body.classList.add('is-ready'));
    setupInfiniteTicker();
    activateDynamicEffects();
    start();
