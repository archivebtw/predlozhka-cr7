(() => {
  const panel = document.getElementById('auctionPanel');
  const openButtons = [...document.querySelectorAll('#auctionOpen, .coming-soon-trigger')];
  const closeButton = document.getElementById('auctionClose');
  const kicker = document.getElementById('auctionKicker');
  const title = document.getElementById('auctionTitle');
  const description = document.getElementById('auctionDescription');
  if (!panel || !openButtons.length || !closeButton || !kicker || !title || !description) return;

  let lastFocusedElement = null;
  let activeButton = null;

  function openAuction(button) {
    activeButton = button;
    lastFocusedElement = document.activeElement;
    kicker.textContent = button.dataset.comingKicker || 'Новый раздел';
    title.textContent = button.dataset.comingTitle || 'СКОРО';
    const ellipsis = document.createElement('span');
    ellipsis.textContent = '...';
    title.append(ellipsis);
    description.textContent = button.dataset.comingDescription || 'Аукцион 141 уже готовится.';
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    activeButton.setAttribute('aria-expanded','true');
    document.body.classList.add('auction-open');
    requestAnimationFrame(() => { panel.classList.add('is-open'); closeButton.focus(); });
  }

  function closeAuction() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    activeButton?.setAttribute('aria-expanded','false');
    document.body.classList.remove('auction-open');
    window.setTimeout(() => {
      panel.hidden = true;
      lastFocusedElement?.focus();
      activeButton = null;
    },550);
  }

  openButtons.forEach(button => button.addEventListener('click',() => openAuction(button)));
  closeButton.addEventListener('click',closeAuction);
  panel.addEventListener('click',event => { if (event.target.matches('[data-auction-close]')) closeAuction(); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) closeAuction(); });
})();
