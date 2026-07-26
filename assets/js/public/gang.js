(() => {
  const channels = ['rostikfacekid','tankzor','sasavot','yurapivo','r4dom1r','iceicell','poisonika','formixyouknow','narek_cr'];
  const panel = document.getElementById('gangPanel');
  const grid = document.getElementById('gangGrid');
  const openButton = document.getElementById('gangOpen');
  const closeButton = document.getElementById('gangClose');
  const status = document.getElementById('gangStatus');
  if (!panel || !grid || !openButton || !closeButton || !status) return;

  let lastFocusedElement = null;
  let refreshTimer = 0;

  function channelLabel(channel) {
    return channel.replace(/(^|_)(\w)/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
  }

  function renderCards() {
    grid.innerHTML = channels.map(channel => `
      <a class="gang-card" data-channel="${channel}" href="https://www.twitch.tv/${channel}" rel="noopener noreferrer" target="_blank">
        <span class="gang-card-media"><img alt="" data-preview="${channel}" decoding="async"/></span>
        <span class="gang-card-copy"><span class="gang-live">Не в эфире</span><h3>${channelLabel(channel)}</h3><p class="gang-stream-title">Канал сейчас отдыхает</p><small>twitch.tv/${channel}</small></span>
        <span class="gang-card-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  }

  function refreshLiveState() {
    let checked = 0;
    let liveCount = 0;
    const stamp = Date.now();
    status.textContent = 'Проверяем, кто сейчас в эфире…';

    grid.querySelectorAll('[data-preview]').forEach(image => {
      const card = image.closest('.gang-card');
      const liveLabel = card.querySelector('.gang-live');
      const streamTitle = card.querySelector('.gang-stream-title');
      const finish = isLive => {
        checked += 1;
        card.classList.toggle('is-live', isLive);
        liveLabel.textContent = isLive ? 'Сейчас в эфире' : 'Не в эфире';
        streamTitle.textContent = isLive ? 'Прямой эфир — смотреть на Twitch' : 'Канал сейчас отдыхает';
        if (isLive) liveCount += 1;
        if (checked === channels.length) status.textContent = liveCount ? `Сейчас стримят: ${liveCount}` : 'Сейчас все участники вне эфира';
      };
      image.onload = () => finish(image.naturalWidth > 1 && image.naturalHeight > 1);
      image.onerror = () => finish(false);
      image.src = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${image.dataset.preview}-640x360.jpg?t=${stamp}`;
    });
  }

  function openPanel() {
    lastFocusedElement = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('gang-open');
    requestAnimationFrame(() => { panel.classList.add('is-open'); closeButton.focus(); });
    refreshLiveState();
    clearInterval(refreshTimer);
    refreshTimer = window.setInterval(refreshLiveState,120000);
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    openButton.setAttribute('aria-expanded','false');
    document.body.classList.remove('gang-open');
    clearInterval(refreshTimer);
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
