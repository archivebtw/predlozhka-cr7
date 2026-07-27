(() => {
  const panel = document.getElementById('auctionPanel');
  const dialog = panel?.querySelector('.auction-dialog');
  const openButtons = [...document.querySelectorAll('#auctionOpen, .coming-soon-trigger')];
  const closeButton = document.getElementById('auctionClose');
  const kicker = document.getElementById('auctionKicker');
  const description = document.getElementById('auctionDescription');
  const workspace = document.getElementById('auctionWorkspace');
  const coming = document.getElementById('auctionComing');
  const list = document.getElementById('auctionList');
  const total = document.getElementById('auctionTotal');
  if (!panel || !dialog || !openButtons.length || !closeButton || !kicker || !description || !workspace || !coming || !list || !total) return;

  // Временная ручная конфигурация. Чтобы добавить или убрать вариант, измени этот
  // массив. amount — накопленная сумма в рублях; шанс рассчитывается автоматически.
  const AUCTION_ITEMS = [
    { id: 'option-1', title: 'Пункт аукциона 01', description: 'Описание будущего пункта аукциона.', amount: 10000 },
    { id: 'option-2', title: 'Пункт аукциона 02', description: 'Описание будущего пункта аукциона.', amount: 1000 }
  ];

  let lastFocusedElement = null;
  let activeButton = null;

  const formatMoney = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
  const formatChance = value => new Intl.NumberFormat('ru-RU',{ maximumFractionDigits: 1 }).format(value) + '%';

  function renderAuction() {
    const items = AUCTION_ITEMS.filter(item => item && Number(item.amount) >= 0);
    const totalAmount = items.reduce((sum,item) => sum + Number(item.amount),0);
    total.textContent = formatMoney(totalAmount);
    if (!items.length) {
      list.innerHTML = '<div class="auction-empty"><strong>Пока нет вариантов</strong><span>Добавь первый пункт в AUCTION_ITEMS.</span></div>';
      return;
    }
    list.innerHTML = items.map((item,index) => {
      const chance = totalAmount > 0 ? Number(item.amount) / totalAmount * 100 : 0;
      return `<article class="auction-item">
        <span class="auction-item-index">${String(index + 1).padStart(2,'0')}</span>
        <div class="auction-item-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || '')}</p><div class="auction-progress"><i style="--chance:${chance}%"></i></div></div>
        <div class="auction-item-amount"><span>В банке</span><strong>${formatMoney(Number(item.amount))}</strong></div>
        <div class="auction-item-chance"><span>Шанс</span><strong>${formatChance(chance)}</strong></div>
      </article>`;
    }).join('');
  }

  function openAuction(button) {
    activeButton = button;
    lastFocusedElement = document.activeElement;
    const isAuction = button.id === 'auctionOpen';
    dialog.setAttribute('aria-labelledby',isAuction ? 'auctionTitle' : 'auctionComingTitle');
    workspace.hidden = !isAuction;
    coming.hidden = isAuction;
    if (isAuction) renderAuction();
    else {
      kicker.textContent = button.dataset.comingKicker || 'Новый раздел';
      description.textContent = button.dataset.comingDescription || 'Новый раздел уже готовится.';
    }
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
