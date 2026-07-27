(() => {
  const panel = document.getElementById('auctionPanel');
  const openButton = document.getElementById('auctionOpen');
  const closeButton = document.getElementById('auctionClose');
  const list = document.getElementById('auctionList');
  const total = document.getElementById('auctionTotal');
  const count = document.getElementById('auctionCount');
  const wheel = document.getElementById('auctionWheel');
  const spinButton = document.getElementById('auctionSpin');
  const result = document.getElementById('auctionResult');
  const admin = document.getElementById('auctionAdmin');
  const adminToggle = document.getElementById('auctionAdminToggle');
  const form = document.getElementById('auctionForm');
  if (!panel || !openButton || !closeButton || !list || !total || !count || !wheel || !spinButton || !result || !admin || !adminToggle || !form) return;

  const colors = ['#e33b28','#8f170f','#f06b45','#5f0d09','#c9291c','#ff8965','#78120c','#b51f15'];
  const fallbackItems = [
    { id: 'preview-1', title: 'Пример большого лота', description: 'Демонстрационный пункт', amount: 10000 },
    { id: 'preview-2', title: 'Пример малого лота', description: 'Демонстрационный пункт', amount: 1000 }
  ];
  let items = [];
  let client = null;
  let schemaReady = true;
  let spinning = false;
  let rotation = 0;
  let lastFocusedElement = null;
  let editingId = null;

  const money = value => `${new Intl.NumberFormat('ru-RU').format(Number(value) || 0)} ₽`;
  const percent = value => `${new Intl.NumberFormat('ru-RU',{ maximumFractionDigits: 1 }).format(value)}%`;
  const getTotal = () => items.reduce((sum,item) => sum + Math.max(0,Number(item.amount) || 0),0);

  function createClient() {
    const config = window.CR7_CONFIG || {};
    if (!window.supabase?.createClient || !String(config.supabaseUrl || '').startsWith('https://')) return null;
    return window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{ auth: { persistSession: true,autoRefreshToken: true,detectSessionInUrl: false } });
  }

  function wheelGradient(totalAmount) {
    if (!totalAmount) return 'conic-gradient(#35100d 0 100%)';
    let cursor = 0;
    const stops = items.map((item,index) => {
      const start = cursor;
      cursor += Math.max(0,Number(item.amount) || 0) / totalAmount * 100;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(from -90deg,${stops.join(',')})`;
  }

  function render() {
    const totalAmount = getTotal();
    total.textContent = money(totalAmount);
    count.textContent = String(items.length);
    spinButton.disabled = !totalAmount || spinning;
    wheel.style.background = wheelGradient(totalAmount);
    if (!items.length) {
      list.innerHTML = '<div class="auction-empty"><strong>Активных лотов пока нет</strong><span>Администратор добавит их перед началом аукциона.</span></div>';
      return;
    }
    list.innerHTML = items.map((item,index) => {
      const chance = totalAmount ? Math.max(0,Number(item.amount) || 0) / totalAmount * 100 : 0;
      return `<article class="auction-item" data-auction-id="${escapeHtml(item.id)}">
        <span class="auction-color" style="--lot-color:${colors[index % colors.length]}">${String(index + 1).padStart(2,'0')}</span>
        <div class="auction-item-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || 'Без описания')}</p></div>
        <div class="auction-item-amount"><span>Собрано</span><strong>${money(item.amount)}</strong></div>
        <div class="auction-item-chance"><span>Шанс</span><strong>${percent(chance)}</strong></div>
        ${admin.hidden ? '' : '<div class="auction-item-actions"><button class="auction-edit" type="button">Изменить</button><button class="auction-delete" type="button" aria-label="Удалить лот">×</button></div>'}
      </article>`;
    }).join('');
  }

  async function loadItems() {
    client ||= createClient();
    if (!client) { schemaReady = false; items = fallbackItems; render(); return; }
    const { data,error } = await client.from('auction_items').select('id,title,description,amount,display_order').eq('active',true).order('display_order').order('created_at');
    if (error) {
      schemaReady = false;
      items = fallbackItems;
      result.textContent = 'Показываем демонстрацию · база аукциона ещё не подключена';
    } else items = data || [];
    render();
    await checkAdmin();
  }

  async function checkAdmin() {
    if (!client || !schemaReady) return;
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) return;
    const { data,error } = await client.rpc('is_site_admin');
    if (!error && data === true) { admin.hidden = false; render(); }
  }

  function pickWinner() {
    const totalAmount = getTotal();
    let target = Math.random() * totalAmount;
    let start = 0;
    for (const item of items) {
      const weight = Math.max(0,Number(item.amount) || 0);
      if (target < weight) return { item,start,weight,totalAmount };
      target -= weight;
      start += weight;
    }
    return null;
  }

  function spin() {
    if (spinning) return;
    const winner = pickWinner();
    if (!winner) return;
    spinning = true;
    spinButton.disabled = true;
    result.textContent = 'Колесо вращается…';
    const middle = (winner.start + winner.weight / 2) / winner.totalAmount * 360;
    rotation += 1800 + (360 - middle) - (rotation % 360);
    wheel.style.transform = `rotate(${rotation}deg)`;
    window.setTimeout(() => {
      spinning = false;
      spinButton.disabled = false;
      result.innerHTML = `Выпал лот: <strong>${escapeHtml(winner.item.title)}</strong>`;
    },4300);
  }

  async function addItem(event) {
    event.preventDefault();
    if (!client || admin.hidden || !schemaReady) return;
    const title = document.getElementById('auctionItemTitle').value.trim();
    const description = document.getElementById('auctionItemDescription').value.trim();
    const amount = Number(document.getElementById('auctionItemAmount').value);
    if (!title || !Number.isFinite(amount) || amount < 0) return;
    const payload = { title,description,amount,display_order: items.length };
    const query = editingId
      ? client.from('auction_items').update({ title,description,amount }).eq('id',editingId)
      : client.from('auction_items').insert(payload);
    const { error } = await query;
    if (error) { result.textContent = `Не удалось сохранить лот: ${error.message}`; return; }
    form.reset();
    editingId = null;
    adminToggle.textContent = 'Добавить лот';
    form.hidden = true;
    await loadItems();
  }

  async function deleteItem(button) {
    if (!client || admin.hidden || !schemaReady) return;
    const id = button.closest('[data-auction-id]')?.dataset.auctionId;
    if (!id) return;
    const { error } = await client.from('auction_items').delete().eq('id',id);
    if (error) { result.textContent = `Не удалось удалить лот: ${error.message}`; return; }
    await loadItems();
  }

  function editItem(button) {
    if (admin.hidden) return;
    const id = button.closest('[data-auction-id]')?.dataset.auctionId;
    const item = items.find(entry => String(entry.id) === String(id));
    if (!item) return;
    editingId = item.id;
    document.getElementById('auctionItemTitle').value = item.title || '';
    document.getElementById('auctionItemDescription').value = item.description || '';
    document.getElementById('auctionItemAmount').value = Number(item.amount) || 0;
    form.hidden = false;
    adminToggle.textContent = 'Отменить';
    form.querySelector('input')?.focus();
  }

  function openAuction() {
    lastFocusedElement = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('auction-open');
    loadItems();
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
  panel.addEventListener('click',event => {
    if (event.target.matches('[data-auction-close]')) closeAuction();
    const deleteButton = event.target.closest('.auction-delete');
    if (deleteButton) deleteItem(deleteButton);
    const editButton = event.target.closest('.auction-edit');
    if (editButton) editItem(editButton);
  });
  spinButton.addEventListener('click',spin);
  adminToggle.addEventListener('click',() => {
    const willOpen = form.hidden;
    form.hidden = !willOpen;
    if (!willOpen) { editingId = null; form.reset(); adminToggle.textContent = 'Добавить лот'; }
    else form.querySelector('input')?.focus();
  });
  form.addEventListener('submit',addItem);
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) closeAuction(); });
})();

(() => {
  const panel = document.getElementById('featurePanel');
  const buttons = [...document.querySelectorAll('.coming-soon-trigger')];
  const closeButton = document.getElementById('featureClose');
  const kicker = document.getElementById('featureKicker');
  const title = document.getElementById('featureTitle');
  const description = document.getElementById('featureDescription');
  if (!panel || !buttons.length || !closeButton || !kicker || !title || !description) return;
  let activeButton = null;
  function close() { panel.hidden = true; panel.setAttribute('aria-hidden','true'); activeButton?.setAttribute('aria-expanded','false'); activeButton?.focus(); activeButton = null; }
  buttons.forEach(button => button.addEventListener('click',() => {
    activeButton = button;
    kicker.textContent = button.dataset.comingKicker || 'Новый раздел';
    title.textContent = button.dataset.comingTitle || 'Скоро';
    description.textContent = button.dataset.comingDescription || 'Функция находится в разработке.';
    panel.hidden = false;
    panel.setAttribute('aria-hidden','false');
    button.setAttribute('aria-expanded','true');
    closeButton.focus();
  }));
  closeButton.addEventListener('click',close);
  panel.addEventListener('click',event => { if (event.target.matches('[data-feature-close]')) close(); });
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && !panel.hidden) close(); });
})();
