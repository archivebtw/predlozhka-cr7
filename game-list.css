function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>'"]/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
      })[char]);
    }

    function safeExternalUrl(value, allowedHosts = []) {
      try {
        const url = new URL(String(value || '').trim());
        if (!['http:', 'https:'].includes(url.protocol)) return '';
        if (allowedHosts.length && !allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return '';
        return url.href;
      } catch {
        return '';
      }
    }

    function parseDate(value) {
      if (!value) return null;
      const date = new Date(`${value}T12:00:00`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value, options = {}) {
      const date = value instanceof Date ? value : parseDate(value) || new Date(value);
      if (!date || Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('ru-RU', {
        day: options.short ? 'numeric' : 'numeric',
        month: options.short ? 'short' : 'long',
        year: 'numeric'
      }).format(date);
    }

    function daysUntil(value) {
      const date = parseDate(value);
      if (!date) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return Math.ceil((date - today) / 86400000);
    }

    function pluralDays(number) {
      const abs = Math.abs(number) % 100;
      const last = abs % 10;
      if (abs > 10 && abs < 20) return 'дней';
      if (last === 1) return 'день';
      if (last >= 2 && last <= 4) return 'дня';
      return 'дней';
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
      const labels = {
        mixed: 'Онлайн и локальный кооп',
        online: 'Онлайн-кооп',
        local: 'Локальный кооп',
        generic: 'Кооператив'
      };
      const prefix = labels[String(game.coop_type || '')] || 'Кооператив';
      const min = Number(game.coop_min_players) || null;
      const max = Number(game.coop_max_players) || null;
      if (min && max && min < max) return `${prefix} · ${min}–${max} ${playerWord(max)}`;
      if (max) return `${prefix} · до ${max} ${playerWord(max)}`;
      return prefix;
    }

    function getReleaseMeta(game) {
      const date = parseDate(game.release_date);
      const days = daysUntil(game.release_date);
      const raw = String(game.release_date_text || '').trim();
      const comingSoon = Boolean(game.coming_soon);

      // Фактическая дата важнее потенциально устаревшего флага Steam.
      // Если дата уже прошла, игра относится во «Вышли» и не может
      // появляться в блоке ближайшего релиза.
      if (date && (days < 0 || (days === 0 && !comingSoon))) {
        return {
          group: 'released',
          badge: 'УЖЕ ВЫШЛА',
          badgeClass: 'released',
          countdown: 'Доступна в Steam',
          line: raw || formatDate(date),
          timestamp: date.getTime()
        };
      }

      // Будущая дата считается релизом независимо от того, успел ли Steam
      // обновить coming_soon. Это защищает каталог от рассинхронизации данных.
      if (date && days >= 0) {
        if (days === 0) return { group: 'upcoming', badge: 'РЕЛИЗ СЕГОДНЯ', badgeClass: 'soon', countdown: 'Сегодня', line: raw || formatDate(date), timestamp: date.getTime() };
        if (days === 1) return { group: 'upcoming', badge: 'ВЫХОДИТ ЗАВТРА', badgeClass: 'soon', countdown: 'Завтра', line: raw || formatDate(date), timestamp: date.getTime() };
        return { group: 'upcoming', badge: `ЧЕРЕЗ ${days} ${pluralDays(days)}`, badgeClass: 'soon', countdown: `Через ${days} ${pluralDays(days)}`, line: raw || formatDate(date), timestamp: date.getTime() };
      }

      if (comingSoon) {
        return { group: 'unknown', badge: 'ДАТА УТОЧНЯЕТСЯ', badgeClass: 'unknown', countdown: 'Ожидается', line: raw || 'Steam пока не назвал точную дату', timestamp: Number.MAX_SAFE_INTEGER - 1 };
      }

      return { group: 'unknown', badge: 'БЕЗ ДАТЫ', badgeClass: 'unknown', countdown: 'Дата неизвестна', line: raw || 'Информация о релизе не указана', timestamp: Number.MAX_SAFE_INTEGER };
    }

    function sortGames(games) {
      return [...games].sort((a, b) => {
        const aMeta = getReleaseMeta(a);
        const bMeta = getReleaseMeta(b);
        const groupRank = { upcoming: 0, unknown: 1, released: 2 };
        const rankDiff = groupRank[aMeta.group] - groupRank[bMeta.group];
        if (rankDiff) return rankDiff;
        if (aMeta.group === 'upcoming') return aMeta.timestamp - bMeta.timestamp;
        const orderDiff = (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
        if (orderDiff) return orderDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    }
