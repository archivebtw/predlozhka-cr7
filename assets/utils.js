function setImportReady(ready, focusComment = false) {
      elements.gameForm.classList.toggle('import-ready', ready);
      elements.detailsStage.setAttribute('aria-hidden', ready ? 'false' : 'true');
      if (ready && focusComment) {
        setTimeout(() => elements.authorComment.focus({ preventScroll: true }), 620);
      }
    }

    function setImporting(importing) {
      elements.gameForm.classList.toggle('importing', importing);
    }

    function setSteamPreview(data) {
      if (!data) {
        elements.steamPreview.classList.remove('show');
        return;
      }
      elements.steamPreview.classList.add('show');
      elements.steamPreviewImage.src = data.coverUrl || '';
      elements.steamPreviewImage.hidden = !data.coverUrl;
      elements.steamPreviewTitle.textContent = data.title || 'Данные Steam';
      elements.steamPreviewText.textContent = data.description || 'Описание не получено.';
      elements.steamPreviewRelease.textContent = data.releaseDateText || (data.comingSoon ? 'Дата уточняется' : 'Дата не указана');
      const label = coopLabel({
        is_coop: Boolean(data.isCoop ?? data.is_coop),
        coop_type: data.coopType ?? data.coop_type,
        coop_min_players: data.coopMinPlayers ?? data.coop_min_players,
        coop_max_players: data.coopMaxPlayers ?? data.coop_max_players
      });
      elements.steamPreviewCoop.hidden = !label;
      elements.steamPreviewCoop.textContent = label ? `👥 ${label}` : '';
    }

    async function fetchSteamData(steamUrl, silent = false) {
      const normalized = normalizeUrl(steamUrl, true);
      if (!silent) setBusy(elements.steamImportButton, true, 'Загрузка…');
      try {
        const { data, error } = await state.client.functions.invoke('steam-game', {
          body: { steamUrl: normalized }
        });
        if (error) {
          let details = error.message || 'Edge Function вернула ошибку.';
          try {
            const body = await error.context?.json();
            if (body?.error) details = body.error;
          } catch {}
          throw new Error(details);
        }
        if (!data?.appId) throw new Error('Steam не вернул данные игры.');
        return data;
      } finally {
        if (!silent) setBusy(elements.steamImportButton, false, 'Загрузка…');
      }
    }

    function applySteamData(data, overwrite = true) {
      elements.steamAppId.value = data.appId || '';
      elements.title.value = overwrite || !elements.title.value ? (data.title || elements.title.value) : elements.title.value;
      elements.coverUrl.value = overwrite || !elements.coverUrl.value ? (data.coverUrl || elements.coverUrl.value) : elements.coverUrl.value;
      elements.description.value = overwrite || !elements.description.value ? (data.description || elements.description.value) : elements.description.value;
      elements.releaseDate.value = data.releaseDate || '';
      elements.releaseDateText.value = data.releaseDateText || '';
      elements.isCoop.checked = Boolean(data.isCoop);
      elements.coopType.value = data.coopType || '';
      elements.coopMinPlayers.value = data.coopMinPlayers || '';
      elements.coopMaxPlayers.value = data.coopMaxPlayers || '';
      elements.coopSource.value = data.coopSource || '';
      state.steamComingSoonFallback = Boolean(data.comingSoon);
      updateAutomaticReleaseStatus();
      setSteamPreview(data);
      setImportReady(true, !state.editingId);
    }

    function hasSteamAppUrl(value) {
      try {
        const url = new URL(String(value || '').trim());
        return /\/app\/\d+(?:\/|$)/.test(url.pathname);
      } catch {
        return false;
      }
    }

    async function importSteamFromCurrentUrl({ overwrite = true, notify = true, force = false } = {}) {
      const normalized = normalizeUrl(elements.steamUrl.value, true);
      if (!hasSteamAppUrl(normalized)) throw new Error('Вставь полную ссылку Steam вида store.steampowered.com/app/123456/...');

      if (!force && state.lastImportedSteamUrl === normalized && elements.title.value.trim() && elements.description.value.trim()) {
        return null;
      }

      if (state.steamImportPromise) return state.steamImportPromise;

      setImporting(true);
      state.steamImportPromise = (async () => {
        const data = await fetchSteamData(normalized);
        applySteamData(data, overwrite);
        state.lastImportedSteamUrl = normalized;
        if (notify) showNotice('Название, описание, дата и кооперативный режим загружены из Steam. Добавь комментарий автора.', 'success');
        return data;
      })();

      try {
        return await state.steamImportPromise;
      } finally {
        state.steamImportPromise = null;
        setImporting(false);
      }
    }

    function scheduleSteamAutoImport(delay = 650) {
      clearTimeout(state.steamImportTimer);
      const value = elements.steamUrl.value.trim();
      if (!hasSteamAppUrl(value)) return;

      state.steamImportTimer = setTimeout(async () => {
        try {
          await importSteamFromCurrentUrl({ overwrite: true, notify: true });
        } catch (error) {
          console.error(error);
          showNotice(error.message || 'Не удалось автоматически загрузить данные Steam.', 'error', true);
        }
      }, delay);
    }
