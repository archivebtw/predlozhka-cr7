    function getConfiguredClient() {
      const config = window.CR7_CONFIG || {};
      const url = String(config.supabaseUrl || '');
      const key = String(config.supabasePublishableKey || '');
      const configured = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && key && !key.includes('YOUR-PUBLISHABLE');
      if (!configured) return null;
      window.CR7_PUBLIC_CLIENT = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
      });
      return window.CR7_PUBLIC_CLIENT;
    }

    const PUBLIC_GAME_FIELDS = 'id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source';

    function isMissingLibraryColumn(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return error.code === '42703'
        || /(?:library_status|is_favorite).*(?:does not exist|schema cache)/i.test(details)
        || /(?:does not exist|schema cache).*(?:library_status|is_favorite)/i.test(details);
    }

    const PUBLIC_GAME_FIELDS = 'id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source';

    function isMissingLibraryColumn(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return error.code === '42703'
        || /(?:library_status|is_favorite).*(?:does not exist|schema cache)/i.test(details)
        || /(?:does not exist|schema cache).*(?:library_status|is_favorite)/i.test(details);
    }

    const PUBLIC_GAME_FIELDS = 'id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source';

    function isMissingLibraryColumn(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return error.code === '42703'
        || /(?:library_status|is_favorite).*(?:does not exist|schema cache)/i.test(details)
        || /(?:does not exist|schema cache).*(?:library_status|is_favorite)/i.test(details);
    }

    const PUBLIC_GAME_FIELDS = 'id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source';

    function isMissingLibraryColumn(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return error.code === '42703'
        || /(?:library_status|is_favorite).*(?:does not exist|schema cache)/i.test(details)
        || /(?:does not exist|schema cache).*(?:library_status|is_favorite)/i.test(details);
    }

    function isMissingReputationRpc(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return ['42883','PGRST202'].includes(error.code) || /get_game_vote_scores|game_votes/i.test(details);
    }

    async function loadReputation(client) {
      const { data,error } = await client.rpc('get_game_vote_scores');
      if (error) {
        if (!isMissingReputationRpc(error)) console.warn('Не удалось загрузить репутацию игр:',error.message || error);
        state.reputationSchemaReady = false;
        state.reputationScores = {};
        state.currentVotes = {};
        return;
      }
      state.reputationSchemaReady = true;
      state.reputationScores = Object.fromEntries((data || []).map(item => [String(item.game_id),Number(item.score) || 0]));
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session?.user) {
        state.currentVotes = {};
        return;
      }
      const { data: votes,error: votesError } = await client.rpc('get_my_game_votes');
      state.currentVotes = votesError ? {} : Object.fromEntries((votes || []).map(item => [String(item.game_id),Number(item.vote) || 0]));
    }

    const PUBLIC_GAME_FIELDS = 'id,title,steam_url,cover_url,description,author_comment,created_at,display_order,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source';

    function isMissingLibraryColumn(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return error.code === '42703'
        || /(?:library_status|is_favorite).*(?:does not exist|schema cache)/i.test(details)
        || /(?:does not exist|schema cache).*(?:library_status|is_favorite)/i.test(details);
    }

    function isMissingReputationRpc(error) {
      if (!error) return false;
      const details = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
      return ['42883','PGRST202'].includes(error.code) || /get_game_vote_scores|game_votes/i.test(details);
    }

    function resetReputationState() {
      state.reputationSchemaReady = false;
      state.reputationScores = {};
      state.currentVotes = {};
    }

    async function loadReputation(client) {
      const { data,error } = await client.rpc('get_game_vote_scores');
      if (error) {
        if (!isMissingReputationRpc(error)) console.warn('Не удалось загрузить репутацию игр:',error.message || error);
        resetReputationState();
        return;
      }
      state.reputationSchemaReady = true;
      state.reputationScores = Object.fromEntries((data || []).map(item => [String(item.game_id),Number(item.score) || 0]));
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session?.user) {
        state.currentVotes = {};
        return;
      }
      const { data: votes,error: votesError } = await client.rpc('get_my_game_votes');
      state.currentVotes = votesError ? {} : Object.fromEntries((votes || []).map(item => [String(item.game_id),Number(item.vote) || 0]));
    }

    async function loadGames(client) {
      let result = await client
        .from('games')
        .select(`${PUBLIC_GAME_FIELDS},library_status,is_favorite`)
        .eq('published', true);

      // Не скрываем весь каталог, если frontend опубликован раньше SQL-миграции.
      // После выполнения game_library_status.sql следующий Realtime/reload вернёт отметки.
      if (isMissingLibraryColumn(result.error)) {
        state.librarySchemaReady = false;
        console.warn('Отметки библиотеки ещё не добавлены в Supabase; загружаем каталог без них.');
        result = await client
          .from('games')
          .select(PUBLIC_GAME_FIELDS)
          .eq('published', true);
      } else {
        state.librarySchemaReady = true;
      }

      if (result.error) throw result.error;
      state.games = (Array.isArray(result.data) ? result.data : []).map(game => ({
        library_status: '',
        is_favorite: false,
        ...game
      }));
      // Каталог не должен ждать необязательную RPC репутации: сначала показываем игры,
      // затем безопасно дорисовываем рейтинг отдельным запросом.
      render();
      loadReputation(client)
        .then(() => render())
        .catch(error => {
          console.warn('Репутация временно недоступна:',error?.message || error);
          resetReputationState();
        });
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
