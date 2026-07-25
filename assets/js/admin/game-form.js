function resetForm() {
      state.editingId = null;
      elements.gameForm.reset();
      elements.displayOrder.value = '0';
      elements.published.checked = true;
      elements.formTitle.textContent = 'Добавить игру';
      elements.saveButton.textContent = 'Опубликовать игру';
      elements.saveButton.dataset.defaultText = 'Опубликовать игру';
      elements.cancelEditButton.hidden = true;
      setSteamPreview(null);
      setImportReady(false);
      setImporting(false);
      state.lastImportedSteamUrl = '';
      state.steamComingSoonFallback = false;
      updateAutomaticReleaseStatus();
      clearTimeout(state.steamImportTimer);
    }

    function editGame(id) {
      const game = state.games.find(item => String(item.id) === String(id));
      if (!game) return;
      state.editingId = game.id;
      elements.title.value = game.title || '';
      elements.steamUrl.value = game.steam_url || '';
      elements.coverUrl.value = game.cover_url || '';
      elements.description.value = game.description || '';
      elements.authorComment.value = game.author_comment || '';
      elements.releaseDate.value = game.release_date || '';
      elements.releaseDateText.value = game.release_date_text || '';
      elements.displayOrder.value = Number(game.display_order) || 0;
      elements.steamAppId.value = game.steam_app_id || '';
      elements.isCoop.checked = Boolean(game.is_coop);
      elements.coopType.value = game.coop_type || '';
      elements.coopMinPlayers.value = game.coop_min_players || '';
      elements.coopMaxPlayers.value = game.coop_max_players || '';
      elements.coopSource.value = game.coop_source || '';
      state.steamComingSoonFallback = Boolean(game.coming_soon);
      updateAutomaticReleaseStatus();
      elements.published.checked = Boolean(game.published);
      elements.formTitle.textContent = 'Редактировать игру';
      elements.saveButton.textContent = 'Сохранить изменения';
      elements.saveButton.dataset.defaultText = 'Сохранить изменения';
      elements.cancelEditButton.hidden = false;
      setSteamPreview({
        title: game.title,
        description: game.description,
        coverUrl: game.cover_url,
        releaseDateText: game.release_date_text || game.release_date,
        comingSoon: game.coming_soon,
        isCoop: game.is_coop,
        coopType: game.coop_type,
        coopMinPlayers: game.coop_min_players,
        coopMaxPlayers: game.coop_max_players
      });
      setImportReady(true, false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function syncGame(id) {
      const game = state.games.find(item => String(item.id) === String(id));
      if (!game) return;
      showNotice(`Обновляем данные Steam для «${game.title}»…`, 'info', true);
      const data = await fetchSteamData(game.steam_url, true);
      const payload = {
        steam_app_id: data.appId,
        title: data.title || game.title,
        cover_url: data.coverUrl || game.cover_url,
        description: data.description || game.description,
        release_date: data.releaseDate || null,
        release_date_text: data.releaseDateText || '',
        coming_soon: isUpcomingByLocalDate(data.releaseDate, data.comingSoon),
        is_coop: Boolean(data.isCoop),
        coop_type: data.isCoop ? (data.coopType || 'generic') : '',
        coop_min_players: data.isCoop && data.coopMinPlayers ? Number(data.coopMinPlayers) : null,
        coop_max_players: data.isCoop && data.coopMaxPlayers ? Number(data.coopMaxPlayers) : null,
        coop_source: data.coopSource || '',
        steam_synced_at: new Date().toISOString()
      };
      const { error } = await state.client.from('games').update(payload).eq('id', game.id);
      if (error) throw error;
      await loadGames();
      showNotice('Данные Steam обновлены.', 'success');
    }

    async function deleteGame(id) {
      const game = state.games.find(item => String(item.id) === String(id));
      if (!game || !confirm(`Удалить «${game.title}»?`)) return;
      const { error } = await state.client.from('games').delete().eq('id', game.id);
      if (error) throw error;
      if (String(state.editingId) === String(game.id)) resetForm();
      await loadGames();
      showNotice('Игра удалена.', 'success');
    }
