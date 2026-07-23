function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      })[char]);
    }

    function showNotice(message, type = 'info', sticky = false) {
      clearTimeout(state.noticeTimer);
      elements.notice.className = `notice show ${type}`;
      elements.notice.textContent = message;
      if (!sticky) state.noticeTimer = setTimeout(() => { elements.notice.className = 'notice'; }, 5000);
    }

    function setBusy(button, busy, busyText) {
      if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
      button.disabled = busy;
      button.textContent = busy ? busyText : button.dataset.defaultText;
    }

    function getConfiguredClient() {
      const config = window.CR7_CONFIG || {};
      const url = String(config.supabaseUrl || '');
      const key = String(config.supabasePublishableKey || '');
      const configured = url.startsWith('https://') && !url.includes('YOUR-PROJECT') && key && !key.includes('YOUR-PUBLISHABLE');
      if (!configured) return null;
      return window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }

    function normalizeUrl(value, steamOnly = false) {
      const text = String(value || '').trim();
      if (!text) return '';
      let url;
      try { url = new URL(text); } catch { throw new Error('Проверь формат ссылки.'); }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Разрешены только ссылки http/https.');
      if (steamOnly && !['store.steampowered.com', 'steamcommunity.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
        throw new Error('Укажи ссылку на Steam.');
      }
      return url.href;
    }

    function parseDate(value) {
      if (!value) return null;
      const date = new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function daysUntil(value) {
      const date = parseDate(value);
      if (!date) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return Math.ceil((date - today) / 86400000);
    }

    function isUpcomingByLocalDate(releaseDate, steamFallback = false) {
      const date = parseDate(releaseDate);
      if (!date) return Boolean(steamFallback);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return date.getTime() > today.getTime();
    }

    function updateAutomaticReleaseStatus() {
      const releaseDate = elements.releaseDate.value;
      const hasDate = Boolean(parseDate(releaseDate));
      const upcoming = isUpcomingByLocalDate(releaseDate, state.steamComingSoonFallback);
      const days = hasDate ? daysUntil(releaseDate) : null;

      elements.releaseStatusAuto.classList.remove('upcoming', 'released', 'unknown');
      if (hasDate && upcoming) {
        elements.releaseStatusAuto.classList.add('upcoming');
        elements.releaseStatusBadge.textContent = days === 1 ? 'Завтра' : `Через ${days} дн.`;
        elements.releaseStatusHint.textContent = 'Будущая дата определена по локальному времени этого устройства.';
      } else if (hasDate) {
        elements.releaseStatusAuto.classList.add('released');
        elements.releaseStatusBadge.textContent = days === 0 ? 'Сегодня' : 'Вышла';
        elements.releaseStatusHint.textContent = 'Дата релиза наступила по локальному времени этого устройства.';
      } else if (state.steamComingSoonFallback) {
        elements.releaseStatusAuto.classList.add('upcoming');
        elements.releaseStatusBadge.textContent = 'Скоро';
        elements.releaseStatusHint.textContent = 'Точной даты нет — временно используется статус Steam.';
      } else {
        elements.releaseStatusAuto.classList.add('unknown');
        elements.releaseStatusBadge.textContent = 'Без даты';
        elements.releaseStatusHint.textContent = 'Добавь Steam-ссылку или дату релиза.';
      }
      return upcoming;
    }

    function playerWord(number) {
      const value = Math.abs(Number(number) || 0) % 100;
      const last = value % 10;
      if (value > 10 && value < 20) return 'игроков';
      if (last === 1) return 'игрок';
      if (last >= 2 && last <= 4) return 'игрока';
      return 'игроков';
    }

    function coopLabel(game) {
      if (!game?.is_coop) return '';
      const typeLabels = {
        mixed: 'Онлайн и локальный кооп',
        online: 'Онлайн-кооп',
        local: 'Локальный кооп',
        generic: 'Кооператив'
      };
      const prefix = typeLabels[String(game.coop_type || '')] || 'Кооператив';
      const min = Number(game.coop_min_players) || null;
      const max = Number(game.coop_max_players) || null;
      if (min && max && min < max) return `${prefix} · ${min}–${max} ${playerWord(max)}`;
      if (max) return `${prefix} · до ${max} ${playerWord(max)}`;
      return prefix;
    }

    function releaseLabel(game) {
      const upcoming = isUpcomingByLocalDate(game.release_date, game.coming_soon);
      if (upcoming && game.release_date) {
        const days = daysUntil(game.release_date);
        if (days === 0) return 'Релиз сегодня';
        if (days === 1) return 'Релиз завтра';
        if (days > 1) return `Через ${days} дн.`;
        return 'Проверь дату';
      }
      if (upcoming) return 'Дата уточняется';
      if (game.release_date) return 'Уже вышла';
      return 'Без даты';
    }

    function sortGames(games) {
      return [...games].sort((a, b) => {
        const aUpcoming = isUpcomingByLocalDate(a.release_date, a.coming_soon);
        const bUpcoming = isUpcomingByLocalDate(b.release_date, b.coming_soon);
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        const aDate = parseDate(a.release_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = parseDate(b.release_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aUpcoming && aDate !== bDate) return aDate - bDate;
        const orderDiff = (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
        if (orderDiff) return orderDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    }
