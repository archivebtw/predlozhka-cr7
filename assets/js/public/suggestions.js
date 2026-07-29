(() => {
  const elements = {
    panel: document.getElementById('suggestionsPanel'),
    close: document.getElementById('suggestionsClose'),
    triggers: [...document.querySelectorAll('.suggestions-trigger')],
    tabs: [...document.querySelectorAll('[data-suggestions-tab]')],
    views: [...document.querySelectorAll('[data-suggestions-panel]')],
    notice: document.getElementById('suggestionsNotice'),
    sort: document.getElementById('suggestionsSort'),
    grid: document.getElementById('suggestionsGrid'),
    form: document.getElementById('suggestionForm'),
    steamUrl: document.getElementById('suggestionSteamUrl'),
    previewButton: document.getElementById('suggestionPreviewButton'),
    preview: document.getElementById('suggestionPreview'),
    previewImage: document.getElementById('suggestionPreviewImage'),
    previewTitle: document.getElementById('suggestionPreviewTitle'),
    previewText: document.getElementById('suggestionPreviewText'),
    comment: document.getElementById('suggestionComment'),
    submitButton: document.getElementById('suggestionSubmitButton'),
    commentsPanel: document.getElementById('suggestionCommentsPanel'),
    commentsClose: document.getElementById('suggestionCommentsClose'),
    commentsTitle: document.getElementById('suggestionCommentsTitle'),
    commentsList: document.getElementById('suggestionCommentsList'),
    commentForm: document.getElementById('suggestionCommentForm'),
    commentBody: document.getElementById('suggestionCommentBody'),
    commentDelete: document.getElementById('suggestionCommentDelete'),
    moderationList: document.getElementById('suggestionModerationList'),
    moderationRefresh: document.getElementById('suggestionModerationRefresh'),
    moderationFilters: [...document.querySelectorAll('[data-suggestion-status]')],
    pendingCount: document.getElementById('suggestionPendingCount'),
    adminOnly: [...document.querySelectorAll('[data-suggestions-admin-only]')]
  };

  if (!elements.panel) return;

  const suggestionState = {
    client: null,
    games: [],
    preview: null,
    activeSuggestionId: null,
    noticeTimer: null,
    moderation: [],
    moderationStatus: 'pending',
    isAdmin: false,
    eventsBound: false,
    started: false
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function safeUrl(value, allowedHosts = []) {
    try {
      const url = new URL(String(value || ''));
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (allowedHosts.length && !allowedHosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function configuredClient() {
    const config = window.CR7_CONFIG || {};
    const url = String(config.supabaseUrl || '');
    const key = String(config.supabasePublishableKey || '');
    if (!window.supabase?.createClient || !url.startsWith('https://') || !key) return null;
    if (window.CR7_SUPABASE_CLIENT) return window.CR7_SUPABASE_CLIENT;
    window.CR7_SUPABASE_CLIENT = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return window.CR7_SUPABASE_CLIENT;
  }

  function errorMessage(error, fallback = 'Не удалось выполнить действие.') {
    const message = String(error?.message || error?.error_description || fallback);
    if (/anonymous sign-?ins?.*(disabled|not enabled)|anonymous provider.*disabled/i.test(message)) {
      return 'Анонимные действия пока выключены. Включи Anonymous Sign-Ins в Supabase Authentication.';
    }
    if (/get_public_game_suggestions|submit_game_suggestion|schema cache|PGRST202|42883/i.test(message)) {
      return 'Система предложений ещё не подключена к базе. Выполни supabase/game_suggestions.sql.';
    }
    if (/только администратор|недостаточно прав|site_admin/i.test(message)) {
      return 'Это действие доступно только администратору.';
    }
    return message;
  }

  function showNotice(message, type = 'info') {
    clearTimeout(suggestionState.noticeTimer);
    elements.notice.textContent = message;
    elements.notice.className = `suggestions-notice show ${type}`;
    suggestionState.noticeTimer = setTimeout(() => {
      elements.notice.className = 'suggestions-notice';
    }, 5500);
  }

  function setBusy(button, busy, busyText = 'Подождите…') {
    if (!button) return;
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.defaultText;
  }

  function setTab(name) {
    const target = name === 'submit' && suggestionState.isAdmin ? 'submit' : 'rating';
    elements.tabs.forEach(button => button.classList.toggle('active', button.dataset.suggestionsTab === target));
    elements.views.forEach(view => {
      const active = view.dataset.suggestionsPanel === target;
      view.classList.toggle('active', active);
      view.hidden = !active;
    });
    if (target === 'rating') loadPublicSuggestions();
  }

  function openPanel(view = 'rating') {
    const requestedAdminView = view === 'submit' && !suggestionState.isAdmin;
    elements.panel.hidden = false;
    elements.panel.setAttribute('aria-hidden', 'false');
    elements.triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    document.documentElement.classList.add('suggestions-open');
    setTab(view);
    if (requestedAdminView) showNotice('Предлагать игры может только администратор.', 'error');
    window.setTimeout(() => (view === 'submit' && suggestionState.isAdmin ? elements.steamUrl : elements.close)?.focus(), 30);
  }

  function closePanel() {
    if (!elements.commentsPanel.hidden) closeComments();
    elements.panel.hidden = true;
    elements.panel.setAttribute('aria-hidden', 'true');
    elements.triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
    document.documentElement.classList.remove('suggestions-open');
  }

  async function ensureViewerSession() {
    if (!suggestionState.client) throw new Error('Supabase не настроен.');
    const { data, error } = await suggestionState.client.auth.getSession();
    if (error) throw error;
    if (data?.session?.user) return data.session;
    const result = await suggestionState.client.auth.signInAnonymously();
    if (result.error) throw result.error;
    if (!result.data?.session) throw new Error('Не удалось создать анонимную сессию.');
    return result.data.session;
  }

  async function requireAdminSession() {
    if (!suggestionState.client) throw new Error('Supabase не настроен.');
    if (!suggestionState.isAdmin) throw new Error('Это действие доступно только администратору.');
    const { data, error } = await suggestionState.client.auth.getSession();
    if (error) throw error;
    if (!data?.session?.user) throw new Error('Войди в аккаунт администратора.');
    return data.session;
  }

  function parseSteamAppId(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (!['store.steampowered.com', 'steamcommunity.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
      const match = url.pathname.match(/\/app\/(\d+)/i);
      return match ? Number(match[1]) : null;
    } catch {
      return null;
    }
  }

  function clearPreview() {
    suggestionState.preview = null;
    elements.preview.hidden = true;
    elements.comment.disabled = true;
    elements.submitButton.disabled = true;
    elements.previewImage.removeAttribute('src');
  }

  function applyAdminAccess() {
    elements.adminOnly.forEach(element => {
      element.hidden = !suggestionState.isAdmin;
      element.setAttribute('aria-hidden', suggestionState.isAdmin ? 'false' : 'true');
    });
    if (!suggestionState.isAdmin && !elements.views.find(view => view.dataset.suggestionsPanel === 'submit')?.hidden) {
      setTab('rating');
    }
    renderPublicSuggestions();
  }

  async function previewSteamGame() {
    if (!suggestionState.isAdmin) {
      showNotice('Проверять и предлагать игры может только администратор.', 'error');
      return;
    }
    const steamUrl = elements.steamUrl.value.trim();
    if (!parseSteamAppId(steamUrl)) {
      clearPreview();
      showNotice('Вставь ссылку вида store.steampowered.com/app/12345/.', 'error');
      return;
    }

    setBusy(elements.previewButton, true, 'Ищем…');
    try {
      await requireAdminSession();
      const { data, error } = await suggestionState.client.functions.invoke('steam-game', {
        body: { action: 'suggestion-preview', steamUrl }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.appId || !data?.title) throw new Error('Steam не вернул данные игры.');

      suggestionState.preview = data;
      elements.previewTitle.textContent = data.title;
      elements.previewText.textContent = data.description || 'Описание в Steam не указано.';
      const cover = safeUrl(data.coverUrl);
      if (cover) elements.previewImage.src = cover;
      else elements.previewImage.src = './assets/images/figma/game-placeholder.svg';
      elements.previewImage.alt = `Обложка ${data.title}`;
      elements.preview.hidden = false;
      elements.comment.disabled = false;
      elements.submitButton.disabled = false;
      showNotice('Игра найдена. Можно добавить комментарий и отправить.', 'success');
    } catch (error) {
      clearPreview();
      showNotice(errorMessage(error, 'Не удалось получить данные из Steam.'), 'error');
    } finally {
      setBusy(elements.previewButton, false);
    }
  }

  async function submitSuggestion(event) {
    event.preventDefault();
    if (!suggestionState.isAdmin) {
      showNotice('Предлагать игры может только администратор.', 'error');
      return;
    }
    const preview = suggestionState.preview;
    if (!preview?.appId) {
      showNotice('Сначала проверь Steam-ссылку.', 'error');
      return;
    }

    setBusy(elements.submitButton, true, 'Отправляем…');
    try {
      await requireAdminSession();
      const { data, error } = await suggestionState.client.rpc('submit_game_suggestion', {
        p_steam_app_id: Number(preview.appId),
        p_title: preview.title,
        p_cover_url: preview.coverUrl || '',
        p_description: preview.description || '',
        p_comment: elements.comment.value.trim()
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const status = result?.suggestion_status;
      let message = result?.was_created
        ? 'Предложение отправлено модератору.'
        : `Игра уже была предложена — твоя поддержка учтена. Всего поддержек: ${Number(result?.support_count) || 0}.`;
      if (status === 'approved') message = 'Эта игра уже находится в рейтинге. Открой рейтинг и проголосуй за неё.';
      if (status === 'selected') message = 'Эта игра уже выбрана для стрима.';
      if (status === 'rejected') message = 'Эту игру уже рассматривали и отклонили.';
      if (['completed', 'archived'].includes(status)) message = 'Эта игра уже находится в истории предложки.';
      showNotice(message, status === 'rejected' ? 'error' : 'success');
      elements.form.reset();
      clearPreview();
      if (['approved', 'selected'].includes(status)) setTab('rating');
    } catch (error) {
      showNotice(errorMessage(error), 'error');
    } finally {
      setBusy(elements.submitButton, false);
      elements.submitButton.disabled = !suggestionState.preview;
    }
  }

  function publicSort(games) {
    const items = [...games];
    if (elements.sort.value === 'newest') {
      return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (elements.sort.value === 'comments') {
      return items.sort((a, b) => Number(b.comment_count) - Number(a.comment_count) || Number(b.vote_count) - Number(a.vote_count));
    }
    return items.sort((a, b) => {
      if (a.status === 'selected' && b.status !== 'selected') return -1;
      if (b.status === 'selected' && a.status !== 'selected') return 1;
      return Number(b.vote_count) - Number(a.vote_count) || new Date(a.created_at) - new Date(b.created_at);
    });
  }

  function renderPublicSuggestions() {
    const games = publicSort(suggestionState.games);
    if (!games.length) {
      elements.grid.innerHTML = '<div class="suggestions-empty"><strong>Рейтинг пока пуст</strong><br>Предложи первую игру — после проверки модератором она появится здесь.</div>';
      return;
    }

    elements.grid.innerHTML = games.map((game, index) => {
      const cover = safeUrl(game.cover_url);
      const steam = safeUrl(game.steam_url, ['steampowered.com', 'steamcommunity.com']);
      const selected = game.status === 'selected';
      const voteCount = Number(game.vote_count) || 0;
      const voteLabel = selected
        ? 'Голосование завершено'
        : !suggestionState.isAdmin
          ? `Голос администратора · ${voteCount}`
          : game.has_voted
            ? `Голос учтён · ${voteCount}`
            : `Голосовать · ${voteCount}`;
      return `
        <article class="suggestion-card${selected ? ' is-selected' : ''}" data-suggestion-id="${Number(game.id)}">
          <div class="suggestion-rank">${selected ? '◆' : `#${index + 1}`}</div>
          <img class="suggestion-cover" src="${escapeHtml(cover || './assets/images/figma/game-placeholder.svg')}" alt="Обложка ${escapeHtml(game.title)}" loading="lazy" referrerpolicy="no-referrer">
          <div class="suggestion-card-copy">
            <span>${selected ? 'Выбрано для стрима' : `${Number(game.vote_count) || 0} голосов`}</span>
            <h4>${steam ? `<a href="${escapeHtml(steam)}" target="_blank" rel="noopener noreferrer">${escapeHtml(game.title)} ↗</a>` : escapeHtml(game.title)}</h4>
            <p>${escapeHtml(game.description || 'Описание не указано.')}</p>
            <div class="suggestion-stats"><span>↑ ${Number(game.support_count) || 0} поддержали заявку</span><span>◌ ${Number(game.comment_count) || 0} комментариев</span></div>
          </div>
          <div class="suggestion-card-actions">
            <button class="suggestion-vote${game.has_voted ? ' active' : ''}" ${selected || !suggestionState.isAdmin ? 'disabled' : ''} data-suggestion-vote type="button">${voteLabel}</button>
            <button class="suggestion-comments-button" data-suggestion-comments type="button">Комментарии · ${Number(game.comment_count) || 0}</button>
          </div>
        </article>`;
    }).join('');
  }

  async function loadPublicSuggestions() {
    if (!suggestionState.client) return;
    elements.grid.innerHTML = '<div class="suggestions-empty">Загружаем рейтинг…</div>';
    try {
      const { data, error } = await suggestionState.client.rpc('get_public_game_suggestions');
      if (error) throw error;
      suggestionState.games = Array.isArray(data) ? data : [];
      renderPublicSuggestions();
    } catch (error) {
      elements.grid.innerHTML = `<div class="suggestions-empty">${escapeHtml(errorMessage(error, 'Не удалось загрузить рейтинг.'))}</div>`;
    }
  }

  async function toggleVote(id, button) {
    if (!suggestionState.isAdmin) {
      showNotice('Голосовать может только администратор.', 'error');
      return;
    }
    setBusy(button, true, 'Сохраняем…');
    try {
      await requireAdminSession();
      const { data, error } = await suggestionState.client.rpc('toggle_suggestion_vote', {
        p_suggestion_id: Number(id)
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      const game = suggestionState.games.find(item => String(item.id) === String(id));
      if (game) {
        game.has_voted = Boolean(result?.active);
        game.vote_count = Number(result?.vote_count) || 0;
      }
      renderPublicSuggestions();
      showNotice(result?.active ? 'Голос учтён.' : 'Голос снят.', 'success');
    } catch (error) {
      showNotice(errorMessage(error), 'error');
      setBusy(button, false);
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }

  async function loadComments(id) {
    elements.commentsList.innerHTML = '<div class="suggestions-empty">Загружаем комментарии…</div>';
    try {
      const { data, error } = await suggestionState.client.rpc('get_public_suggestion_comments', {
        p_suggestion_id: Number(id)
      });
      if (error) throw error;
      const comments = Array.isArray(data) ? data : [];
      const mine = comments.find(comment => comment.is_mine);
      elements.commentBody.value = mine?.body || '';
      elements.commentDelete.hidden = !mine;
      elements.commentsList.innerHTML = comments.length
        ? comments.map(comment => `
          <article class="suggestion-comment${comment.is_mine ? ' is-mine' : ''}">
            <header><strong>${comment.is_mine ? 'Вы' : 'Зритель'}</strong><time>${escapeHtml(formatDate(comment.created_at))}</time></header>
            <p>${escapeHtml(comment.body)}</p>
          </article>`).join('')
        : '<div class="suggestions-empty">Комментариев пока нет. Начни обсуждение.</div>';
    } catch (error) {
      elements.commentsList.innerHTML = `<div class="suggestions-empty">${escapeHtml(errorMessage(error))}</div>`;
    }
  }

  function openComments(id) {
    const game = suggestionState.games.find(item => String(item.id) === String(id));
    if (!game) return;
    suggestionState.activeSuggestionId = Number(id);
    elements.commentsTitle.textContent = game.title;
    elements.commentsPanel.hidden = false;
    elements.commentsPanel.setAttribute('aria-hidden', 'false');
    loadComments(id);
    window.setTimeout(() => elements.commentsClose.focus(), 30);
  }

  function closeComments() {
    elements.commentsPanel.hidden = true;
    elements.commentsPanel.setAttribute('aria-hidden', 'true');
    suggestionState.activeSuggestionId = null;
  }

  async function saveComment(event) {
    event.preventDefault();
    const id = suggestionState.activeSuggestionId;
    const body = elements.commentBody.value.trim();
    if (!id || !body) return;
    const button = elements.commentForm.querySelector('button[type="submit"]');
    setBusy(button, true, 'Сохраняем…');
    try {
      await ensureViewerSession();
      const { error } = await suggestionState.client.rpc('upsert_suggestion_comment', {
        p_suggestion_id: Number(id),
        p_body: body
      });
      if (error) throw error;
      showNotice('Комментарий сохранён.', 'success');
      await Promise.all([loadComments(id), loadPublicSuggestions()]);
    } catch (error) {
      showNotice(errorMessage(error), 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function deleteMyComment() {
    const id = suggestionState.activeSuggestionId;
    if (!id || !window.confirm('Удалить ваш комментарий к этой игре?')) return;
    setBusy(elements.commentDelete, true, 'Удаляем…');
    try {
      await ensureViewerSession();
      const { error } = await suggestionState.client.rpc('delete_my_suggestion_comment', {
        p_suggestion_id: Number(id)
      });
      if (error) throw error;
      elements.commentBody.value = '';
      showNotice('Комментарий удалён.', 'success');
      await Promise.all([loadComments(id), loadPublicSuggestions()]);
    } catch (error) {
      showNotice(errorMessage(error), 'error');
    } finally {
      setBusy(elements.commentDelete, false);
    }
  }

  function relationCount(value) {
    if (Array.isArray(value)) return Number(value[0]?.count) || 0;
    return Number(value?.count) || 0;
  }

  function moderationActions(item) {
    const actions = {
      pending: [['approve', 'Добавить в рейтинг'], ['reject', 'Отклонить']],
      approved: [['select', 'Выбрать для стрима'], ['archive', 'В архив']],
      selected: [['complete', 'Отметить пройденной'], ['reopen', 'Вернуть в рейтинг']],
      rejected: [['approve', 'Одобрить'], ['archive', 'В архив']],
      completed: [['reopen', 'Вернуть в рейтинг'], ['archive', 'В архив']],
      archived: [['reopen', 'Вернуть в рейтинг']]
    };
    return (actions[item.status] || []).map(([action, label]) =>
      `<button data-action="${action}" data-suggestion-id="${Number(item.id)}" type="button">${label}</button>`
    ).join('');
  }

  function renderModeration() {
    if (!elements.moderationList) return;
    const pending = suggestionState.moderation.filter(item => item.status === 'pending').length;
    if (elements.pendingCount) elements.pendingCount.textContent = String(pending);
    const items = suggestionState.moderation
      .filter(item => item.status === suggestionState.moderationStatus)
      .sort((a, b) => {
        if (a.status === 'pending') return relationCount(b.suggestion_supports) - relationCount(a.suggestion_supports) || new Date(a.created_at) - new Date(b.created_at);
        return new Date(b.updated_at) - new Date(a.updated_at);
      });

    if (!items.length) {
      elements.moderationList.innerHTML = '<div class="suggestions-empty">В этом разделе нет заявок.</div>';
      return;
    }

    elements.moderationList.innerHTML = items.map(item => {
      const cover = safeUrl(item.cover_url);
      const steam = safeUrl(item.steam_url, ['steampowered.com', 'steamcommunity.com']);
      const comments = Array.isArray(item.suggestion_comments) ? item.suggestion_comments : [];
      return `
        <article class="moderation-card">
          <img src="${escapeHtml(cover || './assets/images/figma/game-placeholder.svg')}" alt="">
          <div class="moderation-card-copy">
            <h3><a href="${escapeHtml(steam || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} ↗</a></h3>
            <div class="moderation-card-meta"><span>Steam ID ${Number(item.steam_app_id)}</span><span>↑ ${relationCount(item.suggestion_supports)} поддержек</span><span>◆ ${relationCount(item.suggestion_votes)} голосов</span><span>${escapeHtml(formatDate(item.created_at))}</span></div>
            ${item.rejection_reason ? `<p><strong>Причина:</strong> ${escapeHtml(item.rejection_reason)}</p>` : ''}
            <div class="moderation-comments">${comments.length ? comments.map(comment => `
              <div class="moderation-comment${comment.is_hidden ? ' is-hidden' : ''}"><span>${comment.is_hidden ? '[Скрыт] ' : ''}${escapeHtml(comment.body)}</span><button data-comment-id="${Number(comment.id)}" data-comment-hidden="${comment.is_hidden ? 'false' : 'true'}" type="button">${comment.is_hidden ? 'Вернуть' : 'Скрыть'}</button></div>
            `).join('') : '<span class="moderation-card-meta">Комментариев нет</span>'}</div>
          </div>
          <div class="moderation-actions">${moderationActions(item)}</div>
        </article>`;
    }).join('');
  }

  async function checkAdminAndLoad() {
    if (!suggestionState.client || !elements.moderationList) return;
    try {
      const { data: sessionData } = await suggestionState.client.auth.getSession();
      if (!sessionData?.session?.user) {
        suggestionState.isAdmin = false;
        applyAdminAccess();
        elements.moderationList.innerHTML = '<div class="suggestions-empty">Войди, чтобы загрузить очередь.</div>';
        return;
      }
      const { data: isAdmin, error: adminError } = await suggestionState.client.rpc('is_site_admin');
      if (adminError || isAdmin !== true) {
        suggestionState.isAdmin = false;
        applyAdminAccess();
        elements.moderationList.innerHTML = '<div class="suggestions-empty">Очередь доступна администратору.</div>';
        return;
      }
      suggestionState.isAdmin = true;
      applyAdminAccess();
      await loadModeration();
    } catch (error) {
      suggestionState.isAdmin = false;
      applyAdminAccess();
      elements.moderationList.innerHTML = `<div class="suggestions-empty">${escapeHtml(errorMessage(error))}</div>`;
    }
  }

  async function loadModeration() {
    if (!suggestionState.isAdmin) return;
    elements.moderationList.innerHTML = '<div class="suggestions-empty">Загружаем очередь…</div>';
    const { data, error } = await suggestionState.client
      .from('game_suggestions')
      .select('*,suggestion_supports(count),suggestion_votes(count),suggestion_comments(id,body,is_hidden,created_at)')
      .order('created_at', { ascending: false });
    if (error) {
      elements.moderationList.innerHTML = `<div class="suggestions-empty">${escapeHtml(errorMessage(error))}</div>`;
      return;
    }
    suggestionState.moderation = Array.isArray(data) ? data : [];
    renderModeration();
  }

  async function moderateSuggestion(id, action, button) {
    let reason = '';
    if (action === 'reject') {
      reason = window.prompt('Почему предложение отклонено? Причина сохранится в архиве.', '') ?? '';
      if (!reason.trim()) return;
    }
    setBusy(button, true, 'Сохраняем…');
    try {
      const { error } = await suggestionState.client.rpc('moderate_game_suggestion', {
        p_suggestion_id: Number(id),
        p_action: action,
        p_reason: reason
      });
      if (error) throw error;
      showNotice('Статус предложения обновлён.', 'success');
      await Promise.all([loadModeration(), loadPublicSuggestions()]);
    } catch (error) {
      showNotice(errorMessage(error), 'error');
      setBusy(button, false);
    }
  }

  async function moderateComment(id, hidden, button) {
    setBusy(button, true, hidden ? 'Скрываем…' : 'Возвращаем…');
    try {
      const { error } = await suggestionState.client.rpc('moderate_suggestion_comment', {
        p_comment_id: Number(id),
        p_hidden: Boolean(hidden)
      });
      if (error) throw error;
      await Promise.all([loadModeration(), loadPublicSuggestions()]);
    } catch (error) {
      showNotice(errorMessage(error), 'error');
      setBusy(button, false);
    }
  }

  function bindEvents() {
    elements.triggers.forEach(trigger => trigger.addEventListener('click', () => openPanel(trigger.dataset.suggestionsView)));
    elements.close.addEventListener('click', closePanel);
    elements.panel.addEventListener('click', event => {
      if (event.target.matches('[data-suggestions-close]')) closePanel();
    });
    elements.tabs.forEach(button => button.addEventListener('click', () => setTab(button.dataset.suggestionsTab)));
    elements.previewButton.addEventListener('click', previewSteamGame);
    elements.steamUrl.addEventListener('input', clearPreview);
    elements.form.addEventListener('submit', submitSuggestion);
    elements.sort.addEventListener('change', renderPublicSuggestions);
    elements.grid.addEventListener('click', event => {
      const card = event.target.closest('[data-suggestion-id]');
      if (!card) return;
      if (event.target.closest('[data-suggestion-vote]')) toggleVote(card.dataset.suggestionId, event.target.closest('button'));
      if (event.target.closest('[data-suggestion-comments]')) openComments(card.dataset.suggestionId);
    });
    elements.commentsClose.addEventListener('click', closeComments);
    elements.commentsPanel.addEventListener('click', event => {
      if (event.target.matches('[data-suggestion-comments-close]')) closeComments();
    });
    elements.commentForm.addEventListener('submit', saveComment);
    elements.commentDelete.addEventListener('click', deleteMyComment);
    elements.moderationRefresh?.addEventListener('click', checkAdminAndLoad);
    elements.moderationFilters.forEach(button => button.addEventListener('click', () => {
      suggestionState.moderationStatus = button.dataset.suggestionStatus;
      elements.moderationFilters.forEach(item => item.classList.toggle('active', item === button));
      renderModeration();
    }));
    elements.moderationList?.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-action][data-suggestion-id]');
      if (actionButton) moderateSuggestion(actionButton.dataset.suggestionId, actionButton.dataset.action, actionButton);
      const commentButton = event.target.closest('[data-comment-id]');
      if (commentButton) moderateComment(commentButton.dataset.commentId, commentButton.dataset.commentHidden === 'true', commentButton);
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!elements.commentsPanel.hidden) closeComments();
      else if (!elements.panel.hidden) closePanel();
    });
  }

  function start() {
    if (!suggestionState.eventsBound) {
      suggestionState.eventsBound = true;
      bindEvents();
    }
    if (suggestionState.started) return;
    suggestionState.client = configuredClient();
    applyAdminAccess();
    if (!suggestionState.client) return;
    suggestionState.started = true;
    loadPublicSuggestions();
    checkAdminAndLoad();
    suggestionState.client.auth.onAuthStateChange(() => {
      window.setTimeout(() => {
        loadPublicSuggestions();
        checkAdminAndLoad();
      }, 0);
    });
  }

  window.addEventListener('cr7:supabase-ready', start, { once: true });
  start();
})();
