function catalogReleaseLabel(game, meta) {
      if (meta.group === 'released') return 'Вышла';
      if (meta.group === 'upcoming' && game.release_date && hasExactReleaseDay(game)) {
        const date = parseDate(game.release_date);
        if (date) {
          return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }).format(date);
        }
      }
      return 'Неизвестно';
    }

    function libraryStamp(status) {
      const labels = {
        completed: 'Пройдено',
        dropped: 'Дроп',
        ignored: 'Неинтересно'
      };
      return labels[status] || '';
    }

    function updateCatalogCounts() {
      const activeGames = state.games.filter(game => !String(game.library_status || ''));
      const counts = {
        all: activeGames.length,
        upcoming: activeGames.filter(game => getReleaseMeta(game).group === 'upcoming').length,
        released: activeGames.filter(game => getReleaseMeta(game).group === 'released').length,
        unknown: activeGames.filter(game => getReleaseMeta(game).group === 'unknown').length
      };
      document.querySelectorAll('[data-filter-count]').forEach(element => {
        element.textContent = String(counts[element.dataset.filterCount] || 0);
      });
    }

    function buildCard(game, index) {
      const coverUrl = safeExternalUrl(game.cover_url);
      const cover = coverUrl
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/figma/game-placeholder.svg'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      const meta = getReleaseMeta(game);
      const favorite = Boolean(game.is_favorite);
      const libraryStatus = String(game.library_status || '');
      const reputation = Number(state.reputationScores?.[String(game.id)] || 0);
      const stamp = libraryStamp(libraryStatus);

      return `
        <article class="game-card${favorite ? ' is-favorite' : ''}${libraryStatus ? ` is-${escapeHtml(libraryStatus)}` : ''}" data-game-id="${escapeHtml(game.id)}" tabindex="0" role="button" aria-label="Открыть подробности игры ${escapeHtml(game.title)}" style="--delay:${Math.min(index * 45, 260)}ms">
          <div class="card-visual">${cover}</div>
          <div class="card-shade" aria-hidden="true"></div>
          <span class="card-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <span class="game-reputation visually-hidden" aria-label="Голосов за игру: ${reputation}">${reputation}</span>
          <div class="card-top">
            ${game.is_coop ? '<span class="coop-badge">Кооп</span>' : ''}
            <span class="release-badge ${meta.badgeClass}">${escapeHtml(catalogReleaseLabel(game, meta))}</span>
          </div>
          <div class="card-bottom">
            <h3 class="card-title">${escapeHtml(game.title)}</h3>
            <span class="card-open-hint">Подробнее</span>
          </div>
          ${favorite ? '<span class="card-favorite" aria-label="Избранная игра">★</span>' : ''}
          ${stamp ? `<span class="library-stamp ${escapeHtml(libraryStatus)}">${escapeHtml(stamp)}</span>` : ''}
        </article>`;
    }

    function render() {
      const sorted = sortGames(state.games);
      renderHero(sorted);
      updateCatalogCounts();

      const query = state.query.trim().toLocaleLowerCase('ru');
      const games = sorted.filter(game => {
        const meta = getReleaseMeta(game);
        const libraryStatus = String(game.library_status || '');
        const isActive = !libraryStatus;
        const matchesFilter = state.filter === 'all'
          ? isActive
          : state.filter === 'completed'
            ? libraryStatus === 'completed'
            : state.filter === 'dropped'
              ? libraryStatus === 'dropped'
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

      elements.grid.innerHTML = `<div class="section-grid">${games.map((game, index) => buildCard(game, index)).join('')}</div>`;
      activateDynamicEffects();
    }
