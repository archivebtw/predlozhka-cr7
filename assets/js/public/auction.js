(() => {
  const panel = document.getElementById('auctionPanel');
  const openButton = document.getElementById('auctionOpen');
  const closeButton = document.getElementById('auctionClose');
  if (!panel || !openButton || !closeButton) return;

  let lastFocusedElement = null;

  function openAuction() {
    lastFocusedElement = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('auction-open');
    requestAnimationFrame(() => { panel.classList.add('is-open'); closeButton.focus(); });
  }

  function closeAuction() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    openButton.setAttribute('aria-expanded','false');
    document.body.classList.remove('auction-open');
    window.setTimeout(() => { panel.hidden = true; lastFocusedElement?.focus(); },550);
  }

  openButton.addEventListener('click',openAuction);
  closeButton.addEventListener('click',closeAuction);
  panel.addEventListener('click',event => { if (event.target.matches('[data-auction-close]')) closeAuction(); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) closeAuction(); });
})();
