function buildCard(game, index) {
      const coverUrl = safeExternalUrl(game.cover_url);
      const cover = coverUrl
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/bloodseeker.webp'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      const meta = getReleaseMeta(game);
      const coop = coopLabel(game);
      const favorite = Boolean(game.is_favorite);
      const libraryStatus = String(game.library_status || '');

      return `
        <article class="game-card${favorite ? ' is-favorite' : ''}" data-game-id="${escapeHtml(game.id)}" tabindex="0" role="button" aria-label="Открыть подробности игры ${escapeHtml(game.title)}" style="--delay:${Math.min(index * 45, 260)}ms">
          <span class="card-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="card-visual">${cover}</div>
          <div class="card-bottom">
            <h3 class="card-title">${favorite ? '<span class="favorite-star" aria-label="Избранная игра">★</span>' : ''}${escapeHtml(game.title)}</h3>
            <p class="card-summary">${escapeHtml(game.description)}</p>
          </div>
          <div class="card-top">
            <span class="release-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
          </div>
          <div class="card-chips">
            <span class="date-chip"><span class="chip-label">Релиз</span>${escapeHtml(meta.line)}</span>
            ${coop ? `<span class="coop-badge">${escapeHtml(coop)}</span>` : ''}
            ${libraryStatus === 'completed' ? '<span class="library-state-chip completed">Пройдено</span>' : ''}
            ${libraryStatus === 'ignored' ? '<span class="library-state-chip ignored">Не интересует</span>' : ''}
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
        const libraryStatus = String(game.library_status || '');
        const isActive = !libraryStatus;
        const matchesFilter = state.filter === 'all'
          ? isActive
          : state.filter === 'completed'
            ? libraryStatus === 'completed'
            : state.filter === 'ignored'
              ? libraryStatus === 'ignored'
              : state.filter === 'favorite'
                ? Boolean(game.is_favorite)
                : isActive && meta.group === state.filter;
        if (!matchesFilter) return false;
        if (!query) return true;
        return [game.title, game.description, game.author_comment, game.release_date_text, coopLabel(game)]
          .some(value => String(value || '').toLocaleLowerCase('ru').includes(query));
      });

      elements.subtitle.textContent = state.games.length
        ? query || state.filter !== 'all'
          ? `${games.length} найдено из ${state.games.length}`
          : `${games.length} ${games.length === 1 ? 'игра' : games.length < 5 ? 'игры' : 'игр'} в основном каталоге${state.games.length > games.length ? ` · ${state.games.length - games.length} в библиотеке` : ''}`
        : 'Каталог пока пуст';

      if (!games.length) {
        elements.grid.innerHTML = query || state.filter !== 'all'
          ? '<div class="message"><strong>Ничего не найдено</strong>Измени запрос или выбери другой фильтр.</div>'
          : '<div class="message"><strong>Пока нет опубликованных игр</strong>Первая карточка появится после публикации из админ-панели.</div>';
        return;
      }

      const libraryGroups = {
        favorite: { kicker: 'Личный выбор', title: 'Избранные игры', description: 'Игры, отмеченные администратором звёздочкой.' },
        completed: { kicker: 'Архив прохождений', title: 'Пройденные игры', description: 'Игры, прохождение которых уже завершено.' },
        ignored: { kicker: 'Вне основного каталога', title: 'Неинтересные игры', description: 'Игры, которые больше не рассматриваются для стримов.' }
      };
      const libraryFilter = libraryGroups[state.filter];
      const order = libraryFilter ? [state.filter] : state.filter === 'all' ? ['upcoming', 'released', 'unknown'] : [state.filter];
      const sections = order.map(group => {
        const groupGames = libraryFilter ? games : games.filter(game => getReleaseMeta(game).group === group);
        if (!groupGames.length) return '';
        const info = libraryFilter || groupInfo[group];
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
