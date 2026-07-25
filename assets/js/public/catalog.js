    function buildCard(game, index) {
      const coverUrl = safeExternalUrl(game.cover_url);
      const cover = coverUrl
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/bloodseeker.webp'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      const meta = getReleaseMeta(game);
      const coop = coopLabel(game);

      const releaseDate = game.release_date ? formatDate(game.release_date, { short: true }) : meta.line;

      return `
        <article class="game-card" data-game-id="${escapeHtml(game.id)}" data-group="${meta.group}" tabindex="0" role="button" aria-label="Открыть подробности игры ${escapeHtml(game.title)}" style="--delay:${Math.min(index * 45, 270)}ms">
          <div class="card-visual">${cover}</div>
          <div class="card-copy">
            <h3 class="card-title">${escapeHtml(game.title)}</h3>
            <p class="card-summary">${escapeHtml(game.description)}</p>
          </div>
          <div class="card-status">
            <span class="release-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
            ${coop ? `<span class="coop-badge">${escapeHtml(coop)}</span>` : ''}
          </div>
          <div class="card-date"><span aria-hidden="true">▣</span><span>${escapeHtml(releaseDate)}</span></div>
          <span class="card-arrow" aria-hidden="true">→</span>
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
          : `${state.games.length} ${state.games.length === 1 ? 'игра' : state.games.length < 5 ? 'игры' : 'игр'} · нажми на строку, чтобы узнать больше`
        : 'Каталог пока пуст';

      if (!games.length) {
        elements.grid.innerHTML = query || state.filter !== 'all'
          ? '<div class="message"><strong>Ничего не найдено</strong>Измени запрос или выбери другой фильтр.</div>'
          : '<div class="message"><strong>Пока нет опубликованных игр</strong>Первая карточка появится после публикации из админ-панели.</div>';
        return;
      }

      elements.grid.innerHTML = `<div class="section-grid">${games.map(buildCard).join('')}</div>`;
      activateDynamicEffects();
    }
