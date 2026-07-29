(() => {
  'use strict';

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

  const CACHE_TTL = 60000;
  let lastFocusedElement = null;
  let lastCheckedAt = 0;
  let refreshTimer = 0;
  let requestController = null;
  let currentRequest = null;
  let requestSequence = 0;
  let uptimeTimer = 0;

  const label = channel => channel.replace(/(^|_)(\w)/g,(_,prefix,letter) => `${prefix}${letter.toUpperCase()}`);
  const channelUrl = ({ provider,channel }) => `https://${provider === 'kick' ? 'kick.com' : 'www.twitch.tv'}/${channel}`;
  const fallbackAvatar = ({ provider,channel }) => `https://unavatar.io/${provider}/${encodeURIComponent(channel)}?fallback=false`;
  const imageUrl = value => {
    const url = String(value || '').trim();
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `https://kick.com${url}`;
    return /^https?:\/\//i.test(url) ? url : '';
  };

  function renderCards() {
    grid.innerHTML = streamers.map(streamer => `
      <a class="gang-card is-checking" data-channel="${streamer.channel}" data-provider="${streamer.provider}" data-order="${streamer.order}" data-status="checking" href="${channelUrl(streamer)}" rel="noopener noreferrer" target="_blank">
        <span class="gang-card-media">
          <span aria-hidden="true" class="gang-avatar-fallback">${label(streamer.channel).slice(0,1)}</span>
          <img alt="Аватар канала ${label(streamer.channel)}" class="gang-avatar" decoding="async" loading="lazy" onerror="this.hidden=true" referrerpolicy="no-referrer" src="${fallbackAvatar(streamer)}"/>
          <img alt="" aria-hidden="true" class="gang-preview" decoding="async" loading="lazy" referrerpolicy="no-referrer"/>
        </span>
        <span class="gang-card-copy">
          <span class="gang-card-topline"><span class="gang-live">Проверяем эфир</span><span class="gang-provider">${streamer.provider}</span></span>
          <h3>${label(streamer.channel)}</h3>
          <span class="gang-category" hidden></span>
          <p class="gang-stream-title">Получаем актуальный статус…</p>
          <span class="gang-uptime" hidden></span>
          <small>${streamer.provider === 'kick' ? 'kick.com' : 'twitch.tv'}/${streamer.channel}</small>
        </span>
        <span class="gang-card-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  }

  function cardFor(item) {
    return grid.querySelector(`[data-provider="${item.provider}"][data-channel="${String(item.channel).toLowerCase()}"]`);
  }

  function sortCards() {
    const rank = { live: 0, checking: 1, offline: 2, unavailable: 3 };
    [...grid.children]
      .sort((a,b) => rank[a.dataset.status] - rank[b.dataset.status] || Number(a.dataset.order) - Number(b.dataset.order))
      .forEach(card => grid.appendChild(card));
  }

  function updateSummary(message = '') {
    if (message) {
      status.textContent = message;
      return;
    }
    const cards = [...grid.children];
    const liveCount = cards.filter(card => card.dataset.status === 'live').length;
    const checkingCount = cards.filter(card => card.dataset.status === 'checking').length;
    const unavailableCount = cards.filter(card => card.dataset.status === 'unavailable').length;
    if (checkingCount) status.textContent = `Проверяем каналы: ${cards.length - checkingCount} из ${cards.length}`;
    else if (liveCount) status.textContent = `Сейчас стримят: ${liveCount} · онлайн-каналы показаны первыми`;
    else if (unavailableCount === cards.length) status.textContent = 'Статусы временно недоступны · каналы можно открыть вручную';
    else status.textContent = 'Сейчас все участники вне эфира';
  }

  function formatUptime(value) {
    const startedAt = Date.parse(value || '');
    if (!Number.isFinite(startedAt)) return '';
    const totalMinutes = Math.max(0,Math.floor((Date.now() - startedAt) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor(totalMinutes % 1440 / 60);
    const minutes = totalMinutes % 60;
    return `В эфире ${days ? `${days} д ` : ''}${hours ? `${hours} ч ` : ''}${minutes} мин`;
  }

  function updateUptimes() {
    grid.querySelectorAll('.gang-card.is-live').forEach(card => {
      const uptime = card.querySelector('.gang-uptime');
      const text = formatUptime(card.dataset.startedAt);
      uptime.textContent = text;
      uptime.hidden = !text;
    });
  }

  function applyStatus(item) {
    const card = cardFor(item);
    if (!card) return;
    const live = item.live === true;
    const nextStatus = live ? 'live' : item.available === false ? 'unavailable' : 'offline';
    const avatar = card.querySelector('.gang-avatar');
    const preview = card.querySelector('.gang-preview');
    const category = card.querySelector('.gang-category');
    const uptime = card.querySelector('.gang-uptime');
    card.dataset.status = nextStatus;
    card.dataset.startedAt = live ? (item.startedAt || '') : '';
    card.classList.toggle('is-live',live);
    card.classList.remove('has-live-preview','is-checking');
    card.querySelector('.gang-live').textContent = live ? 'Сейчас в эфире' : nextStatus === 'unavailable' ? 'Статус недоступен' : 'Не в эфире';
    card.querySelector('.gang-stream-title').textContent = live ? (item.title || 'Прямой эфир') : nextStatus === 'unavailable' ? 'Открой канал, чтобы проверить эфир' : 'Канал сейчас отдыхает';
    category.textContent = item.category || '';
    category.hidden = !live || !item.category;
    const uptimeText = live ? formatUptime(item.startedAt) : '';
    uptime.textContent = uptimeText;
    uptime.hidden = !uptimeText;
    const avatarSource = imageUrl(item.avatarUrl);
    const previewSource = imageUrl(item.thumbnailUrl).replace('{width}','640').replace('{height}','360');
    if (avatarSource) {
      avatar.hidden = false;
      avatar.src = avatarSource;
    }
    preview.onload = () => {
      preview.hidden = false;
      card.classList.add('has-live-preview');
    };
    preview.onerror = () => {
      preview.hidden = true;
      card.classList.remove('has-live-preview');
      preview.removeAttribute('src');
    };
    if (live && previewSource) {
      preview.hidden = false;
      preview.src = previewSource;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
    }
  }

  function markAllUnavailable() {
    streamers.forEach(streamer => applyStatus({ ...streamer, available: false, live: false }));
    sortCards();
    updateSummary();
  }

  async function requestStatuses() {
    const client = getConfiguredClient();
    if (!client) throw new Error('Supabase не настроен');
    const invoke = () => client.functions.invoke('stream-status',{
      body: { streamers },
      signal: requestController.signal
    });
    const result = window.CR7_AUTH?.runPublicRequest
      ? await window.CR7_AUTH.runPublicRequest(client,invoke)
      : await invoke();
    if (result.error) throw result.error;
    return Array.isArray(result.data?.streamers) ? result.data.streamers : [];
  }

  async function checkLiveChannels({ force = false } = {}) {
    window.clearTimeout(refreshTimer);
    if (!force && lastCheckedAt && Date.now() - lastCheckedAt < CACHE_TTL) {
      scheduleRefresh();
      return;
    }
    if (currentRequest) return currentRequest;

    requestController?.abort();
    requestController = new AbortController();
    const sequence = ++requestSequence;
    [...grid.children].forEach(card => {
      card.dataset.status = 'checking';
      card.classList.add('is-checking');
    });
    sortCards();
    updateSummary();

    const requestPromise = (async () => {
      try {
        const received = await requestStatuses();
        if (sequence !== requestSequence) return;
        streamers.forEach(streamer => {
          const item = received.find(candidate => candidate.provider === streamer.provider
            && String(candidate.channel).toLowerCase() === streamer.channel);
          applyStatus(item || { ...streamer, available: false, live: false });
        });
        lastCheckedAt = Date.now();
        sortCards();
        updateSummary();
      } catch (error) {
        if (error?.name === 'AbortError' || sequence !== requestSequence) return;
        console.error('141 GANG status:',error);
        markAllUnavailable();
      } finally {
        if (currentRequest === requestPromise) currentRequest = null;
        if (sequence === requestSequence && panel.getAttribute('aria-hidden') === 'false') scheduleRefresh();
      }
    })();

    currentRequest = requestPromise;
    return requestPromise;
  }

  function scheduleRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => checkLiveChannels({ force: true }),120000);
  }

  function openPanel() {
    lastFocusedElement = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('gang-open');
    requestAnimationFrame(() => {
      panel.classList.add('is-open');
      closeButton.focus();
    });
    window.clearInterval(uptimeTimer);
    uptimeTimer = window.setInterval(updateUptimes,30000);
    checkLiveChannels();
  }

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    openButton.setAttribute('aria-expanded','false');
    document.body.classList.remove('gang-open');
    window.clearTimeout(refreshTimer);
    window.clearInterval(uptimeTimer);
    requestController?.abort();
    requestSequence += 1;
    currentRequest = null;
    window.setTimeout(() => {
      panel.hidden = true;
      lastFocusedElement?.focus();
    },420);
  }

  renderCards();
  openButton.addEventListener('click',openPanel);
  closeButton.addEventListener('click',closePanel);
  panel.addEventListener('click',event => {
    if (event.target.matches('[data-gang-close]')) closePanel();
  });
  document.addEventListener('keydown',event => {
    if (panel.hidden) return;
    if (event.key === 'Escape') closePanel();
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll('button,a[href]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
