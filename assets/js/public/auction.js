(() => {
  const byId = id => document.getElementById(id);
  const panel = byId('auctionPanel');
  const openButton = byId('auctionOpen');
  const closeButton = byId('auctionClose');
  const list = byId('auctionList');
  const manageList = byId('auctionManageList');
  const total = byId('auctionTotal');
  const count = byId('auctionCount');
  const wheel = byId('auctionWheel');
  const spinButton = byId('auctionSpin');
  const result = byId('auctionResult');
  const manageTab = byId('auctionManageTab');
  const form = byId('auctionForm');
  const timerDisplay = byId('auctionTimer');
  if (!panel || !openButton || !closeButton || !list || !manageList || !wheel || !form || !timerDisplay) return;

  const colors = ['#e33b28','#8f170f','#f06b45','#5f0d09','#c9291c','#ff8965','#78120c','#b51f15'];
  const fallbackItems = [
    { id: 'preview-1',title: 'Пример большого лота',description: 'Демонстрационный участник',amount: 10000,eliminated: false },
    { id: 'preview-2',title: 'Пример малого лота',description: 'Демонстрационный участник',amount: 1000,eliminated: false }
  ];
  let items = [],client = null,isAdmin = false,schemaReady = true,spinning = false,rotation = 0,editingId = null,lastFocusedElement = null;
  let timer = { remaining: 0,running: false,endsAt: null };

  const money = value => `${new Intl.NumberFormat('ru-RU').format(Number(value) || 0)} ₽`;
  const percent = value => `${new Intl.NumberFormat('ru-RU',{ maximumFractionDigits: 1 }).format(value)}%`;
  const activeItems = () => items.filter(item => !item.eliminated && Number(item.amount) > 0);
  const auctionMode = () => document.querySelector('[name="auctionMode"]:checked')?.value || 'winner';
  const selectionEntries = () => {
    const active=activeItems(),total=active.reduce((sum,item)=>sum+Number(item.amount),0);
    return active.map(item=>({ item,weight:auctionMode()==='elimination' ? Math.max(0,total-Number(item.amount)) : Number(item.amount) }));
  };
  const selectionTotal = () => selectionEntries().reduce((sum,entry)=>sum+entry.weight,0);

  function createClient() {
    const config = window.CR7_CONFIG || {};
    if (!window.supabase?.createClient || !String(config.supabaseUrl || '').startsWith('https://')) return null;
    return window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{ auth:{ persistSession:true,autoRefreshToken:true,detectSessionInUrl:false } });
  }

  function wheelGradient(highlightId = '') {
    const entries=selectionEntries(),sum=selectionTotal();
    if (!sum) return 'conic-gradient(#35100d 0 100%)';
    let cursor = 0;
    return `conic-gradient(from -90deg,${entries.map(({item,weight},index) => {
      const start = cursor; cursor += weight / sum * 100;
      const color = highlightId && String(item.id) !== String(highlightId) ? '#3b3332' : colors[items.indexOf(item) % colors.length];
      return `${color} ${start}% ${cursor}%`;
    }).join(',')})`;
  }

  function render() {
    const active=activeItems(),bank=active.reduce((sum,item)=>sum+Number(item.amount),0),selectionSum=selectionTotal(),hideEliminated=byId('auctionHideEliminated').checked;
    total.textContent = money(bank); count.textContent = String(active.length);
    spinButton.disabled = !isAdmin || !selectionSum || spinning;
    wheel.style.background = wheelGradient();
    const visible = items.filter(item => !hideEliminated || !item.eliminated);
    list.innerHTML = visible.length ? visible.map((item,index) => {
      const entry=selectionEntries().find(candidate=>candidate.item===item),chance=entry&&selectionSum ? entry.weight/selectionSum*100 : 0;
      return `<article class="auction-item${item.eliminated ? ' is-eliminated' : ''}" data-auction-id="${escapeHtml(item.id)}">
        <span class="auction-color" style="--lot-color:${colors[index % colors.length]}">${String(index + 1).padStart(2,'0')}</span>
        <div class="auction-item-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || 'Без описания')}</p></div>
        <div class="auction-item-amount"><span>Собрано</span><strong>${money(item.amount)}</strong></div>
        <div class="auction-item-chance"><span>${item.eliminated ? 'Статус' : auctionMode()==='elimination' ? 'Шанс вылета' : 'Шанс победы'}</span><strong>${item.eliminated ? 'Выбыл' : percent(chance)}</strong></div>
      </article>`;
    }).join('') : '<div class="auction-empty"><strong>Участников пока нет</strong><span>Администратор добавит лоты перед аукционом.</span></div>';
    manageList.innerHTML = items.map(item => `<article class="auction-manage-item" data-auction-id="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.title)}</strong><span>${money(item.amount)} · ${item.eliminated ? 'выбыл' : 'участвует'}</span></div><button class="auction-eliminate" type="button">${item.eliminated ? 'Вернуть' : 'Исключить'}</button><button class="auction-edit" type="button">Изменить</button><button class="auction-delete" type="button">Удалить</button></article>`).join('');
  }

  async function loadItems() {
    client ||= createClient();
    if (!client) { schemaReady=false;items=fallbackItems;render();return; }
    const { data,error } = await client.from('auction_items').select('id,title,description,amount,display_order,eliminated').eq('active',true).order('display_order').order('created_at');
    if (error) { schemaReady=false;items=fallbackItems;result.textContent='Демонстрация · примените миграцию аукциона'; }
    else { schemaReady=true;items=data || []; }
    await checkAdmin(); render();
  }

  async function checkAdmin() {
    if (!client) return;
    const { data:sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user) return;
    const { data,error } = await client.rpc('is_site_admin');
    isAdmin = !error && data === true;
    manageTab.hidden = !isAdmin;
    byId('auctionSettingsToggle').disabled = !isAdmin;
    byId('auctionSpinDuration').disabled = !isAdmin;
    byId('auctionRandomDuration').disabled = !isAdmin;
    document.querySelectorAll('[name="auctionMode"]').forEach(input=>{input.disabled=!isAdmin;});
    byId('auctionSetupNotice').hidden = schemaReady || !isAdmin;
  }

  function pickWinner() {
    const entries=selectionEntries(),sum=selectionTotal(); let target=Math.random()*sum,start=0;
    for (const {item,weight} of entries) { if (target < weight) return { item,start,weight,sum }; target-=weight;start+=weight; }
    return null;
  }

  async function spin() {
    if (spinning || !isAdmin) return;
    const winner=pickWinner(); if (!winner) return;
    spinning=true;spinButton.disabled=true;result.textContent='Колесо вращается…';
    const base=Math.max(3,Math.min(60,Number(byId('auctionSpinDuration').value)||8));
    const duration=byId('auctionRandomDuration').checked ? base*(.65+Math.random()*.7) : base;
    wheel.style.transitionDuration=`${duration}s`;
    const middle=(winner.start+winner.weight/2)/winner.sum*360;
    rotation += 1800+(360-middle)-(rotation%360); wheel.style.transform=`rotate(${rotation}deg)`;
    const mode=auctionMode();
    window.setTimeout(async()=>{ spinning=false;result.innerHTML=`${mode==='elimination'?'Выбывает':'Победил'}: <strong>${escapeHtml(winner.item.title)}</strong>`;if(mode==='elimination'){if(schemaReady){await client.from('auction_items').update({ eliminated:true }).eq('id',winner.item.id);await loadItems();}else{winner.item.eliminated=true;render();}}else render(); },duration*1000+100);
  }

  async function saveItem(event) {
    event.preventDefault(); if (!isAdmin) return;
    const title=byId('auctionItemTitle').value.trim(),description=byId('auctionItemDescription').value.trim(),amount=Number(byId('auctionItemAmount').value);
    if (!title || !Number.isFinite(amount) || amount<0) return;
    if (!schemaReady) {
      if (editingId) items = items.map(item => String(item.id) === String(editingId) ? { ...item,title,description,amount } : item);
      else items.push({ id:`preview-${Date.now()}`,title,description,amount,eliminated:false });
    } else {
      const query=editingId ? client.from('auction_items').update({title,description,amount}).eq('id',editingId) : client.from('auction_items').insert({title,description,amount,display_order:items.length});
      const { error }=await query; if(error){result.textContent=error.message;return;}
    }
    editingId=null;form.reset();form.hidden=true;byId('auctionAdminToggle').textContent='Добавить лот';if(schemaReady)await loadItems();else render();
  }

  function editItem(id) {
    const item=items.find(entry=>String(entry.id)===String(id));if(!item)return;
    editingId=item.id;byId('auctionItemTitle').value=item.title;byId('auctionItemDescription').value=item.description||'';byId('auctionItemAmount').value=Number(item.amount)||0;form.hidden=false;byId('auctionAdminToggle').textContent='Отменить';
  }

  async function mutateItem(target,action) {
    if(!isAdmin)return;const row=target.closest('[data-auction-id]'),id=row?.dataset.auctionId,item=items.find(entry=>String(entry.id)===String(id));if(!item)return;
    if (!schemaReady) {
      if(action==='delete') items=items.filter(entry=>String(entry.id)!==String(id));
      if(action==='eliminate') item.eliminated=!item.eliminated;
      render();
    } else {
      if(action==='delete') await client.from('auction_items').delete().eq('id',id);
      if(action==='eliminate') await client.from('auction_items').update({eliminated:!item.eliminated}).eq('id',id);
      await loadItems();
    }
  }

  function remainingSeconds() { return timer.running && timer.endsAt ? Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000)) : Math.max(0,timer.remaining); }
  function drawTimer() { const seconds=remainingSeconds(),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;timerDisplay.textContent=[h,m,s].map(x=>String(x).padStart(2,'0')).join(':');if(!seconds&&timer.running){timer.running=false;timer.endsAt=null;byId('auctionTimerToggle').textContent='Запустить';} }
  function adjustTimer(delta) { const next=Math.max(0,remainingSeconds()+delta);timer.remaining=next;if(timer.running)timer.endsAt=Date.now()+next*1000;drawTimer(); }
  function toggleTimer(){if(timer.running){timer.remaining=remainingSeconds();timer.running=false;timer.endsAt=null;byId('auctionTimerToggle').textContent='Возобновить';}else{if(!timer.remaining)timer.remaining=3600;timer.running=true;timer.endsAt=Date.now()+timer.remaining*1000;byId('auctionTimerToggle').textContent='Пауза';}drawTimer();}
  function resetTimer(){timer={remaining:0,running:false,endsAt:null};byId('auctionTimerToggle').textContent='Запустить';drawTimer();}
  function timerStep(){return Math.max(1,Number(byId('auctionTimerStep').value)||1)*Number(byId('auctionTimerUnit').value||1);}

  function switchTab(button){document.querySelectorAll('[data-auction-tab]').forEach(x=>x.classList.toggle('active',x===button));document.querySelectorAll('[data-auction-panel]').forEach(x=>{const active=x.dataset.auctionPanel===button.dataset.auctionTab;x.hidden=!active;x.classList.toggle('active',active);});}
  function openAuction(){lastFocusedElement=document.activeElement;panel.hidden=false;panel.setAttribute('aria-hidden','false');openButton.setAttribute('aria-expanded','true');document.body.classList.add('auction-open');loadItems();requestAnimationFrame(()=>{panel.classList.add('is-open');closeButton.focus();});}
  function closeAuction(){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');openButton.setAttribute('aria-expanded','false');document.body.classList.remove('auction-open');window.setTimeout(()=>{panel.hidden=true;lastFocusedElement?.focus();},450);}

  openButton.addEventListener('click',openAuction);closeButton.addEventListener('click',closeAuction);spinButton.addEventListener('click',spin);form.addEventListener('submit',saveItem);
  panel.addEventListener('click',event=>{if(event.target.matches('[data-auction-close]'))closeAuction();const row=event.target.closest('[data-auction-id]');if(event.target.closest('.auction-edit'))editItem(row?.dataset.auctionId);if(event.target.closest('.auction-delete'))mutateItem(event.target,'delete');if(event.target.closest('.auction-eliminate'))mutateItem(event.target,'eliminate');});
  list.addEventListener('mouseover',event=>{const row=event.target.closest('[data-auction-id]');if(row)wheel.style.background=wheelGradient(row.dataset.auctionId);});list.addEventListener('mouseout',()=>wheel.style.background=wheelGradient());
  document.querySelectorAll('[data-auction-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button)));
  byId('auctionHideEliminated').addEventListener('change',render);byId('auctionAdminToggle').addEventListener('click',()=>{form.hidden=!form.hidden;if(form.hidden){editingId=null;form.reset();}});
  document.querySelectorAll('[name="auctionMode"]').forEach(input=>input.addEventListener('change',render));
  byId('auctionSettingsToggle').addEventListener('click',()=>{byId('auctionSettings').hidden=!byId('auctionSettings').hidden;});
  byId('auctionTimerToggle').addEventListener('click',toggleTimer);byId('auctionTimerReset').addEventListener('click',resetTimer);
  byId('auctionTimerAdd').addEventListener('click',()=>adjustTimer(timerStep()));byId('auctionTimerSubtract').addEventListener('click',()=>adjustTimer(-timerStep()));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)closeAuction();});window.setInterval(drawTimer,250);drawTimer();
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
