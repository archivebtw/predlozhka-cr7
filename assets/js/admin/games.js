function renderGames() {
      const query = state.catalogQuery.trim().toLocaleLowerCase('ru-RU');
      const games = state.games.filter(game => String(game.title || '').toLocaleLowerCase('ru-RU').includes(query));

      games.sort((a, b) => {
        if (state.catalogSort === 'alphabetical') {
          return String(a.title || '').localeCompare(String(b.title || ''), 'ru', { sensitivity: 'base', numeric: true });
        }
        if (state.catalogSort === 'release') {
          const aDate = parseDate(a.release_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const bDate = parseDate(b.release_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          if (aDate !== bDate) {
            if (aDate === Number.MAX_SAFE_INTEGER) return 1;
            if (bDate === Number.MAX_SAFE_INTEGER) return -1;
            return bDate - aDate;
          }
          return String(a.title || '').localeCompare(String(b.title || ''), 'ru', { sensitivity: 'base', numeric: true });
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });

      const gameWord = count => {
        const lastTwo = count % 100;
        const last = count % 10;
        if (lastTwo >= 11 && lastTwo <= 14) return 'игр';
        if (last === 1) return 'игра';
        if (last >= 2 && last <= 4) return 'игры';
        return 'игр';
      };
      elements.countLabel.textContent = query
        ? `${games.length} из ${state.games.length}`
        : `${games.length} ${gameWord(games.length)}`;

      if (!state.games.length) {
        elements.gameList.innerHTML = '<div class="empty">Каталог пока пуст. Добавь первую игру через форму слева.</div>';
        return;
      }
      if (!games.length) {
        elements.gameList.innerHTML = `<div class="empty search-empty"><strong>Ничего не найдено</strong><span>В каталоге нет игры с названием «${escapeHtml(state.catalogQuery.trim())}».</span></div>`;
        return;
      }

      elements.gameList.innerHTML = games.map(game => {
        const cover = game.cover_url
          ? `<img src="${escapeHtml(game.cover_url)}" alt="" onerror="this.parentElement.innerHTML='<div class=&quot;admin-cover-fallback&quot;>TWITCH</div>'">`
          : '<div class="admin-cover-fallback">TWITCH</div>';
        return `
          <article class="admin-game">
            <div class="admin-cover">${cover}</div>
            <div class="admin-game-body">
              <div class="admin-game-top">
                <div>
                  <h3>${escapeHtml(game.title)}</h3>
                  <p>${escapeHtml(game.description).slice(0, 155)}${String(game.description || '').length > 155 ? '…' : ''}</p>
                </div>
                <div class="admin-game-actions">
                  <button class="icon-btn sync" type="button" data-action="sync" data-id="${game.id}">Steam ↻</button>
                  <button class="icon-btn" type="button" data-action="edit" data-id="${game.id}">Изменить</button>
                  <button class="icon-btn delete" type="button" data-action="delete" data-id="${game.id}">Удалить</button>
                </div>
              </div>
              <div class="admin-meta">
                <span class="meta-pill ${isUpcomingByLocalDate(game.release_date, game.coming_soon) ? 'soon' : ''}">${escapeHtml(releaseLabel(game))}</span>
                <span class="meta-pill">${escapeHtml(game.release_date_text || game.release_date || 'Дата не указана')}</span>
                ${game.is_coop ? `<span class="meta-pill coop">👥 ${escapeHtml(coopLabel(game))}</span>` : ''}
                ${game.published ? '' : '<span class="meta-pill draft">Черновик</span>'}
              </div>
            </div>
          </article>`;
      }).join('');
    }

    async function loadGames() {
      const { data, error } = await state.client
        .from('games')
        .select('id,title,steam_url,cover_url,description,author_comment,created_at,display_order,published,steam_app_id,release_date,release_date_text,coming_soon,steam_synced_at,is_coop,coop_type,coop_min_players,coop_max_players,coop_source');
      if (error) throw error;
      state.games = Array.isArray(data) ? data : [];
      renderGames();
    }

    async function verifyAdmin() {
      const { data, error } = await state.client.rpc('is_site_admin');
      if (error) throw error;
      return data === true;
    }
