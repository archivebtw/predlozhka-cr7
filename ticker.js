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
        if (!payload.author_comment) {
          throw new Error('Добавь только комментарий автора — название и описание уже берутся из Steam автоматически.');
        }

        if (state.editingId) {
          const { error } = await state.client.from('games').update(payload).eq('id', state.editingId);
          if (error) throw error;
          showNotice('Изменения сохранены и уже доступны на сайте.', 'success');
        } else {
          const { error } = await state.client.from('games').insert(payload);
          if (error) throw error;
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
