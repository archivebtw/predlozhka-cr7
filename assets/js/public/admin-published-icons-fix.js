(() => {
  const list = document.getElementById('suggestionModerationList');
  if (!list) return;

  const ICONS = {
    player: './assets/images/figma/player.png',
    day: './assets/images/figma/day.png',
    like: './assets/images/figma/like.png',
    dislike: './assets/images/figma/dislike.png'
  };

  const icon = (name, className) =>
    `<img class="${className}" src="${ICONS[name]}" alt="" aria-hidden="true">`;

  function decorateCard(card) {
    const facts = card.querySelector('.admin-catalog-facts');
    if (!facts || card.dataset.publishedIconsReady === '1') return;

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
        ${icon('player', 'admin-catalog-fact-icon')}
        <span>${players}</span>
      </span>
      <span class="admin-catalog-release">
        ${icon('day', 'admin-catalog-fact-icon')}
        <span>${release}</span>
      </span>
      <span class="admin-catalog-reactions">
        <span>${icon('like', 'admin-catalog-reaction-icon')}<b>${likes}</b></span>
        <span>${icon('dislike', 'admin-catalog-reaction-icon')}<b>${dislikes}</b></span>
      </span>`;

    card.dataset.publishedIconsReady = '1';
  }

  function decorateAll() {
    list.querySelectorAll('.admin-catalog-card').forEach(decorateCard);
  }

  decorateAll();
  new MutationObserver(decorateAll).observe(list, { childList: true, subtree: true });
})();
