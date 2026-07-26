function buildCard(game, index) {
      const coverUrl = safeExternalUrl(game.cover_url);
      const cover = coverUrl
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/bloodseeker.webp'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      const meta = getReleaseMeta(game);
      const coop = coopLabel(game);

      return `
        <article class="game-card" data-game-id="${escapeHtml(game.id)}" tabindex="0" role="button" aria-label="Открыть подробности игры ${escapeHtml(game.title)}" style="--delay:${Math.min(index * 45, 260)}ms">
          <span class="card-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="card-visual">${cover}</div>
          <div class="card-bottom">
            <h3 class="card-title">${escapeHtml(game.title)}</h3>
            <p class="card-summary">${escapeHtml(game.description)}</p>
          </div>
          <div class="card-top">
            <span class="release-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
          </div>
          <div class="card-chips">
            <span class="date-chip"><span class="chip-label">Релиз</span>${escapeHtml(meta.line)}</span>
            ${coop ? `<span class="coop-badge">${escapeHtml(coop)}</span>` : ''}
          </div>
          <div class="card-actions"><span class="card-open-hint"><span>Подробнее</span><b aria-hidden="true">↗</b></span></div>
        </article>`;
    }

    function render() {
      const sorted = sortGames(state.games);
      renderHero(sorted);

      const query = state.query.trim().toLocaleLowerCase('ru');
      const games = sorted.filter(game => {
        const meta = getReleaseMeta(game);
        const matchesFilter = state.filter === 'all' || meta.group === state.filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        return [game.title, game.description, game.author_comment, game.release_date_text, coopLabel(game)]
          .some(value => String(value || '').toLocaleLowerCase('ru').includes(query));
      });

      elements.subtitle.textContent = state.games.length
        ? query || state.filter !== 'all'
          ? `${games.length} найдено из ${state.games.length}`
          : `${state.games.length} ${state.games.length === 1 ? 'игра' : state.games.length < 5 ? 'игры' : 'игр'} · разделены по статусу релиза`
        : 'Каталог пока пуст';

      if (!games.length) {
        elements.grid.innerHTML = query || state.filter !== 'all'
          ? '<div class="message"><strong>Ничего не найдено</strong>Измени запрос или выбери другой фильтр.</div>'
          : '<div class="message"><strong>Пока нет опубликованных игр</strong>Первая карточка появится после публикации из админ-панели.</div>';
        return;
      }

      const order = state.filter === 'all' ? ['upcoming', 'released', 'unknown'] : [state.filter];
      const sections = order.map(group => {
        const groupGames = games.filter(game => getReleaseMeta(game).group === group);
        if (!groupGames.length) return '';
        const info = groupInfo[group];
        const cards = groupGames.map((game, index) => buildCard(game, index)).join('');
        return `
          <section class="catalog-group" data-group="${group}">
            <div class="group-head reveal">
              <div>
                <span class="group-kicker">${info.kicker}</span>
                <h3>${info.title}</h3>
                <p>${info.description}</p>
              </div>
              <span class="group-count">${groupGames.length}</span>
            </div>
            <div class="section-grid">${cards}</div>
          </section>`;
      }).join('');

      elements.grid.innerHTML = sections;
      activateDynamicEffects();
    }
