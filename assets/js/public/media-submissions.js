(() => {
  const elements = {
    panel: document.getElementById('mediaPanel'),
    close: document.getElementById('mediaClose'),
    triggers: [...document.querySelectorAll('.media-trigger')],
    adminOnly: [...document.querySelectorAll('[data-media-admin-only]')],
    locked: document.getElementById('mediaLocked'),
    workspace: document.getElementById('mediaWorkspace'),
    loginButton: document.getElementById('mediaLoginButton'),
    tabs: [...document.querySelectorAll('[data-media-tab]')],
    views: [...document.querySelectorAll('[data-media-view]')],
    notice: document.getElementById('mediaNotice'),
    form: document.getElementById('mediaForm'),
    dropzone: document.getElementById('mediaDropzone'),
    fileInput: document.getElementById('mediaFileInput'),
    selected: document.getElementById('mediaSelected'),
    title: document.getElementById('mediaSubmissionTitle'),
    comment: document.getElementById('mediaSubmissionComment'),
    submitButton: document.getElementById('mediaSubmitButton'),
    submitHint: document.getElementById('mediaSubmitHint'),
    statusFilter: document.getElementById('mediaStatusFilter'),
    refreshButton: document.getElementById('mediaRefreshButton'),
    queue: document.getElementById('mediaQueue'),
    pendingCount: document.getElementById('mediaPendingCount')
  };

  if (!elements.panel) return;

  const BUCKET = 'stream-submissions';
  const MAX_FILES = 8;
  const MAX_FILE_SIZE = 100 * 1024 * 1024;
  const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]);
  const ALLOWED_EXTENSIONS = /\.(?:jpe?g|png|webp|gif|mp4|webm|mov)$/i;

  const mediaState = {
    client: null,
    isAdmin: false,
    selectedFiles: [],
    currentTab: 'upload',
    queue: [],
    noticeTimer: null,
    lastFocused: null,
    started: false,
    eventsBound: false
  };

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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  function errorMessage(error, fallback = 'Не удалось выполнить действие.') {
    const message = String(error?.message || error?.error_description || fallback);
    if (/media_submissions|media_submission_files|schema cache|PGRST205|42P01/i.test(message)) {
      return 'Медиапредложка ещё не подключена. Выполни supabase/media_submissions.sql в Supabase.';
    }
    if (/bucket.*not found|stream-submissions/i.test(message)) {
      return 'Хранилище файлов ещё не настроено. Выполни supabase/media_submissions.sql.';
    }
    if (/row-level security|permission denied|только администратор|site_admin/i.test(message)) {
      return 'Это действие доступно только администратору.';
    }
    if (/payload too large|maximum allowed size|exceeded.*size/i.test(message)) {
      return 'Файл превышает разрешённый размер хранилища.';
    }
    return message;
  }

  function showNotice(message, type = 'info') {
    clearTimeout(mediaState.noticeTimer);
    elements.notice.textContent = message;
    elements.notice.className = `media-notice show ${type}`;
    mediaState.noticeTimer = window.setTimeout(() => {
      elements.notice.className = 'media-notice';
    }, 5500);
  }

  function setBusy(button, busy, busyText = 'Подождите…') {
    if (!button) return;
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.defaultText;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} КБ`;
    return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} МБ`;
  }

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return '—';
    }
  }

  function statusLabel(status) {
    return ({
      pending: 'На рассмотрении',
      approved: 'Принято',
      rejected: 'Отклонено'
    })[status] || 'Неизвестно';
  }

  function isVideo(fileOrMime) {
    const mime = typeof fileOrMime === 'string'
      ? fileOrMime
      : fileOrMime?.type || fileOrMime?.mime_type;
    const name = typeof fileOrMime === 'string'
      ? ''
      : fileOrMime?.name || fileOrMime?.file_name;
    return String(mime || '').startsWith('video/') || /\.(?:mp4|webm|mov)$/i.test(String(name || ''));
  }

  function isAllowedFile(file) {
    return ALLOWED_MIME_TYPES.has(file.type) || (!file.type && ALLOWED_EXTENSIONS.test(file.name));
  }

  function uniqueId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function safeFileName(value) {
    const normalized = String(value || 'file')
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(-100);
    return normalized || 'file';
  }

  function applyAdminAccess() {
    elements.locked.hidden = mediaState.isAdmin;
    elements.workspace.hidden = !mediaState.isAdmin;
    elements.adminOnly.forEach(element => {
      element.hidden = !mediaState.isAdmin;
      element.setAttribute('aria-hidden', mediaState.isAdmin ? 'false' : 'true');
    });
    if (mediaState.isAdmin) updateSelectedFiles();
  }

  async function checkAdmin() {
    mediaState.isAdmin = false;
    if (!mediaState.client) {
      applyAdminAccess();
      return;
    }
    try {
      const { data: sessionData, error: sessionError } = await mediaState.client.auth.getSession();
      if (sessionError) throw sessionError;
      const user = sessionData?.session?.user;
      if (!user || user.is_anonymous) {
        applyAdminAccess();
        return;
      }
      const { data, error } = await mediaState.client.rpc('is_site_admin');
      if (error) throw error;
      mediaState.isAdmin = data === true;
    } catch (error) {
      console.error('Не удалось проверить доступ к медиапредложке:', error);
    }
    applyAdminAccess();
    if (mediaState.isAdmin && mediaState.currentTab === 'queue') loadQueue();
  }

  async function requireAdmin() {
    if (!mediaState.client) throw new Error('Supabase не настроен.');
    if (!mediaState.isAdmin) throw new Error('Это действие доступно только администратору.');
    const { data, error } = await mediaState.client.auth.getSession();
    if (error) throw error;
    const user = data?.session?.user;
    if (!user || user.is_anonymous) throw new Error('Войди в аккаунт администратора.');
    return user;
  }

  function setTab(name) {
    const target = name === 'queue' ? 'queue' : 'upload';
    mediaState.currentTab = target;
    elements.tabs.forEach(button => button.classList.toggle('active', button.dataset.mediaTab === target));
    elements.views.forEach(view => {
      const active = view.dataset.mediaView === target;
      view.classList.toggle('active', active);
      view.hidden = !active;
    });
    if (target === 'queue' && mediaState.isAdmin) loadQueue();
  }

  function openPanel() {
    mediaState.lastFocused = document.activeElement;
    elements.panel.hidden = false;
    elements.panel.setAttribute('aria-hidden', 'false');
    elements.triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
    document.documentElement.classList.add('media-open');
    window.setTimeout(() => (mediaState.isAdmin ? elements.dropzone : elements.loginButton)?.focus(), 30);
  }

  function closePanel() {
    elements.panel.hidden = true;
    elements.panel.setAttribute('aria-hidden', 'true');
    elements.triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
    document.documentElement.classList.remove('media-open');
    mediaState.lastFocused?.focus?.();
  }

  function addFiles(fileList) {
    if (!mediaState.isAdmin) {
      showNotice('Загружать материалы может только администратор.', 'error');
      return;
    }
    const incoming = [...(fileList || [])];
    const existingKeys = new Set(mediaState.selectedFiles.map(item => item.key));
    const errors = [];

    incoming.forEach(file => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(key)) return;
      if (mediaState.selectedFiles.length >= MAX_FILES) {
        errors.push(`За одну отправку можно выбрать не более ${MAX_FILES} файлов.`);
        return;
      }
      if (!isAllowedFile(file)) {
        errors.push(`Формат «${file.name}» не поддерживается.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`«${file.name}» больше 100 МБ.`);
        return;
      }
      mediaState.selectedFiles.push({
        id: uniqueId(),
        key,
        file,
        previewUrl: URL.createObjectURL(file)
      });
      existingKeys.add(key);
    });

    elements.fileInput.value = '';
    updateSelectedFiles();
    if (errors.length) showNotice([...new Set(errors)].join(' '), 'error');
  }

  function removeFile(id) {
    const index = mediaState.selectedFiles.findIndex(item => item.id === id);
    if (index < 0) return;
    URL.revokeObjectURL(mediaState.selectedFiles[index].previewUrl);
    mediaState.selectedFiles.splice(index, 1);
    updateSelectedFiles();
  }

  function clearFiles() {
    mediaState.selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
    mediaState.selectedFiles = [];
    elements.fileInput.value = '';
    updateSelectedFiles();
  }

  function updateSelectedFiles() {
    const count = mediaState.selectedFiles.length;
    elements.selected.hidden = count === 0;
    elements.submitButton.disabled = !mediaState.isAdmin || count === 0;
    elements.submitHint.textContent = count
      ? `${count} ${count === 1 ? 'файл готов' : count < 5 ? 'файла готовы' : 'файлов готовы'} к отправке.`
      : 'Сначала выбери хотя бы один файл.';

    elements.selected.innerHTML = mediaState.selectedFiles.map(item => {
      const file = item.file;
      const preview = isVideo(file)
        ? `<video muted playsinline preload="metadata" src="${escapeHtml(item.previewUrl)}"></video>`
        : `<img alt="" src="${escapeHtml(item.previewUrl)}">`;
      return `
        <article class="media-selected-item">
          <div class="media-selected-preview">${preview}</div>
          <div class="media-selected-copy"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${escapeHtml(formatBytes(file.size))}</small></div>
          <button aria-label="Убрать ${escapeHtml(file.name)}" class="media-selected-remove" data-media-remove="${escapeHtml(item.id)}" type="button">×</button>
        </article>
      `;
    }).join('');
  }

  async function rollbackSubmission(submissionId, uploadedPaths) {
    if (uploadedPaths.length) {
      const { error } = await mediaState.client.storage.from(BUCKET).remove(uploadedPaths);
      if (error) console.warn('Не удалось удалить незавершённые загрузки:', error);
    }
    if (submissionId) {
      const { error } = await mediaState.client.from('media_submissions').delete().eq('id', submissionId);
      if (error) console.warn('Не удалось удалить незавершённую отправку:', error);
    }
  }

  async function submitFiles(event) {
    event.preventDefault();
    if (!mediaState.selectedFiles.length) {
      showNotice('Сначала выбери хотя бы один файл.', 'error');
      return;
    }

    let submissionId = null;
    const uploadedPaths = [];
    setBusy(elements.submitButton, true, 'Подготавливаем…');

    try {
      const user = await requireAdmin();
      const { data: submission, error: submissionError } = await mediaState.client
        .from('media_submissions')
        .insert({
          title: elements.title.value.trim(),
          comment: elements.comment.value.trim(),
          created_by: user.id
        })
        .select('id')
        .single();
      if (submissionError) throw submissionError;
      submissionId = submission.id;

      const fileRows = [];
      for (let index = 0; index < mediaState.selectedFiles.length; index += 1) {
        const selected = mediaState.selectedFiles[index];
        const file = selected.file;
        const path = `${user.id}/${submissionId}/${uniqueId()}-${safeFileName(file.name)}`;
        setBusy(elements.submitButton, true, `Загружаем ${index + 1} из ${mediaState.selectedFiles.length}…`);
        const { error: uploadError } = await mediaState.client.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: '3600',
            contentType: file.type || undefined,
            upsert: false
          });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        fileRows.push({
          submission_id: submissionId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          sort_order: index,
          created_by: user.id
        });
      }

      const { error: filesError } = await mediaState.client.from('media_submission_files').insert(fileRows);
      if (filesError) throw filesError;

      elements.form.reset();
      clearFiles();
      showNotice('Материалы загружены и добавлены в очередь.', 'success');
      setTab('queue');
    } catch (error) {
      console.error(error);
      await rollbackSubmission(submissionId, uploadedPaths);
      showNotice(errorMessage(error, 'Не удалось загрузить материалы.'), 'error');
    } finally {
      setBusy(elements.submitButton, false);
      updateSelectedFiles();
    }
  }

  async function addSignedUrls(submissions) {
    const allFiles = submissions.flatMap(item => Array.isArray(item.media_submission_files) ? item.media_submission_files : []);
    await Promise.all(allFiles.map(async file => {
      const { data, error } = await mediaState.client.storage.from(BUCKET).createSignedUrl(file.storage_path, 3600);
      file.signed_url = error ? '' : data?.signedUrl || '';
    }));
    return submissions;
  }

  function renderQueue() {
    const status = elements.statusFilter.value;
    const items = mediaState.queue.filter(item => item.status === status);
    elements.pendingCount.textContent = String(mediaState.queue.filter(item => item.status === 'pending').length);

    if (!items.length) {
      elements.queue.innerHTML = `<div class="media-empty">В разделе «${escapeHtml(statusLabel(status))}» пока ничего нет.</div>`;
      return;
    }

    elements.queue.innerHTML = items.map(item => {
      const files = [...(item.media_submission_files || [])].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
      const gallery = files.map(file => {
        if (!file.signed_url) {
          return `<div class="media-card-file"><div class="media-empty">Файл недоступен</div></div>`;
        }
        const preview = isVideo(file)
          ? `<video controls playsinline preload="metadata" src="${escapeHtml(file.signed_url)}"></video>`
          : `<img alt="${escapeHtml(file.file_name)}" loading="lazy" src="${escapeHtml(file.signed_url)}">`;
        return `<div class="media-card-file">${preview}<a download="${escapeHtml(file.file_name)}" href="${escapeHtml(file.signed_url)}" rel="noopener" target="_blank">Открыть ↗</a></div>`;
      }).join('');
      const fallbackTitle = files.length === 1 ? files[0].file_name : `Подборка из ${files.length} файлов`;
      const actions = item.status === 'pending'
        ? `<div class="media-card-actions"><button class="approve" data-media-action="approved" data-media-id="${escapeHtml(item.id)}" type="button">Принять</button><button class="reject" data-media-action="rejected" data-media-id="${escapeHtml(item.id)}" type="button">Отклонить</button></div>`
        : '';
      return `
        <article class="media-card">
          <div class="media-card-gallery${files.length === 1 ? ' is-single' : ''}">${gallery || '<div class="media-empty">Вложения не найдены</div>'}</div>
          <div class="media-card-body">
            <span class="media-card-status ${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
            <h4>${escapeHtml(item.title || fallbackTitle)}</h4>
            ${item.comment ? `<p class="media-card-comment">${escapeHtml(item.comment)}</p>` : '<p class="media-card-comment">Без комментария.</p>'}
            <div class="media-card-meta"><span>${files.length} ${files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов'}</span><span>${escapeHtml(formatDate(item.created_at))}</span></div>
            ${actions}
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadQueue() {
    if (!mediaState.isAdmin || !mediaState.client) return;
    elements.queue.innerHTML = '<div class="media-empty">Загружаем очередь…</div>';
    setBusy(elements.refreshButton, true, '…');
    try {
      await requireAdmin();
      const { data, error } = await mediaState.client
        .from('media_submissions')
        .select('id,title,comment,status,created_at,moderated_at,media_submission_files(id,storage_path,file_name,mime_type,file_size,sort_order)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      mediaState.queue = await addSignedUrls(Array.isArray(data) ? data : []);
      renderQueue();
    } catch (error) {
      console.error(error);
      elements.queue.innerHTML = `<div class="media-empty">${escapeHtml(errorMessage(error, 'Не удалось загрузить очередь.'))}</div>`;
    } finally {
      setBusy(elements.refreshButton, false);
    }
  }

  async function moderateSubmission(id, status, button) {
    if (!['approved', 'rejected'].includes(status)) return;
    const card = button.closest('.media-card');
    const buttons = [...(card?.querySelectorAll('.media-card-actions button') || [])];
    buttons.forEach(item => { item.disabled = true; });
    try {
      const user = await requireAdmin();
      const { error } = await mediaState.client
        .from('media_submissions')
        .update({
          status,
          moderated_at: new Date().toISOString(),
          moderated_by: user.id
        })
        .eq('id', id);
      if (error) throw error;
      showNotice(status === 'approved' ? 'Отправка принята.' : 'Отправка отклонена.', 'success');
      await loadQueue();
    } catch (error) {
      console.error(error);
      showNotice(errorMessage(error), 'error');
      buttons.forEach(item => { item.disabled = false; });
    }
  }

  function bindEvents() {
    elements.triggers.forEach(trigger => trigger.addEventListener('click', openPanel));
    elements.close.addEventListener('click', closePanel);
    elements.panel.addEventListener('click', event => {
      if (event.target.matches('[data-media-close]')) closePanel();
    });
    elements.loginButton.addEventListener('click', () => {
      closePanel();
      document.getElementById('adminPortalOpen')?.click();
    });
    elements.tabs.forEach(button => button.addEventListener('click', () => setTab(button.dataset.mediaTab)));
    elements.fileInput.addEventListener('change', () => addFiles(elements.fileInput.files));
    elements.dropzone.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      elements.fileInput.click();
    });
    elements.selected.addEventListener('click', event => {
      const button = event.target.closest('[data-media-remove]');
      if (button) removeFile(button.dataset.mediaRemove);
    });
    ['dragenter', 'dragover'].forEach(name => elements.dropzone.addEventListener(name, event => {
      event.preventDefault();
      elements.dropzone.classList.add('is-dragging');
    }));
    ['dragleave', 'drop'].forEach(name => elements.dropzone.addEventListener(name, event => {
      event.preventDefault();
      elements.dropzone.classList.remove('is-dragging');
    }));
    elements.dropzone.addEventListener('drop', event => addFiles(event.dataTransfer?.files));
    elements.form.addEventListener('submit', submitFiles);
    elements.statusFilter.addEventListener('change', renderQueue);
    elements.refreshButton.addEventListener('click', loadQueue);
    elements.queue.addEventListener('click', event => {
      const button = event.target.closest('[data-media-action][data-media-id]');
      if (button) moderateSubmission(button.dataset.mediaId, button.dataset.mediaAction, button);
    });
    document.addEventListener('keydown', event => {
      if (elements.panel.hidden) return;
      if (event.key === 'Escape') {
        closePanel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...elements.panel.querySelectorAll('button:not([hidden]):not(:disabled),a[href],input:not([type="hidden"]):not(:disabled),textarea:not(:disabled),select:not(:disabled)')]
        .filter(element => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
  }

  function start() {
    if (!mediaState.eventsBound) {
      mediaState.eventsBound = true;
      bindEvents();
    }
    if (mediaState.started) return;
    mediaState.client = configuredClient();
    mediaState.started = true;
    applyAdminAccess();
    if (!mediaState.client) return;
    checkAdmin();
    mediaState.client.auth.onAuthStateChange(() => {
      window.setTimeout(checkAdmin, 0);
    });
  }

  window.addEventListener('cr7:supabase-ready', start, { once: true });
  start();
})();
