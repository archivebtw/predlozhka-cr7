(() => {
  const channels = ['rostikfacekid','tankzor','sasavot','yurapivo','r4dom1r','iceicell','poisonika','formixyouknow','narek_cr'];
  const panel = document.getElementById('gangPanel');
  const grid = document.getElementById('gangGrid');
  const detectors = document.getElementById('gangDetectors');
  const openButton = document.getElementById('gangOpen');
  const closeButton = document.getElementById('gangClose');
  const status = document.getElementById('gangStatus');
  if (!panel || !grid || !detectors || !openButton || !closeButton || !status) return;

  let lastFocusedElement = null;
  let players = [];
  let checkTimeout = 0;

  function channelLabel(channel) {
    return channel.replace(/(^|_)(\w)/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
  }

  function avatarUrl(channel) {
    return `https://unavatar.io/twitch/${encodeURIComponent(channel)}?fallback=false`;
  }

  function renderCards() {
    grid.innerHTML = channels.map(channel => `
      <a class="gang-card is-checking" data-channel="${channel}" data-status="checking" href="https://www.twitch.tv/${channel}" rel="noopener noreferrer" target="_blank">
        <span class="gang-card-media">
          <span aria-hidden="true" class="gang-avatar-fallback">${channelLabel(channel).slice(0, 1)}</span>
          <img alt="Аватар канала ${channelLabel(channel)}" class="gang-avatar" decoding="async" loading="lazy" onerror="this.hidden=true" referrerpolicy="no-referrer" src="${avatarUrl(channel)}"/>
          <img alt="Превью трансляции ${channelLabel(channel)}" class="gang-preview" data-preview="${channel}" decoding="async" referrerpolicy="no-referrer"/>
        </span>
        <span class="gang-card-copy"><span class="gang-live">Проверяем эфир</span><h3>${channelLabel(channel)}</h3><p class="gang-stream-title">Получаем статус с Twitch…</p><small>twitch.tv/${channel}</small></span>
        <span class="gang-card-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  }

  function sortCards() {
    const rank = { live: 0, checking: 1, offline: 2 };
    [...grid.children]
      .sort((a,b) => rank[a.dataset.status] - rank[b.dataset.status] || channels.indexOf(a.dataset.channel) - channels.indexOf(b.dataset.channel))
      .forEach(card => grid.appendChild(card));
  }

  function updateSummary() {
    const cards = [...grid.children];
    const liveCount = cards.filter(card => card.dataset.status === 'live').length;
    const checkingCount = cards.filter(card => card.dataset.status === 'checking').length;
    if (checkingCount) status.textContent = `Проверяем Twitch: ${channels.length - checkingCount} из ${channels.length}`;
    else status.textContent = liveCount ? `Сейчас стримят: ${liveCount} · онлайн-каналы показаны первыми` : 'Сейчас все участники вне эфира';
  }

  function setChannelStatus(channel,newStatus) {
    const card = grid.querySelector(`[data-channel="${channel}"]`);
    if (!card) return;
    const liveLabel = card.querySelector('.gang-live');
    const streamTitle = card.querySelector('.gang-stream-title');
    const preview = card.querySelector('[data-preview]');
    card.dataset.status = newStatus;
    card.classList.toggle('is-live',newStatus === 'live');
    card.classList.toggle('is-checking',newStatus === 'checking');
    liveLabel.textContent = newStatus === 'live' ? 'Сейчас в эфире' : newStatus === 'offline' ? 'Не в эфире' : 'Проверяем эфир';
    streamTitle.textContent = newStatus === 'live' ? 'Прямой эфир — смотреть на Twitch' : newStatus === 'offline' ? 'Канал сейчас отдыхает' : 'Получаем статус с Twitch…';
    if (newStatus === 'live') preview.src = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${channel}-640x360.jpg?t=${Date.now()}`;
    else preview.removeAttribute('src');
    sortCards();
    updateSummary();
  }

  function destroyPlayers() {
    clearTimeout(checkTimeout);
    players.forEach(player => { try { player.destroy(); } catch {} });
    players = [];
    detectors.replaceChildren();
  }

  function checkLiveChannels() {
    destroyPlayers();
    channels.forEach(channel => setChannelStatus(channel,'checking'));
    if (!window.Twitch?.Player) {
      channels.forEach(channel => setChannelStatus(channel,'offline'));
      status.textContent = 'Не удалось подключиться к Twitch для проверки эфиров';
      return;
    }

    const parent = window.location.hostname || 'localhost';
    channels.forEach(channel => {
      const detector = document.createElement('div');
      detector.className = 'gang-detector';
      detector.id = `gangDetector-${channel}`;
      detectors.appendChild(detector);
      const player = new window.Twitch.Player(detector.id,{ channel, parent: [parent], width: 400, height: 300, autoplay: false, muted: true });
      player.addEventListener(window.Twitch.Player.ONLINE,() => setChannelStatus(channel,'live'));
      player.addEventListener(window.Twitch.Player.OFFLINE,() => setChannelStatus(channel,'offline'));
      players.push(player);
    });

    checkTimeout = window.setTimeout(() => {
      channels.forEach(channel => {
        const card = grid.querySelector(`[data-channel="${channel}"]`);
        if (card?.dataset.status === 'checking') setChannelStatus(channel,'offline');
      });
    },15000);
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
    destroyPlayers();
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
