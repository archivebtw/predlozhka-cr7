function openGameModal(gameId) {
      const game = state.games.find(item => String(item.id) === String(gameId));
      if (!game) return;

      const meta = getReleaseMeta(game);
      const coop = coopLabel(game);
      const coverUrl = safeExternalUrl(game.cover_url);
      const steamUrl = safeExternalUrl(game.steam_url, ['steampowered.com', 'steamcommunity.com']);

      state.activeGameId = String(game.id);
      lastFocusedElement = document.activeElement;
      elements.modalMedia.innerHTML = coverUrl
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/bloodseeker.webp'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      elements.modalBadges.innerHTML = `
        <span class="release-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
        ${coop ? `<span class="coop-badge">${escapeHtml(coop)}</span>` : ''}
        ${game.is_favorite ? '<span class="modal-favorite-badge">★ Избранное</span>' : ''}`;
      elements.modalTitle.textContent = game.title || 'Без названия';
      elements.modalRelease.textContent = `Дата выхода: ${meta.line} · ${meta.countdown}`;
      elements.modalDescription.textContent = game.description || 'Описание не указано.';
      const authorComment = String(game.author_comment || '').replaceAll(EMPTY_AUTHOR_COMMENT, '').trim();
      elements.modalComment.textContent = authorComment;
      elements.modalCommentSection.hidden = !authorComment;
      elements.modalAdded.textContent = `Добавлено: ${formatDate(game.created_at)}`;
      elements.modalSteam.hidden = !steamUrl;
      if (steamUrl) elements.modalSteam.href = steamUrl;
      updateLibraryControls(game);
      updateReputationControls(game);

      elements.modal.hidden = false;
      elements.modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        elements.modal.classList.add('is-open');
        elements.modalClose.focus();
      });
    }

    function updateLibraryControls(game) {
      const status = String(game?.library_status || '');
      elements.modalLibraryActions.forEach(button => {
        const action = button.dataset.libraryAction;
        const active = action === 'favorite' ? Boolean(game?.is_favorite) : status === action;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',String(active));
        button.disabled = !state.librarySchemaReady;
      });
      elements.modalLibraryNotice.textContent = state.librarySchemaReady
        ? ''
        : 'Сначала выполни supabase/game_library_status.sql в Supabase SQL Editor, затем обнови страницу.';
      elements.modalLibraryNotice.className = state.librarySchemaReady
        ? 'modal-library-notice'
        : 'modal-library-notice is-error';
    }

    async function updateGameLibrary(action) {
      const game = state.games.find(item => String(item.id) === String(state.activeGameId));
      const button = elements.modalLibraryActions.find(item => item.dataset.libraryAction === action);
      if (!game || !button) return;
      if (!state.librarySchemaReady) {
        updateLibraryControls(game);
        return;
      }
      button.disabled = true;
      elements.modalLibraryNotice.textContent = 'Проверяем права администратора…';
      elements.modalLibraryNotice.className = 'modal-library-notice is-info';
      try {
        const client = getConfiguredClient();
        if (!client) throw new Error('Supabase не настроен.');
        const { data: sessionData,error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session?.user) throw new Error('Войди через вкладку «Управление», чтобы менять библиотеку.');
        const { data: isAdmin,error: adminError } = await client.rpc('is_site_admin');
        if (adminError) throw adminError;
        if (isAdmin !== true) throw new Error('Эта функция доступна только администраторам.');

        const payload = action === 'favorite'
          ? { is_favorite: !Boolean(game.is_favorite) }
          : { library_status: String(game.library_status || '') === action ? '' : action };
        const { error } = await client.from('games').update(payload).eq('id',game.id);
        if (error) throw error;
        Object.assign(game,payload);
        updateLibraryControls(game);
        elements.modalBadges.innerHTML = `
          <span class="release-badge ${getReleaseMeta(game).badgeClass}">${escapeHtml(getReleaseMeta(game).badge)}</span>
          ${coopLabel(game) ? `<span class="coop-badge">${escapeHtml(coopLabel(game))}</span>` : ''}
          ${game.is_favorite ? '<span class="modal-favorite-badge">★ Избранное</span>' : ''}`;
        elements.modalLibraryNotice.textContent = action === 'favorite'
          ? game.is_favorite ? 'Игра добавлена в избранное.' : 'Игра удалена из избранного.'
          : game.library_status === 'completed' ? 'Игра перемещена в пройденные.'
            : game.library_status === 'ignored' ? 'Игра перемещена в неинтересные.' : 'Игра возвращена в основной каталог.';
        elements.modalLibraryNotice.className = 'modal-library-notice is-success';
        render();
      } catch (error) {
        console.error(error);
        const missingColumn = typeof isMissingLibraryColumn === 'function' && isMissingLibraryColumn(error);
        if (missingColumn) {
          state.librarySchemaReady = false;
          updateLibraryControls(game);
          return;
        }
        elements.modalLibraryNotice.textContent = error.message || 'Не удалось сохранить изменение.';
        elements.modalLibraryNotice.className = 'modal-library-notice is-error';
        button.disabled = false;
      }
    }

    elements.modalLibraryActions.forEach(button => button.addEventListener('click',() => updateGameLibrary(button.dataset.libraryAction)));

    function formatReputation(score) {
      const value = Number(score) || 0;
      return value > 0 ? `+${value}` : String(value);
    }

    function updateReputationControls(game) {
      const gameId = String(game?.id || '');
      const score = Number(state.reputationScores[gameId] || 0);
      const currentVote = Number(state.currentVotes[gameId] || 0);
      elements.modalReputationScore.textContent = formatReputation(score);
      elements.modalReputationScore.className = score > 0 ? 'is-positive' : score < 0 ? 'is-negative' : '';
      elements.modalVoteActions.forEach(button => {
        const active = Number(button.dataset.vote) === currentVote;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',String(active));
        button.disabled = !state.reputationSchemaReady;
      });
      elements.modalReputationNotice.textContent = state.reputationSchemaReady
        ? ''
        : 'Сначала выполни supabase/game_reputation.sql в Supabase SQL Editor.';
      elements.modalReputationNotice.className = state.reputationSchemaReady
        ? 'modal-library-notice'
        : 'modal-library-notice is-error';
    }

    async function voteForGame(direction) {
      const game = state.games.find(item => String(item.id) === String(state.activeGameId));
      if (!game || !state.reputationSchemaReady) return;
      const gameId = String(game.id);
      elements.modalVoteActions.forEach(button => { button.disabled = true; });
      elements.modalReputationNotice.textContent = 'Сохраняем голос…';
      elements.modalReputationNotice.className = 'modal-library-notice is-info';
      try {
        const client = getConfiguredClient();
        if (!client) throw new Error('Supabase не настроен.');
        const { data: sessionData,error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session?.user) throw new Error('Войди через вкладку «Управление», чтобы голосовать.');
        const { data: isAdmin,error: adminError } = await client.rpc('is_site_admin');
        if (adminError) throw adminError;
        if (isAdmin !== true) throw new Error('Голосовать могут только администраторы.');
        const { data: myVotes,error: votesError } = await client.rpc('get_my_game_votes');
        if (votesError) throw votesError;
        const previousVote = Number((myVotes || []).find(item => String(item.game_id) === gameId)?.vote || 0);
        const nextVote = previousVote === direction ? 0 : direction;
        const { data,error } = await client.rpc('vote_game',{ p_game_id: Number(game.id),p_vote: nextVote });
        if (error) throw error;
        const result = Array.isArray(data) ? data[0] : data;
        state.reputationScores[gameId] = Number(result?.score) || 0;
        state.currentVotes[gameId] = Number(result?.current_vote) || 0;
        updateReputationControls(game);
        elements.modalReputationNotice.textContent = nextVote === 1
          ? 'Игра поднята в рейтинге.'
          : nextVote === -1 ? 'Игра опущена в рейтинге.' : 'Голос отменён.';
        elements.modalReputationNotice.className = 'modal-library-notice is-success';
        render();
      } catch (error) {
        console.error(error);
        elements.modalReputationNotice.textContent = error.message || 'Не удалось сохранить голос.';
        elements.modalReputationNotice.className = 'modal-library-notice is-error';
        elements.modalVoteActions.forEach(button => { button.disabled = false; });
      }
    }

    elements.modalVoteActions.forEach(button => button.addEventListener('click',() => voteForGame(Number(button.dataset.vote))));

    function closeGameModal() {
      if (elements.modal.hidden) return;
      elements.modal.classList.remove('is-open');
      elements.modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      state.activeGameId = null;
      window.setTimeout(() => {
        elements.modal.hidden = true;
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
      }, 430);
    }


    let revealObserver = null;

    function activateDynamicEffects() {
      if (revealObserver) revealObserver.disconnect();
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          const target = entry.target;
          const isCard = target.classList.contains('game-card');
          const delay = isCard
            ? Math.max(0, Number.parseInt(target.style.getPropertyValue('--delay'), 10) || 0)
            : 0;

          revealObserver.unobserve(target);
          window.setTimeout(() => {
            target.classList.add('is-visible');
            if (isCard) {
              window.setTimeout(() => target.classList.add('tilt-ready'), 850);
            }
          }, delay);
        });
      }, { threshold: .12, rootMargin: '0px 0px -40px' });

      document.querySelectorAll('.game-card, .reveal').forEach(item => revealObserver.observe(item));

      const cards = [...document.querySelectorAll('.game-card')];
      cards.forEach(card => {
        card.addEventListener('click', event => {
          if (event.target.closest('[data-card-action], a, button')) return;
          openGameModal(card.dataset.gameId);
        });
        card.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openGameModal(card.dataset.gameId);
        });
      });

      if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      cards.forEach(card => {
        card.addEventListener('pointermove', event => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          card.style.setProperty('--mx', `${x * 100}%`);
          card.style.setProperty('--my', `${y * 100}%`);
          card.style.setProperty('--ry', `${(x - .5) * 7}deg`);
          card.style.setProperty('--rx', `${(.5 - y) * 7}deg`);
        });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--ry', '0deg');
          card.style.setProperty('--rx', '0deg');
        });
      });
    }

    function showFatal(title, details) {
      setConnection('error', 'Ошибка подключения');
      elements.subtitle.textContent = 'Каталог недоступен';
      elements.grid.innerHTML = `<div class="message error"><strong>${escapeHtml(title)}</strong>${escapeHtml(details)}</div>`;
    }
