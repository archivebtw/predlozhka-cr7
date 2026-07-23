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
        ? `<img src="${escapeHtml(coverUrl)}" alt="Обложка ${escapeHtml(game.title)}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='./assets/images/twitch-logo.webp'">`
        : `<div class="cover-fallback"><img src="${TWITCH_LOGO_DATA}" alt="" aria-hidden="true"></div>`;
      elements.modalBadges.innerHTML = `
        <span class="release-badge ${meta.badgeClass}">${escapeHtml(meta.badge)}</span>
        ${coop ? `<span class="coop-badge">${escapeHtml(coop)}</span>` : ''}`;
      elements.modalTitle.textContent = game.title || 'Без названия';
      elements.modalRelease.textContent = `Дата выхода: ${meta.line} · ${meta.countdown}`;
      elements.modalDescription.textContent = game.description || 'Описание не указано.';
      elements.modalComment.textContent = game.author_comment || '';
      elements.modalCommentSection.hidden = !String(game.author_comment || '').trim();
      elements.modalAdded.textContent = `Добавлено: ${formatDate(game.created_at)}`;
      elements.modalSteam.hidden = !steamUrl;
      if (steamUrl) elements.modalSteam.href = steamUrl;

      elements.modal.hidden = false;
      elements.modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => {
        elements.modal.classList.add('is-open');
        elements.modalClose.focus();
      });
    }

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
