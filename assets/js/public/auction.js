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
  let historyEntries = [];
  const settingsKey = 'predlozhka141.auctionSettings';
  const rulesKey = 'predlozhka141.auctionRules';
  const defaultSettings = { initialMinutes:60,showTimer:false,showChances:true,compactList:false,autoHide:false,accent:'#e33b28' };
  let userSettings = { ...defaultSettings };
  try { userSettings={...defaultSettings,...JSON.parse(localStorage.getItem(settingsKey)||'{}')}; } catch (_) { userSettings={...defaultSettings}; }

  const money = value => `${new Intl.NumberFormat('ru-RU').format(Number(value) || 0)} ₽`;
  const percent = value => `${new Intl.NumberFormat('ru-RU',{ maximumFractionDigits: 1 }).format(value)}%`;
  const activeItems = () => items.filter(item => !item.eliminated && Number(item.amount) > 0);
  const auctionMode = () => document.querySelector('[name="auctionMode"]:checked')?.value || 'winner';
  const selectionEntries = () => {
    const active=activeItems(),total=active.reduce((sum,item)=>sum+Number(item.amount),0);
    return active.map(item=>({ item,weight:auctionMode()==='elimination' ? Math.max(0,total-Number(item.amount)) : Number(item.amount) }));
  };
  const selectionTotal = () => selectionEntries().reduce((sum,entry)=>sum+entry.weight,0);

  function renderHistory() {
    const history=byId('auctionHistory');
    history.innerHTML=historyEntries.length ? historyEntries.map((entry,index)=>`<article><span>${escapeHtml(entry.label)}</span><button aria-label="Отменить изменение" data-history-index="${index}" title="Отменить">↶</button></article>`).join('') : '<p>Изменений пока нет</p>';
  }

  function recordHistory(label,undo) {
    historyEntries.unshift({label,undo});
    historyEntries=historyEntries.slice(0,20);
    renderHistory();
  }

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

  function highlightItem(id='') {
    wheel.style.background=wheelGradient(id);
    list.querySelectorAll('[data-auction-id]').forEach(row=>{
      const selected=id&&String(row.dataset.auctionId)===String(id);
      row.classList.toggle('is-highlighted',Boolean(selected));
      row.classList.toggle('is-dimmed',Boolean(id)&&!selected);
    });
  }

  function itemAtWheelPoint(event) {
    const rect=wheel.getBoundingClientRect(),x=event.clientX-(rect.left+rect.width/2),y=event.clientY-(rect.top+rect.height/2);
    const radius=Math.hypot(x,y);if(radius<rect.width*.17||radius>rect.width*.5)return null;
    const matrix=new DOMMatrixReadOnly(getComputedStyle(wheel).transform);
    const renderedRotation=Math.atan2(matrix.b,matrix.a)*180/Math.PI;
    const angle=(Math.atan2(y,x)*180/Math.PI+90-renderedRotation+360)%360,entries=selectionEntries(),sum=selectionTotal();let cursor=0;
    if(!sum)return null;
    for(const {item,weight} of entries){cursor+=weight/sum*360;if(angle<cursor)return item;}
    return entries.at(-1)?.item||null;
  }

  function render() {
    const active=activeItems(),bank=active.reduce((sum,item)=>sum+Number(item.amount),0),selectionSum=selectionTotal(),hideEliminated=byId('auctionHideEliminated').checked;
    total.textContent = money(bank); count.textContent = String(active.length);
    panel.classList.toggle('auction-hide-chances',!userSettings.showChances);
    panel.classList.toggle('auction-compact-list',userSettings.compactList);
    panel.style.setProperty('--auction-accent',userSettings.accent);
    spinButton.disabled = !isAdmin || !selectionSum || spinning;
    wheel.style.background = wheelGradient();
    const chanceById=new Map(selectionEntries().map(entry=>[String(entry.item.id),selectionSum ? entry.weight/selectionSum*100 : 0]));
    const visible = items.filter(item => !hideEliminated || !item.eliminated).sort((a,b)=>{
      if(a.eliminated!==b.eliminated)return a.eliminated?1:-1;
      if(auctionMode()==='elimination')return (chanceById.get(String(a.id))||0)-(chanceById.get(String(b.id))||0);
      return 0;
    });
    list.innerHTML = visible.length ? visible.map((item,index) => {
      const chance=chanceById.get(String(item.id))||0;
      return `<article class="auction-item${item.eliminated ? ' is-eliminated' : ''}" data-auction-id="${escapeHtml(item.id)}">
        <span class="auction-color" style="--lot-color:${colors[items.indexOf(item) % colors.length]}">${String(index + 1).padStart(2,'0')}</span>
        <div class="auction-item-copy"><h3>${escapeHtml(item.title)}</h3><p>${money(item.amount)}</p></div>
        <div class="auction-item-amount"><span>Собрано</span><strong>${money(item.amount)}</strong></div>
        <div class="auction-item-chance"><span>${item.eliminated ? 'Статус' : auctionMode()==='elimination' ? 'Шанс вылета' : 'Шанс победы'}</span><strong>${item.eliminated ? 'Выбыл' : percent(chance)}</strong></div>
      </article>`;
    }).join('') : '<div class="auction-empty"><strong>Участников пока нет</strong><span>Администратор добавит лоты перед аукционом.</span></div>';
    manageList.innerHTML = [...items].sort((a,b)=>Number(b.amount)-Number(a.amount)).map(item => `<article class="auction-manage-item" data-auction-id="${escapeHtml(item.id)}"><div><strong>${escapeHtml(item.title)}</strong><span>${money(item.amount)} · ${item.eliminated ? 'выбыл' : 'участвует'}</span></div><label class="auction-funds"><input min="1" placeholder="Добавить ₽" step="1" type="number"><button aria-label="Добавить рубли" class="auction-add-funds" title="Добавить рубли" type="button">+₽</button></label><div class="auction-manage-actions"><button aria-label="${item.eliminated ? 'Вернуть в рулетку' : 'Исключить из рулетки'}" class="auction-eliminate" title="${item.eliminated ? 'Вернуть' : 'Исключить'}" type="button">${item.eliminated ? '↩' : '⊘'}</button><button aria-label="Изменить лот" class="auction-edit" title="Изменить" type="button">✎</button><button aria-label="Удалить лот" class="auction-delete" title="Удалить" type="button">×</button></div></article>`).join('');
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
    byId('auctionSpinDuration').disabled = !isAdmin;
    byId('auctionRandomDuration').disabled = !isAdmin;
    byId('auctionSpinMin').disabled = !isAdmin;
    byId('auctionSpinMax').disabled = !isAdmin;
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
    const minDuration=Math.max(3,Math.min(60,Number(byId('auctionSpinMin').value)||5)),maxDuration=Math.max(minDuration,Math.min(90,Number(byId('auctionSpinMax').value)||15));
    const duration=byId('auctionRandomDuration').checked ? minDuration+Math.random()*(maxDuration-minDuration) : base;
    wheel.style.transitionDuration=`${duration}s`;
    const middle=(winner.start+winner.weight/2)/winner.sum*360;
    rotation += 1800+(360-middle)-(rotation%360); wheel.style.transform=`rotate(${rotation}deg)`;
    const mode=auctionMode();
    window.setTimeout(async()=>{ spinning=false;result.innerHTML=`${mode==='elimination'?'Выбывает':'Победил'}: <strong>${escapeHtml(winner.item.title)}</strong>`;if(mode==='elimination'){if(schemaReady){await client.from('auction_items').update({ eliminated:true }).eq('id',winner.item.id);recordHistory(`Рулетка исключила «${winner.item.title}»`,async()=>{await client.from('auction_items').update({eliminated:false}).eq('id',winner.item.id);await loadItems();});await loadItems();}else{winner.item.eliminated=true;recordHistory(`Рулетка исключила «${winner.item.title}»`,async()=>{winner.item.eliminated=false;render();});render();}}else render(); },duration*1000+100);
  }

  async function saveItem(event) {
    event.preventDefault(); if (!isAdmin) return;
    const title=byId('auctionItemTitle').value.trim(),amount=Number(byId('auctionItemAmount').value);
    if (!title || !Number.isFinite(amount) || amount<0) return;
    const previous=items.find(item=>String(item.id)===String(editingId));
    if (!schemaReady) {
      if (editingId) {
        items = items.map(item => String(item.id) === String(editingId) ? { ...item,title,amount } : item);
        recordHistory(`Изменён лот «${title}»`,async()=>{items=items.map(item=>String(item.id)===String(previous.id)?previous:item);render();});
      } else {
        const created={ id:`preview-${Date.now()}`,title,description:'',amount,eliminated:false };items.push(created);
        recordHistory(`Создан лот «${title}»`,async()=>{items=items.filter(item=>item!==created);render();});
      }
    } else {
      if(editingId){const {error}=await client.from('auction_items').update({title,amount}).eq('id',editingId);if(error){result.textContent=error.message;return;}recordHistory(`Изменён лот «${title}»`,async()=>{await client.from('auction_items').update({title:previous.title,amount:previous.amount}).eq('id',previous.id);await loadItems();});}
      else {const {data,error}=await client.from('auction_items').insert({title,amount,display_order:items.length}).select('id').single();if(error){result.textContent=error.message;return;}recordHistory(`Создан лот «${title}»`,async()=>{await client.from('auction_items').delete().eq('id',data.id);await loadItems();});}
    }
    editingId=null;form.reset();form.hidden=true;byId('auctionAdminToggle').textContent='＋';if(schemaReady)await loadItems();else render();
  }

  function editItem(id) {
    const item=items.find(entry=>String(entry.id)===String(id));if(!item)return;
    editingId=item.id;byId('auctionItemTitle').value=item.title;byId('auctionItemAmount').value=Number(item.amount)||0;form.hidden=false;byId('auctionAdminToggle').textContent='×';
  }

  async function mutateItem(target,action) {
    if(!isAdmin)return;const row=target.closest('[data-auction-id]'),id=row?.dataset.auctionId,item=items.find(entry=>String(entry.id)===String(id));if(!item)return;
    if (!schemaReady) {
      if(action==='delete'){const index=items.indexOf(item);items=items.filter(entry=>String(entry.id)!==String(id));recordHistory(`Удалён лот «${item.title}»`,async()=>{items.splice(index,0,item);render();});}
      if(action==='eliminate'){const previous=item.eliminated;item.eliminated=!item.eliminated;recordHistory(`${item.eliminated?'Исключён':'Возвращён'} лот «${item.title}»`,async()=>{item.eliminated=previous;render();});}
      render();
    } else {
      if(action==='delete'){const {error}=await client.from('auction_items').delete().eq('id',id);if(error){result.textContent=error.message;return;}recordHistory(`Удалён лот «${item.title}»`,async()=>{await client.from('auction_items').insert({title:item.title,description:item.description||'',amount:item.amount,display_order:item.display_order||0,active:true,eliminated:item.eliminated});await loadItems();});}
      if(action==='eliminate'){const previous=item.eliminated,{error}=await client.from('auction_items').update({eliminated:!previous}).eq('id',id);if(error){result.textContent=error.message;return;}recordHistory(`${!previous?'Исключён':'Возвращён'} лот «${item.title}»`,async()=>{await client.from('auction_items').update({eliminated:previous}).eq('id',id);await loadItems();});}
      await loadItems();
    }
  }

  async function addFunds(target) {
    if(!isAdmin)return;const row=target.closest('[data-auction-id]'),id=row?.dataset.auctionId,item=items.find(entry=>String(entry.id)===String(id)),amount=Number(row?.querySelector('.auction-funds input')?.value);if(!item||!Number.isFinite(amount)||amount<=0)return;
    const previousAmount=Number(item.amount),nextAmount=previousAmount+amount,label=`«${item.title}»: +${money(amount)}`;
    if(!schemaReady){item.amount=nextAmount;recordHistory(label,async()=>{item.amount=previousAmount;render();});render();}else{const {error}=await client.from('auction_items').update({amount:nextAmount}).eq('id',id);if(error){result.textContent=error.message;return;}recordHistory(label,async()=>{await client.from('auction_items').update({amount:previousAmount}).eq('id',id);await loadItems();});await loadItems();}
  }

  function remainingSeconds() { return timer.running && timer.endsAt ? Math.max(0,Math.ceil((timer.endsAt-Date.now())/1000)) : Math.max(0,timer.remaining); }
  function drawTimer() { const seconds=remainingSeconds(),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;timerDisplay.textContent=[h,m,s].map(x=>String(x).padStart(2,'0')).join(':');if(!seconds&&timer.running){timer.running=false;timer.endsAt=null;byId('auctionTimerToggle').textContent='▶';} }
  function adjustTimer(delta) { const next=Math.max(0,remainingSeconds()+delta);timer.remaining=next;if(timer.running)timer.endsAt=Date.now()+next*1000;drawTimer(); }
  function toggleTimer(){if(timer.running){timer.remaining=remainingSeconds();timer.running=false;timer.endsAt=null;byId('auctionTimerToggle').textContent='▶';}else{if(!timer.remaining)timer.remaining=3600;timer.running=true;timer.endsAt=Date.now()+timer.remaining*1000;byId('auctionTimerToggle').textContent='Ⅱ';}drawTimer();}
  function resetTimer(){timer={remaining:Math.max(1,Number(userSettings.initialMinutes)||60)*60,running:false,endsAt:null};byId('auctionTimerToggle').textContent='▶';drawTimer();}
  function timerStep(){return Math.max(1,Number(byId('auctionTimerStep').value)||1)*Number(byId('auctionTimerUnit').value||1);}

  function saveSettings() { localStorage.setItem(settingsKey,JSON.stringify(userSettings)); applySettings(); }
  function applySettings() {
    byId('auctionInitialMinutes').value=userSettings.initialMinutes;
    byId('auctionShowTimer').checked=userSettings.showTimer;
    byId('auctionShowChances').checked=userSettings.showChances;
    byId('auctionCompactList').checked=userSettings.compactList;
    byId('auctionAutoHide').checked=userSettings.autoHide;
    byId('auctionQuickChances').checked=userSettings.showChances;
    byId('auctionQuickHide').checked=byId('auctionHideEliminated').checked;
    panel.classList.toggle('auction-show-timer',userSettings.showTimer);
    document.querySelectorAll('[data-color]').forEach(button=>button.classList.toggle('active',button.dataset.color===userSettings.accent));
    render();
  }

  function switchTab(button){document.querySelectorAll('[data-auction-tab]').forEach(x=>x.classList.toggle('active',x===button));document.querySelectorAll('[data-auction-panel]').forEach(x=>{const active=x.dataset.auctionPanel===button.dataset.auctionTab;x.hidden=!active;x.classList.toggle('active',active);});}
  function openAuction(){lastFocusedElement=document.activeElement;panel.hidden=false;panel.setAttribute('aria-hidden','false');openButton.setAttribute('aria-expanded','true');document.body.classList.add('auction-open');loadItems();requestAnimationFrame(()=>{panel.classList.add('is-open');closeButton.focus();});}
  function closeAuction(){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');openButton.setAttribute('aria-expanded','false');document.body.classList.remove('auction-open');window.setTimeout(()=>{panel.hidden=true;lastFocusedElement?.focus();},450);}

  const rulesEditor=byId('auctionRulesEditor'),rulesStatus=byId('auctionRulesStatus');
  const savedRules=localStorage.getItem(rulesKey);
  if(savedRules)rulesEditor.innerHTML=savedRules;
  let rulesSaveTimer=0;
  function saveRules(){localStorage.setItem(rulesKey,rulesEditor.innerHTML);rulesStatus.textContent='Сохранено';}
  function scheduleRulesSave(){rulesStatus.textContent='Сохранение…';window.clearTimeout(rulesSaveTimer);rulesSaveTimer=window.setTimeout(saveRules,350);}

  openButton.addEventListener('click',openAuction);closeButton.addEventListener('click',closeAuction);spinButton.addEventListener('click',spin);form.addEventListener('submit',saveItem);
  panel.addEventListener('click',async event=>{if(event.target.matches('[data-auction-close]'))closeAuction();const row=event.target.closest('[data-auction-id]');if(event.target.closest('.auction-edit'))editItem(row?.dataset.auctionId);if(event.target.closest('.auction-delete'))mutateItem(event.target,'delete');if(event.target.closest('.auction-eliminate'))mutateItem(event.target,'eliminate');if(event.target.closest('.auction-add-funds'))addFunds(event.target);const undo=event.target.closest('[data-history-index]');if(undo){const entry=historyEntries[Number(undo.dataset.historyIndex)];if(entry){await entry.undo();historyEntries=historyEntries.filter(item=>item!==entry);renderHistory();}}});
  list.addEventListener('mouseover',event=>{const row=event.target.closest('[data-auction-id]');if(row)highlightItem(row.dataset.auctionId);});list.addEventListener('mouseout',()=>highlightItem());
  wheel.addEventListener('mousemove',event=>highlightItem(itemAtWheelPoint(event)?.id||''));wheel.addEventListener('mouseleave',()=>highlightItem());
  document.querySelectorAll('[data-auction-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button)));
  byId('auctionHideEliminated').addEventListener('change',event=>{byId('auctionQuickHide').checked=event.target.checked;render();});byId('auctionAdminToggle').addEventListener('click',()=>{form.hidden=!form.hidden;if(form.hidden){editingId=null;form.reset();}});
  document.querySelectorAll('[name="auctionMode"]').forEach(input=>input.addEventListener('change',render));
  byId('auctionSettingsToggle').addEventListener('click',()=>{const quick=byId('auctionSettings');quick.hidden=!quick.hidden;byId('auctionSettingsToggle').setAttribute('aria-expanded',String(!quick.hidden));});
  byId('auctionRandomDuration').addEventListener('change',()=>{byId('auctionRandomRange').hidden=!byId('auctionRandomDuration').checked;});
  byId('auctionQuickHide').addEventListener('change',event=>{byId('auctionHideEliminated').checked=event.target.checked;render();});
  byId('auctionQuickChances').addEventListener('change',event=>{userSettings.showChances=event.target.checked;saveSettings();});
  panel.querySelector('[data-open-auction-settings]').addEventListener('click',()=>{switchTab(panel.querySelector('[data-auction-tab="settings"]'));byId('auctionSettings').hidden=true;});
  byId('auctionInitialMinutes').addEventListener('change',event=>{userSettings.initialMinutes=Math.max(1,Math.min(360,Number(event.target.value)||60));saveSettings();});
  byId('auctionShowTimer').addEventListener('change',event=>{userSettings.showTimer=event.target.checked;saveSettings();});
  byId('auctionShowChances').addEventListener('change',event=>{userSettings.showChances=event.target.checked;saveSettings();});
  byId('auctionCompactList').addEventListener('change',event=>{userSettings.compactList=event.target.checked;saveSettings();});
  byId('auctionAutoHide').addEventListener('change',event=>{userSettings.autoHide=event.target.checked;byId('auctionHideEliminated').checked=event.target.checked;saveSettings();});
  byId('auctionAccentColors').addEventListener('click',event=>{const button=event.target.closest('[data-color]');if(button){userSettings.accent=button.dataset.color;saveSettings();}});
  byId('auctionSettingsReset').addEventListener('click',()=>{userSettings={...defaultSettings};byId('auctionHideEliminated').checked=false;saveSettings();});
  byId('auctionTimerToggle').addEventListener('click',toggleTimer);byId('auctionTimerReset').addEventListener('click',resetTimer);
  byId('auctionTimerAdd').addEventListener('click',()=>adjustTimer(timerStep()));byId('auctionTimerSubtract').addEventListener('click',()=>adjustTimer(-timerStep()));
  byId('auctionHistoryClear').addEventListener('click',()=>{historyEntries=[];renderHistory();});
  document.querySelectorAll('[data-manage-view]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-manage-view]').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('[data-manage-panel]').forEach(view=>{const active=view.dataset.managePanel===button.dataset.manageView;view.hidden=!active;view.classList.toggle('active',active);});if(button.dataset.manageView==='rules')rulesEditor.focus();}));
  byId('auctionRulesEditor').addEventListener('input',scheduleRulesSave);
  byId('auctionRulesEditor').addEventListener('paste',event=>{event.preventDefault();document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));});
  panel.querySelector('.auction-editor-toolbar').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;rulesEditor.focus();if(button.hasAttribute('data-editor-clear'))document.execCommand('removeFormat');else document.execCommand(button.dataset.editorCommand,false,button.dataset.editorValue||null);scheduleRulesSave();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)closeAuction();});window.setInterval(drawTimer,250);drawTimer();renderHistory();applySettings();
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
