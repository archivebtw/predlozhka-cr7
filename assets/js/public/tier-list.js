(() => {
  const panel=document.getElementById('tierListPanel'),openButton=document.getElementById('tierListOpen'),closeButton=document.getElementById('tierListClose'),board=document.getElementById('tierBoard'),adminStatus=document.getElementById('tierAdminStatus');
  if(!panel||!openButton||!closeButton||!board)return;
  const tiers=['S','A','B','C','D',''];
  const labels={S:'S — Лучшие',A:'A — Отличные',B:'B — Хорошие',C:'C — Нормальные',D:'D — Слабые','':'Без оценки'};
  let isAdmin=false,lastFocus=null;
  const eligible=()=>state.games.filter(game=>['completed','dropped'].includes(String(game.library_status||'')));
  function renderTierList(){
    const games=eligible();
    board.innerHTML=tiers.map(tier=>{const entries=games.filter(game=>String(game.tier_rank||'')===tier);return `<section class="tier-row" data-tier="${tier}"><strong>${labels[tier]}</strong><div>${entries.length?entries.map(game=>`<article class="tier-game"><img alt="" src="${escapeHtml(safeExternalUrl(game.cover_url)||'./assets/images/bloodseeker.webp')}" referrerpolicy="no-referrer"><span>${escapeHtml(game.title)}</span><small>${game.library_status==='dropped'?'Дроп':'Пройдено'}</small>${isAdmin?`<select aria-label="Оценка ${escapeHtml(game.title)}" data-tier-game="${escapeHtml(game.id)}">${tiers.map(value=>`<option value="${value}"${value===String(game.tier_rank||'')?' selected':''}>${labels[value]}</option>`).join('')}</select>`:''}</article>`).join(''):'<p>Игры пока не добавлены</p>'}</div></section>`}).join('');
  }
  async function checkAdmin(){const client=getConfiguredClient();if(!client){isAdmin=false;return;}const {data:session}=await client.auth.getSession();if(!session?.session?.user){isAdmin=false;return;}const {data}=await client.rpc('is_site_admin');isAdmin=data===true&&state.tierSchemaReady!==false;}
  async function open(){lastFocus=document.activeElement;panel.hidden=false;panel.setAttribute('aria-hidden','false');document.body.classList.add('tier-open');renderTierList();await checkAdmin();adminStatus.textContent=isAdmin?'Режим редактирования':state.tierSchemaReady===false?'Нужно применить миграцию тир-листа':'Публичный просмотр';renderTierList();requestAnimationFrame(()=>panel.classList.add('is-open'));closeButton.focus();}
  function close(){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');document.body.classList.remove('tier-open');setTimeout(()=>{panel.hidden=true;lastFocus?.focus();},280);}
  openButton.addEventListener('click',open);closeButton.addEventListener('click',close);panel.addEventListener('click',event=>{if(event.target.matches('[data-tier-close]'))close();});
  board.addEventListener('change',async event=>{const select=event.target.closest('[data-tier-game]');if(!select||!isAdmin)return;const game=state.games.find(item=>String(item.id)===select.dataset.tierGame);if(!game)return;select.disabled=true;const client=getConfiguredClient();const {error}=await client.from('games').update({tier_rank:select.value}).eq('id',game.id);if(error){adminStatus.textContent=error.message;select.disabled=false;return;}game.tier_rank=select.value;adminStatus.textContent='Сохранено';renderTierList();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});
})();
