async function persistGame(payload) {
      const write = nextPayload => state.editingId
        ? state.client.from('games').update(nextPayload).eq('id', state.editingId)
        : state.client.from('games').insert(nextPayload);
      let { error } = await write(payload);
      const oldCommentConstraint = !payload.author_comment
        && error?.code === '23514'
        && String(error.message || '').includes('games_author_comment_check');
      if (oldCommentConstraint) ({ error } = await write({ ...payload, author_comment: EMPTY_AUTHOR_COMMENT }));
      if (error) throw error;
    }

    function confirmDuplicateGame(gameTitle, existingCount) {
      return new Promise(resolve => {
        const limitReached = existingCount >= 2;
        elements.duplicateTitle.textContent = limitReached ? 'Достигнут лимит копий' : 'Игра уже есть в каталоге';
        elements.duplicateText.textContent = limitReached
          ? `«${gameTitle}» уже добавлена два раза. Третий экземпляр создать нельзя.`
          : `«${gameTitle}» уже есть в каталоге. Разрешено добавить только один дополнительный экземпляр.`;
        elements.duplicateConfirm.hidden = limitReached;
        elements.duplicateModal.hidden = false;
        elements.duplicateModal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => elements.duplicateModal.classList.add('is-open'));

        const onKeydown = event => { if (event.key === 'Escape') finish(false); };
        const finish = allowed => {
          elements.duplicateModal.classList.remove('is-open');
          elements.duplicateModal.setAttribute('aria-hidden', 'true');
          window.setTimeout(() => { elements.duplicateModal.hidden = true; }, 260);
          elements.duplicateCancel.onclick = null;
          elements.duplicateConfirm.onclick = null;
          elements.duplicateModal.onclick = null;
          document.removeEventListener('keydown', onKeydown);
          resolve(allowed);
        };
        elements.duplicateCancel.onclick = () => finish(false);
        elements.duplicateConfirm.onclick = () => finish(true);
        elements.duplicateModal.onclick = event => { if (event.target.matches('[data-duplicate-close]')) finish(false); };
        document.addEventListener('keydown', onKeydown);
        (limitReached ? elements.duplicateCancel : elements.duplicateConfirm).focus();
      });
    }

    elements.loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      setBusy(elements.loginButton, true, 'Вход…');
      try {
        const { data, error } = await state.client.auth.signInWithPassword({
          email: elements.email.value.trim(),
          password: elements.password.value
        });
        if (error) throw error;
        await showLoggedIn(data.user);
        elements.loginForm.reset();
        showNotice('Вход выполнен.', 'success');
      } catch (error) {
        console.error(error);
        showNotice(error.message || 'Не удалось войти.', 'error', true);
      } finally {
        setBusy(elements.loginButton, false, 'Вход…');
      }
    });

    elements.logoutButton.addEventListener('click', async () => {
      await state.client.auth.signOut();
      resetForm();
      await showLoggedOut();
    });

    elements.releaseDate.addEventListener('input', updateAutomaticReleaseStatus);
    elements.releaseDate.addEventListener('change', updateAutomaticReleaseStatus);
    setInterval(updateAutomaticReleaseStatus, 60000);

    elements.isCoop.addEventListener('change', () => updateCoopEditor(true));
    [elements.coopMinPlayers, elements.coopMaxPlayers].forEach(input => {
      input.addEventListener('input', () => updateCoopEditor(true));
    });

    elements.steamUrl.addEventListener('input', () => {
      state.lastImportedSteamUrl = '';
      scheduleSteamAutoImport();
    });

    elements.steamUrl.addEventListener('paste', () => {
      state.lastImportedSteamUrl = '';
      setTimeout(() => scheduleSteamAutoImport(120), 0);
    });

    elements.steamUrl.addEventListener('change', () => scheduleSteamAutoImport(0));

    elements.steamImportButton.addEventListener('click', async () => {
      try {
        await importSteamFromCurrentUrl({ overwrite: true, notify: true, force: true });
      } catch (error) {
        console.error(error);
        showNotice(error.message || 'Не удалось загрузить данные Steam.', 'error', true);
      }
    });

    elements.changeGameButton.addEventListener('click', () => {
      setImportReady(false);
      state.lastImportedSteamUrl = '';
      setTimeout(() => {
        elements.steamUrl.focus();
        elements.steamUrl.select();
      }, 380);
    });

    elements.gameForm.addEventListener('submit', async event => {
      event.preventDefault();
      setBusy(elements.saveButton, true, 'Сохранение…');
      try {
        const normalizedSteamUrl = normalizeUrl(elements.steamUrl.value, true);

        if ((!elements.title.value.trim() || !elements.description.value.trim() || !elements.steamAppId.value) && normalizedSteamUrl) {
          showNotice('Получаем название и описание из Steam…', 'info', true);
          await importSteamFromCurrentUrl({ overwrite: true, notify: false, force: true });
        }

        const payload = {
          title: elements.title.value.trim(),
          steam_url: normalizedSteamUrl,
          cover_url: normalizeUrl(elements.coverUrl.value),
          description: elements.description.value.trim(),
          author_comment: elements.authorComment.value.trim(),
          display_order: Number.parseInt(elements.displayOrder.value, 10) || 0,
          published: elements.published.checked,
          steam_app_id: elements.steamAppId.value ? Number(elements.steamAppId.value) : null,
          release_date: elements.releaseDate.value || null,
          release_date_text: elements.releaseDateText.value.trim(),
          coming_soon: updateAutomaticReleaseStatus(),
          is_coop: elements.isCoop.checked,
          coop_type: elements.isCoop.checked ? (elements.coopType.value || 'generic') : '',
          coop_min_players: elements.isCoop.checked && elements.coopMinPlayers.value ? Number(elements.coopMinPlayers.value) : null,
          coop_max_players: elements.isCoop.checked && elements.coopMaxPlayers.value ? Number(elements.coopMaxPlayers.value) : null,
          coop_source: elements.coopSource.value.trim(),
          steam_synced_at: elements.steamAppId.value ? new Date().toISOString() : null
        };

        if (!payload.title || !payload.description) {
          throw new Error('Steam не заполнил название или описание. Нажми «Обновить из Steam» и проверь ссылку.');
        }
        if (payload.is_coop && payload.coop_min_players && payload.coop_max_players && payload.coop_min_players > payload.coop_max_players) {
          throw new Error('Минимальное число игроков не может быть больше максимального.');
        }
        if (!state.editingId && payload.steam_app_id) {
          const duplicateCount = state.games.filter(game => Number(game.steam_app_id) === payload.steam_app_id).length;
          if (duplicateCount && !(await confirmDuplicateGame(payload.title, duplicateCount))) return;
        }

        if (state.editingId) {
          await persistGame(payload);
          showNotice('Изменения сохранены и уже доступны на сайте.', 'success');
        } else {
          await persistGame(payload);
          showNotice('Игра опубликована и уже доступна на сайте.', 'success');
        }

        resetForm();
        await loadGames();
      } catch (error) {
        console.error(error);
        showNotice(error.message || 'Не удалось сохранить игру.', 'error', true);
      } finally {
        setBusy(elements.saveButton, false, 'Сохранение…');
      }
    });

    elements.cancelEditButton.addEventListener('click', resetForm);

    elements.catalogSearch.addEventListener('input', () => {
      state.catalogQuery = elements.catalogSearch.value;
      elements.catalogSearchClear.hidden = !state.catalogQuery;
      renderGames();
    });

    elements.catalogSearchClear.addEventListener('click', () => {
      elements.catalogSearch.value = '';
      state.catalogQuery = '';
      elements.catalogSearchClear.hidden = true;
      renderGames();
      elements.catalogSearch.focus();
    });

    elements.catalogSort.addEventListener('change', () => {
      state.catalogSort = elements.catalogSort.value;
      renderGames();
    });

    elements.gameList.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      try {
        if (button.dataset.action === 'edit') editGame(button.dataset.id);
        if (button.dataset.action === 'sync') await syncGame(button.dataset.id);
        if (button.dataset.action === 'delete') await deleteGame(button.dataset.id);
      } catch (error) {
        console.error(error);
        showNotice(error.message || 'Операция не выполнена.', 'error', true);
      }
    });

    boot();
