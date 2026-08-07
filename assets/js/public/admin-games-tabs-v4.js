(() => {
  const portal = document.getElementById('adminPortal');
  const adminSection = document.getElementById('adminSection');
  const list = document.getElementById('suggestionModerationList');
  const search = document.getElementById('proposalGameSearch');
  const statusButtons = [...document.querySelectorAll('[data-suggestion-status]')];
  const pendingButton = statusButtons.find(button => button.dataset.suggestionStatus === 'pending');
  const publishedButton = statusButtons.find(button => button.dataset.suggestionStatus === 'approved');
  if (!portal || !adminSection || !list || !pendingButton || !publishedButton) return;

  const state = {
    games: [],
    query: '',
    sort: 'newest',
    loaded: false,
    loading: false,
    active: false,
    reactionLoading: false,
    reactionTimer: 0,
    catalogChannel: null
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  function client() {
    if (window.CR7_SUPABASE_CLIENT) return window.CR7_SUPABASE_CLIENT;
    if (typeof getConfiguredClient === 'function') return getConfiguredClient();
    return null;
  }

  function playerWord(number) {
    const value = Math.abs(Number(number) || 0) % 100;
    const last = value % 10;
    if (value > 10 && value < 20) return 'игроков';
    if (last === 1) return 'игрок';
    if (last >= 2 && last <= 4) return 'игрока';
    return 'игроков';
  }

  function playersLabel(game) {
    if (!game.is_coop) return '1 игрок';
    const min = Number(game.coop_min_players) || 2;
    const max = Number(game.coop_max_players) || min;
    return min === max ? `${max} ${playerWord(max)}` : `${min}–${max} ${playerWord(max)}`;
  }

  function releaseLabel(game) {
    if (!game.release_date) return game.coming_soon ? 'Скоро' : 'Без даты';
    const date = new Date(`${game.release_date}T12:00:00`);
    if (Number.isNaN(date.getTime())) return 'Без даты';
    return date > new Date() ? new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(date) : 'Вышла';
  }

  function statusLabel(value) {
    return ({ completed: 'Пройдено', dropped: 'Дропнуто', ignored: 'Неинтересно' })[value] || '';
  }

  function ensureSort() {
    let wrap = document.getElementById('adminCatalogSortWrap');
    if (wrap) return wrap;
    wrap = document.createElement('label');
    wrap.id = 'adminCatalogSortWrap';
    wrap.className = 'admin-catalog-sort-wrap';
    wrap.innerHTML = '<select id="adminCatalogSort"><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option><option value="title">По названию</option></select>';
    document.querySelector('.suggestion-moderation')?.appendChild(wrap);
    wrap.querySelector('select').addEventListener('change', event => {
      state.sort = event.target.value;
      render();
    });
    return wrap;
  }

  function setCatalogMode(active) {
    state.active = active;
    adminSection.dataset.catalogTab = active ? 'true' : 'false';
    list.classList.toggle('is-catalog-list', active);
    const sort = ensureSort();
    sort.hidden = !active;
    if (active) startCatalogMonitoring();
    else stopCatalogMonitoring();
  }

  function filteredGames() {
    const query = state.query.trim().toLocaleLowerCase('ru-RU');
    const games = state.games.filter(game => game.published !== false)
      .filter(game => !query || [game.title, game.description, game.release_date_text]
        .some(value => String(value || '').toLocaleLowerCase('ru-RU').includes(query)));
    games.sort((a, b) => {
      if (state.sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'ru-RU');
      const direction = state.sort === 'oldest' ? 1 : -1;
      return (new Date(a.created_at || 0) - new Date(b.created_at || 0)) * direction;
    });
    return games;
  }

  function render() {
    if (!state.active) return;
    const games = filteredGames();
    publishedButton.dataset.catalogCount = String(state.games.filter(game => game.published !== false).length);
    if (!games.length) {
      list.innerHTML = '<div class="suggestions-empty">В опубликованном каталоге нет подходящих игр.</div>';
      return;
    }

    list.innerHTML = games.map(game => {
      const current = String(game.library_status || '');
      const cover = game.cover_url || './assets/images/figma/game-placeholder.svg';
      const steam = String(game.steam_url || '');
      const likes = Number(game.like_count) || 0;
      const dislikes = Number(game.dislike_count) || 0;
      return `
        <article class="admin-catalog-card" data-game-id="${escapeHtml(game.id)}" data-library-status="${escapeHtml(current)}">
          <div class="admin-catalog-card-side">
            <img src="${escapeHtml(cover)}" alt="Обложка ${escapeHtml(game.title)}" onerror="this.src='./assets/images/figma/game-placeholder.svg'">
            <div class="admin-catalog-facts">
              <span class="admin-catalog-players">${escapeHtml(playersLabel(game))}</span>
              <span class="admin-catalog-release">${escapeHtml(releaseLabel(game))}</span>
              <span class="admin-catalog-reactions">${likes} / ${dislikes}</span>
            </div>
          </div>
          <div class="admin-catalog-card-copy">
            <h3>${escapeHtml(game.title || 'Без названия')}</h3>
            <p class="admin-catalog-description">${escapeHtml(game.description || 'Описание не указано.')}</p>
            <span class="admin-catalog-status-label">Отметить как</span>
            <div class="admin-catalog-statuses" role="group" aria-label="Статус игры">
              ${['completed','dropped','ignored'].map(status => `<button class="${current === status ? 'active' : ''}" data-library-value="${status}" type="button">${statusLabel(status)}</button>`).join('')}
            </div>
            <div class="admin-catalog-actions">
              ${steam ? `<a href="${escapeHtml(steam)}" target="_blank" rel="noopener noreferrer">Открыть в Steam ↗</a>` : ''}
              <button class="admin-catalog-save" data-catalog-action="save" type="button">Сохранить ↗</button>
              <button class="admin-catalog-delete" data-catalog-action="delete" aria-label="Удалить игру" type="button">×</button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  async function loadReactionCounts(supabase, renderAfter = true) {
    if (!supabase || state.reactionLoading) return;
    state.reactionLoading = true;
    try {
      const { data, error } = await supabase.rpc('get_game_vote_scores');
      if (error) throw error;
      const totals = new Map((data || []).map(item => [String(item.game_id), {
        like_count: Number(item.like_count) || 0,
        dislike_count: Number(item.dislike_count) || 0,
        reaction_score: Number(item.score) || 0
      }]));
      state.games = state.games.map(game => ({
        ...game,
        like_count: 0,
        dislike_count: 0,
        reaction_score: 0,
        ...(totals.get(String(game.id)) || {})
      }));
      if (renderAfter) {
        list.querySelectorAll('.admin-catalog-card[data-game-id]').forEach(card => {
          const game = state.games.find(item => String(item.id) === String(card.dataset.gameId));
          const element = card.querySelector('.admin-catalog-reactions');
          if (game && element) element.textContent = `${Number(game.like_count) || 0} / ${Number(game.dislike_count) || 0}`;
        });
      }
    } catch (error) {
      console.warn('Не удалось обновить реакции каталога:', error?.message || error);
    } finally {
      state.reactionLoading = false;
    }
  }

  function stopCatalogMonitoring() {
    window.clearInterval(state.reactionTimer);
    state.reactionTimer = 0;
    if (state.catalogChannel) {
      try { state.catalogChannel.unsubscribe(); } catch {}
      state.catalogChannel = null;
    }
  }

  function startCatalogMonitoring() {
    const supabase = client();
    if (!supabase) return;
    if (!state.reactionTimer) {
      state.reactionTimer = window.setInterval(() => {
        if (state.active && !document.hidden) loadReactionCounts(supabase);
      }, 4000);
    }
    if (!state.catalogChannel) {
      state.catalogChannel = supabase
        .channel('cr7-admin-published-games-v1')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
          if (state.active) loadGames(true, true);
        })
        .subscribe();
    }
  }

  async function loadGames(force = false, silent = false) {
    if (state.loading || (state.loaded && !force)) return;
    const supabase = client();
    if (!supabase) {
      list.innerHTML = '<div class="suggestions-empty">Supabase не настроен.</div>';
      return;
    }
    state.loading = true;
    if (!silent) list.innerHTML = '<div class="suggestions-empty">Загружаем опубликованные игры…</div>';
    try {
      const { data, error } = await supabase.from('games').select('id,title,steam_url,steam_app_id,cover_url,description,created_at,published,release_date,release_date_text,coming_soon,is_coop,coop_min_players,coop_max_players,library_status');
      if (error) throw error;
      state.games = Array.isArray(data) ? data : [];
      await loadReactionCounts(supabase, false);
      state.loaded = true;
      render();
    } catch (error) {
      list.innerHTML = `<div class="suggestions-empty">${escapeHtml(error?.message || 'Не удалось загрузить каталог.')}</div>`;
    } finally {
      state.loading = false;
    }
  }

  async function saveStatus(card, button) {
    const supabase = client();
    if (!supabase) return;
    const id = card.dataset.gameId;
    const status = card.dataset.libraryStatus || '';
    button.disabled = true;
    const defaultText = button.textContent;
    button.textContent = 'Сохраняем…';
    const { error } = await supabase.from('games').update({ library_status: status }).eq('id', id);
    button.disabled = false;
    button.textContent = error ? 'Ошибка' : 'Сохранено';
    if (!error) {
      const game = state.games.find(item => String(item.id) === String(id));
      if (game) game.library_status = status;
    }
    window.setTimeout(() => { button.textContent = defaultText; }, 1300);
  }

  async function deleteGame(card, button) {
    const game = state.games.find(item => String(item.id) === String(card.dataset.gameId));
    if (!game || !window.confirm(`Удалить «${game.title}» из каталога?`)) return;
    const supabase = client();
    if (!supabase) return;
    button.disabled = true;
    let error = null;
    try {
      if (typeof window.CR7_INVOKE_STEAM_FUNCTION !== 'function') throw new Error('Сервис удаления ещё не готов. Обнови страницу.');
      const result = await window.CR7_INVOKE_STEAM_FUNCTION({ action: 'delete-published-game', gameId: Number(game.id) });
      if (!result?.deleted) throw new Error(result?.error || 'Сервер не подтвердил удаление игры.');
    } catch (requestError) {
      error = requestError;
    }
    if (error) {
      button.disabled = false;
      window.alert(error.message || 'Не удалось удалить игру.');
      return;
    }
    state.games = state.games.filter(item => String(item.id) !== String(game.id));
    render();
  }

  publishedButton.textContent = 'Опубликованные';
  publishedButton.dataset.catalogCount = '0';

  publishedButton.addEventListener('click', () => {
    window.setTimeout(() => {
      setCatalogMode(true);
      loadGames(true);
    }, 0);
  });

  pendingButton.addEventListener('click', () => {
    setCatalogMode(false);
    window.setTimeout(() => document.getElementById('suggestionModerationRefresh')?.click(), 0);
  });

  search?.addEventListener('input', event => {
    state.query = event.target.value;
    if (state.active) render();
  });

  list.addEventListener('click', event => {
    if (!state.active) return;
    const card = event.target.closest('.admin-catalog-card');
    if (!card) return;
    const status = event.target.closest('[data-library-value]');
    if (status) {
      const value = status.dataset.libraryValue;
      const next = card.dataset.libraryStatus === value ? '' : value;
      card.dataset.libraryStatus = next;
      card.querySelectorAll('[data-library-value]').forEach(button => button.classList.toggle('active', button.dataset.libraryValue === next));
      return;
    }
    const action = event.target.closest('[data-catalog-action]');
    if (!action) return;
    if (action.dataset.catalogAction === 'save') saveStatus(card, action);
    if (action.dataset.catalogAction === 'delete') deleteGame(card, action);
  });

  window.addEventListener('cr7:supabase-ready', () => {
    if (state.active) loadGames(true);
  });
  window.addEventListener('cr7:game-published', () => {
    if (state.active) loadGames(true, true);
  });
  window.addEventListener('focus', () => {
    if (state.active) Promise.all([loadGames(true, true), loadReactionCounts(client())]);
  });
  window.addEventListener('beforeunload', stopCatalogMonitoring);
})();
