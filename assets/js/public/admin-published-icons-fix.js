(() => {
  const list = document.getElementById('suggestionModerationList');
  if (!list) return;

  const ICONS = {
    player: `
      <svg class="admin-catalog-fact-icon admin-catalog-player-icon" viewBox="0 0 22 25" fill="none" aria-hidden="true">
        <circle cx="11" cy="6" r="4" stroke="currentColor" stroke-width="3"/>
        <path d="M3 23c.35-5.1 3.55-8 8-8s7.65 2.9 8 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    day: `
      <svg class="admin-catalog-fact-icon admin-catalog-day-icon" viewBox="0 0 22 24" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="18" height="18" rx="3" stroke="currentColor" stroke-width="3"/>
        <path d="M6 2v4M16 2v4M2 9h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>`,
    like: `
      <svg class="admin-catalog-reaction-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M9.5 11.5 13.1 3.4c.55-1.25 2.43-.95 2.56.41l.34 3.5a2 2 0 0 0 1.99 1.81h3.88c1.82 0 3.16 1.69 2.75 3.46l-2.07 8.92A3.5 3.5 0 0 1 19.14 24H9.5V11.5Z" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>
        <rect x="2.5" y="10.5" width="7" height="14" rx="2" stroke="currentColor" stroke-width="2.8"/>
      </svg>`,
    dislike: `
      <svg class="admin-catalog-reaction-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <g transform="translate(0 28) scale(1 -1)">
          <path d="M9.5 11.5 13.1 3.4c.55-1.25 2.43-.95 2.56.41l.34 3.5a2 2 0 0 0 1.99 1.81h3.88c1.82 0 3.16 1.69 2.75 3.46l-2.07 8.92A3.5 3.5 0 0 1 19.14 24H9.5V11.5Z" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/>
          <rect x="2.5" y="10.5" width="7" height="14" rx="2" stroke="currentColor" stroke-width="2.8"/>
        </g>
      </svg>`
  };

  function decorateCard(card) {
    const facts = card.querySelector('.admin-catalog-facts');
    if (!facts || card.dataset.publishedIconsReady === '2') return;

    const playersNode = facts.querySelector('.admin-catalog-players');
    const releaseNode = facts.querySelector('.admin-catalog-release');
    const reactionsNode = facts.querySelector('.admin-catalog-reactions');

    const players = playersNode?.textContent.trim() || '1 игрок';
    const release = releaseNode?.textContent.trim() || 'Без даты';
    const counts = reactionsNode?.textContent.match(/\d+/g) || ['0', '0'];
    const likes = counts[0] || '0';
    const dislikes = counts[1] || '0';

    facts.innerHTML = `
      <span class="admin-catalog-players">
        ${ICONS.player}
        <span>${players}</span>
      </span>
      <span class="admin-catalog-release">
        ${ICONS.day}
        <span>${release}</span>
      </span>
      <span class="admin-catalog-reactions">
        <span>${ICONS.like}<b>${likes}</b></span>
        <span>${ICONS.dislike}<b>${dislikes}</b></span>
      </span>`;

    card.dataset.publishedIconsReady = '2';
  }

  function decorateAll() {
    list.querySelectorAll('.admin-catalog-card').forEach(decorateCard);
  }

  decorateAll();
  new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
})();
