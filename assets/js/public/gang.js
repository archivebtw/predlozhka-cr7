(() => {
  const streamers = [
    ['twitch','rostikfacekid'], ['twitch','tankzor'], ['twitch','sasavot'],
    ['twitch','yurapivo'], ['twitch','r4dom1r'], ['twitch','iceicell'],
    ['twitch','poisonika'], ['twitch','formixyouknow'], ['twitch','narek_cr'],
    ['kick','helin139ban'], ['twitch','timaevvv'], ['twitch','gagik'],
    ['twitch','kennethonline']
  ].map(([provider,channel],order) => ({ provider, channel, order }));
  const panel = document.getElementById('gangPanel');
  const grid = document.getElementById('gangGrid');
  const openButton = document.getElementById('gangOpen');
  const closeButton = document.getElementById('gangClose');
  const status = document.getElementById('gangStatus');
  if (!panel || !grid || !openButton || !closeButton || !status) return;

  let lastFocusedElement = null;
  let refreshTimer = 0;
  let requestController = null;

  const label = channel => channel.replace(/(^|_)(\w)/g,(_,prefix,letter) => `${prefix}${letter.toUpperCase()}`);
  const channelUrl = ({ provider,channel }) => `https://${provider === 'kick' ? 'kick.com' : 'www.twitch.tv'}/${channel}`;
  const fallbackAvatar = ({ provider,channel }) => `https://unavatar.io/${provider}/${encodeURIComponent(channel)}?fallback=false`;

  function renderCards() {
    grid.innerHTML = streamers.map(streamer => `
      <a class="gang-card is-checking" data-channel="${streamer.channel}" data-provider="${streamer.provider}" data-order="${streamer.order}" data-status="checking" href="${channelUrl(streamer)}" rel="noopener noreferrer" target="_blank">
        <span class="gang-card-media">
          <span aria-hidden="true" class="gang-avatar-fallback">${label(streamer.channel).slice(0,1)}</span>
          <img alt="Аватар канала ${label(streamer.channel)}" class="gang-avatar" decoding="async" loading="lazy" onerror="this.hidden=true" referrerpolicy="no-referrer" src="${fallbackAvatar(streamer)}"/>
          <img alt="Превью трансляции ${label(streamer.channel)}" class="gang-preview" decoding="async" referrerpolicy="no-referrer"/>
        </span>
        <span class="gang-card-copy">
          <span class="gang-card-topline"><span class="gang-live">Проверяем эфир</span><span class="gang-provider">${streamer.provider}</span></span>
          <h3>${label(streamer.channel)}</h3>
          <span class="gang-category" hidden></span>
          <p class="gang-stream-title">Получаем актуальный статус…</p>
          <small>${streamer.provider === 'kick' ? 'kick.com' : 'twitch.tv'}/${streamer.channel}</small>
        </span>
        <span class="gang-card-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  }

  function cardFor(item) {
    return grid.querySelector(`[data-provider="${item.provider}"][data-channel="${item.channel.toLowerCase()}"]`);
  }

  function sortCards() {
    const rank = { live: 0, checking: 1, offline: 2, unavailable: 3 };
    [...grid.children]
      .sort((a,b) => rank[a.dataset.status] - rank[b.dataset.status] || Number(a.dataset.order) - Number(b.dataset.order))
      .forEach(card => grid.appendChild(card));
  }

  function updateSummary(message = '') {
    if (message) { status.textContent = message; return; }
    const cards = [...grid.children];
    const liveCount = cards.filter(card => card.dataset.status === 'live').length;
    const checkingCount = cards.filter(card => card.dataset.status === 'checking').length;
    if (checkingCount) status.textContent = `Проверяем каналы: ${cards.length - checkingCount} из ${cards.length}`;
    else status.textContent = liveCount ? `Сейчас стримят: ${liveCount} · онлайн-каналы показаны первыми` : 'Сейчас все участники вне эфира';
  }

  function applyStatus(item) {
    const card = cardFor(item);
    if (!card) return;
    const live = item.live === true;
    const nextStatus = live ? 'live' : item.available === false ? 'unavailable' : 'offline';
    const avatar = card.querySelector('.gang-avatar');
    const preview = card.querySelector('.gang-preview');
    const category = card.querySelector('.gang-category');
    card.dataset.status = nextStatus;
    card.classList.toggle('is-live',live);
    card.classList.remove('is-checking');
    card.querySelector('.gang-live').textContent = live ? 'Сейчас в эфире' : nextStatus === 'unavailable' ? 'Статус недоступен' : 'Не в эфире';
    card.querySelector('.gang-stream-title').textContent = live ? (item.title || 'Прямой эфир') : nextStatus === 'unavailable' ? 'Не удалось получить данные платформы' : 'Канал сейчас отдыхает';
    category.textContent = item.category || '';
    category.hidden = !live || !item.category;
    if (item.avatarUrl) { avatar.hidden = false; avatar.src = item.avatarUrl; }
    if (live && item.thumbnailUrl) preview.src = item.thumbnailUrl.replace('{width}','640').replace('{height}','360');
    else preview.removeAttribute('src');
  }

  async function checkLiveChannels() {
    window.clearTimeout(refreshTimer);
    requestController?.abort();
    requestController = new AbortController();
    [...grid.children].forEach(card => { card.dataset.status = 'checking'; card.classList.add('is-checking'); });
    sortCards();
    updateSummary();
    try {
      const client = getConfiguredClient();
      if (!client) throw new Error('Supabase не настроен');
      const { data,error } = await client.functions.invoke('stream-status',{ body: { streamers }, signal: requestController.signal });
      if (error) throw error;
      const received = Array.isArray(data?.streamers) ? data.streamers : [];
      streamers.forEach(streamer => applyStatus(received.find(item => item.provider === streamer.provider && item.channel.toLowerCase() === streamer.channel) || { ...streamer, available: false }));
      sortCards();
      updateSummary();
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('141 GANG status:',error);
      streamers.forEach(streamer => applyStatus({ ...streamer, available: false }));
      sortCards();
      updateSummary('Не удалось обновить статусы · попробуйте открыть каталог позже');
    }
    if (panel.getAttribute('aria-hidden') === 'false') refreshTimer = window.setTimeout(checkLiveChannels,120000);
  }

  function openPanel() {
    lastFocusedElement = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('gang-open');
    requestAnimationFrame(() => { panel.classList.add('is-open'); closeButton.focus(); });
    checkLiveChannels();
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    openButton.setAttribute('aria-expanded','false');
    document.body.classList.remove('gang-open');
    window.clearTimeout(refreshTimer);
    requestController?.abort();
    window.setTimeout(() => { panel.hidden = true; lastFocusedElement?.focus(); },420);
  }

  renderCards();
  openButton.addEventListener('click',openPanel);
  closeButton.addEventListener('click',closePanel);
  panel.addEventListener('click',event => { if (event.target.matches('[data-gang-close]')) closePanel(); });
  document.addEventListener('keydown',event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') closePanel();
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button,a[href]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
