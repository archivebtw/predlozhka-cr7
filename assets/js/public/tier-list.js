(() => {
  const panel = document.getElementById('tierListPanel');
  const openButton = document.getElementById('tierListOpen');
  const closeButton = document.getElementById('tierListClose');
  const board = document.getElementById('tierBoard');
  const adminStatus = document.getElementById('tierAdminStatus');
  const rowDialog = document.getElementById('tierRowDialog');
  const rowLabel = document.getElementById('tierRowLabel');
  const rowColor = document.getElementById('tierRowColor');
  const colorPresets = document.getElementById('tierColorPresets');
  const resetButton = document.getElementById('tierReset');
  const resetDialog = document.getElementById('tierResetDialog');
  const rowSaveButton = document.getElementById('tierRowSave');
  const rowClearButton = document.getElementById('tierRowClear');
  const rowDeleteButton = document.getElementById('tierRowDelete');
  const rowAddAboveButton = document.getElementById('tierRowAddAbove');
  const rowAddBelowButton = document.getElementById('tierRowAddBelow');

  if (
    !panel ||
    !openButton ||
    !closeButton ||
    !board ||
    !adminStatus ||
    !rowDialog ||
    !rowLabel ||
    !rowColor ||
    !colorPresets ||
    !resetButton ||
    !resetDialog ||
    !rowSaveButton
  ) return;

  const base = [
    { id: 'S', label: 'S', color: '#ff7f7f' },
    { id: 'A', label: 'A', color: '#ffbf7f' },
    { id: 'B', label: 'B', color: '#ffdf7f' },
    { id: 'C', label: 'C', color: '#ffff7f' },
    { id: 'D', label: 'D', color: '#bfff7f' }
  ];

  const dragPreview = document.createElement('div');
  dragPreview.className = 'tier-drag-preview';
  dragPreview.setAttribute('aria-hidden', 'true');
  document.body.append(dragPreview);

  let rows = cloneRows(base);
  let isAdmin = false;
  let lastFocus = null;
  let draggedId = '';
  let draggedPlacement = null;
  let editingRow = '';

  function cloneRows(source) {
    return source.map(row => ({ ...row }));
  }

  function validColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#707070';
  }

  function normalizeRows(config) {
    const seen = new Set();
    return config.reduce((result, item) => {
      const id = String(item?.id || '').trim();
      if (!id || seen.has(id)) return result;
      seen.add(id);
      const label = String(item?.label || '').trim().slice(0, 30) || 'НОВАЯ';
      result.push({ id, label, color: validColor(item?.color) });
      return result;
    }, []);
  }

  function createRowId() {
    return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const eligible = () => state.games
    .filter(game => ['completed', 'dropped'].includes(String(game.library_status || '')))
    .sort((a, b) => {
      const orderDifference = (Number(a.tier_order) || 0) - (Number(b.tier_order) || 0);
      return orderDifference || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
    });

  function gamesInTier(tier, excludedId = '') {
    return eligible().filter(game => (
      String(game.tier_rank || '') === tier &&
      String(game.id) !== String(excludedId)
    ));
  }

  function gameCard(game) {
    const cover = safeExternalUrl(game.cover_url) || './assets/images/figma/game-placeholder.svg';
    const draggable = isAdmin ? 'draggable="true" aria-grabbed="false"' : '';
    return `<article class="tier-game" ${draggable} data-tier-game="${escapeHtml(game.id)}" title="${escapeHtml(game.title)}"><img alt="Обложка ${escapeHtml(game.title)}" src="${escapeHtml(cover)}" referrerpolicy="no-referrer"><span>${escapeHtml(game.title)}</span></article>`;
  }

  function renderTierList() {
    const games = eligible();
    const allRows = [...rows, { id: '', label: 'Без оценки', color: '#292323' }];
    board.innerHTML = allRows.map((row, index) => {
      const entries = games.filter(game => String(game.tier_rank || '') === row.id);
      const empty = row.id === '' ? 'Здесь появятся новые игры' : 'Перетащите игры сюда';
      const actions = isAdmin && row.id !== ''
        ? `<div class="tier-row-actions"><button aria-label="Настроить ${escapeHtml(row.label)}" data-row-settings="${escapeHtml(row.id)}" type="button">⚙</button><span><button aria-label="Поднять ряд" data-row-move="up" data-row-id="${escapeHtml(row.id)}" ${index === 0 ? 'disabled' : ''} type="button">◀</button><i aria-hidden="true"></i><button aria-label="Опустить ряд" data-row-move="down" data-row-id="${escapeHtml(row.id)}" ${index === rows.length - 1 ? 'disabled' : ''} type="button">▶</button></span></div>`
        : '';
      return `<section class="tier-row${row.id === '' ? ' is-pool' : ''}" data-tier="${escapeHtml(row.id)}" style="--tier-color:${validColor(row.color)}"><strong>${escapeHtml(row.label)}</strong><div class="tier-dropzone">${entries.length ? entries.map(gameCard).join('') : `<p>${empty}</p>`}</div>${actions}</section>`;
    }).join('');
  }

  function getClient() {
    const client = getConfiguredClient();
    if (!client) throw new Error('Нет подключения к базе данных');
    return client;
  }

  async function persistRows() {
    const client = getClient();
    const { error } = await client
      .from('tier_list_settings')
      .upsert({ id: 1, config: rows, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async function persistGames(games) {
    const uniqueGames = [...new Map(games.map(game => [String(game.id), game])).values()];
    if (!uniqueGames.length) return;
    const client = getClient();
    const results = await Promise.all(uniqueGames.map(game => client
      .from('games')
      .update({
        tier_rank: String(game.tier_rank || ''),
        tier_order: Number(game.tier_order) || 0
      })
      .eq('id', game.id)));
    const failed = results.find(result => result.error);
    if (failed) throw failed.error;
  }

  function snapshotPositions() {
    return eligible().map(game => ({
      id: String(game.id),
      tier_rank: String(game.tier_rank || ''),
      tier_order: Number(game.tier_order) || 0
    }));
  }

  function restorePositions(snapshot) {
    snapshot.forEach(saved => {
      const game = state.games.find(item => String(item.id) === saved.id);
      if (game) {
        game.tier_rank = saved.tier_rank;
        game.tier_order = saved.tier_order;
      }
    });
  }

  async function saveRows(successMessage = 'Сохранено') {
    adminStatus.textContent = 'Сохранение…';
    try {
      await persistRows();
      adminStatus.textContent = successMessage;
      return true;
    } catch (error) {
      adminStatus.textContent = error.message;
      return false;
    }
  }

  async function checkAdmin() {
    isAdmin = false;
    const client = getConfiguredClient();
    if (!client) return;
    const { data: session } = await client.auth.getSession();
    if (!session?.session?.user) return;
    const { data } = await client.rpc('is_site_admin');
    isAdmin = data === true && state.tierSchemaReady !== false;
  }

  async function loadSettings() {
    const client = getConfiguredClient();
    if (!client) return;
    const { data, error } = await client
      .from('tier_list_settings')
      .select('config')
      .eq('id', 1)
      .maybeSingle();
    if (!error && Array.isArray(data?.config)) rows = normalizeRows(data.config);
  }

  async function moveGame(id, tier, requestedIndex) {
    if (!isAdmin) return;
    const game = state.games.find(item => String(item.id) === String(id));
    if (!game) return;

    const before = snapshotPositions();
    const sourceTier = String(game.tier_rank || '');
    const sourceGames = gamesInTier(sourceTier, id);
    const targetGames = sourceTier === tier ? sourceGames : gamesInTier(tier, id);
    const targetIndex = Math.max(0, Math.min(Number(requestedIndex) || 0, targetGames.length));

    targetGames.splice(targetIndex, 0, game);
    game.tier_rank = tier;
    targetGames.forEach((item, index) => {
      item.tier_rank = tier;
      item.tier_order = index;
    });
    if (sourceTier !== tier) {
      sourceGames.forEach((item, index) => {
        item.tier_rank = sourceTier;
        item.tier_order = index;
      });
    }

    const affected = sourceTier === tier ? targetGames : [...sourceGames, ...targetGames];
    const changed = affected.filter(item => {
      const previous = before.find(saved => saved.id === String(item.id));
      return !previous ||
        previous.tier_rank !== String(item.tier_rank || '') ||
        previous.tier_order !== (Number(item.tier_order) || 0);
    });

    clearDropIndicators();
    renderTierList();
    if (!changed.length) return;

    adminStatus.textContent = 'Сохраняем порядок…';
    try {
      await persistGames(changed);
      adminStatus.textContent = 'Порядок сохранён';
    } catch (error) {
      restorePositions(before);
      renderTierList();
      adminStatus.textContent = error.message;
    }
  }

  function getDropPlacement(event) {
    const row = event.target.closest('[data-tier]');
    if (!row) return null;

    const cards = [...row.querySelectorAll('[data-tier-game]')]
      .filter(card => card.dataset.tierGame !== draggedId);
    const hoveredCard = event.target.closest('[data-tier-game]');

    if (hoveredCard && hoveredCard.dataset.tierGame !== draggedId) {
      const cardIndex = cards.indexOf(hoveredCard);
      if (cardIndex >= 0) {
        const rect = hoveredCard.getBoundingClientRect();
        const insertAfter = event.clientX >= rect.left + rect.width / 2;
        return {
          row,
          card: hoveredCard,
          side: insertAfter ? 'after' : 'before',
          tier: row.dataset.tier,
          index: cardIndex + (insertAfter ? 1 : 0)
        };
      }
    }

    return {
      row,
      card: null,
      side: '',
      tier: row.dataset.tier,
      index: cards.length
    };
  }

  function clearDropIndicators() {
    board.querySelectorAll('.is-over').forEach(item => item.classList.remove('is-over'));
    board.querySelectorAll('.is-drop-before').forEach(item => item.classList.remove('is-drop-before'));
    board.querySelectorAll('.is-drop-after').forEach(item => item.classList.remove('is-drop-after'));
  }

  function prepareDragPreview(card) {
    dragPreview.replaceChildren();
    const image = card.querySelector('img');
    if (image) dragPreview.append(image.cloneNode());
    dragPreview.style.width = `${card.offsetWidth}px`;
    return {
      x: Math.max(1, Math.round(card.offsetWidth / 2)),
      y: Math.max(1, Math.round((image?.offsetHeight || card.offsetHeight) / 2))
    };
  }

  function showDropPlacement(placement) {
    clearDropIndicators();
    if (!placement) return;
    const draggedCard = [...board.querySelectorAll('[data-tier-game]')]
      .find(card => card.dataset.tierGame === draggedId);
    const dropzone = placement.row.querySelector('.tier-dropzone');
    if (!draggedCard || !dropzone) return;
    const emptyMessage = dropzone.querySelector(':scope > p');
    if (emptyMessage) emptyMessage.hidden = true;
    if (!placement.card) {
      dropzone.append(draggedCard);
      return;
    }
    const reference = placement.side === 'after'
      ? placement.card.nextSibling
      : placement.card;
    if (reference !== draggedCard) dropzone.insertBefore(draggedCard, reference);
  }

  function selectColor(color) {
    const normalized = validColor(color);
    rowColor.value = normalized;
    colorPresets.querySelectorAll('[data-tier-color]').forEach(button => {
      const selected = button.dataset.tierColor.toLowerCase() === normalized.toLowerCase();
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function openRowSettings(id) {
    const row = rows.find(item => item.id === id);
    if (!row) return;
    editingRow = id;
    rowLabel.value = row.label;
    selectColor(row.color);
    rowDialog.showModal();
  }

  async function moveRow(id, direction) {
    const index = rows.findIndex(item => item.id === id);
    const next = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || next < 0 || next >= rows.length) return;

    const before = cloneRows(rows);
    [rows[index], rows[next]] = [rows[next], rows[index]];
    renderTierList();
    if (!await saveRows('Порядок рядов сохранён')) {
      rows = before;
      renderTierList();
    }
  }

  async function addRow(position) {
    const index = rows.findIndex(item => item.id === editingRow);
    if (index < 0) return;

    const before = cloneRows(rows);
    const insertAt = position === 'above' ? index : index + 1;
    rows.splice(insertAt, 0, {
      id: createRowId(),
      label: 'НОВАЯ',
      color: '#707070'
    });
    rowDialog.close();
    editingRow = '';
    renderTierList();

    if (!await saveRows('Новый ряд добавлен')) {
      rows = before;
      renderTierList();
    }
  }

  async function clearRowGames(id) {
    const movedGames = gamesInTier(id);
    if (!movedGames.length) {
      adminStatus.textContent = 'В этом ряду нет игр';
      return true;
    }

    const before = snapshotPositions();
    const pool = gamesInTier('');
    movedGames.forEach((game, index) => {
      game.tier_rank = '';
      game.tier_order = pool.length + index;
    });
    renderTierList();
    adminStatus.textContent = 'Очищаем ряд…';

    try {
      await persistGames(movedGames);
      adminStatus.textContent = 'Игры перемещены в «Без оценки»';
      return true;
    } catch (error) {
      restorePositions(before);
      renderTierList();
      adminStatus.textContent = error.message;
      return false;
    }
  }

  async function deleteRow() {
    const id = editingRow;
    const index = rows.findIndex(item => item.id === id);
    if (index < 0) return;

    rowDialog.close();
    if (!await clearRowGames(id)) return;

    const before = cloneRows(rows);
    rows.splice(index, 1);
    editingRow = '';
    renderTierList();
    if (!await saveRows('Ряд удалён')) {
      rows = before;
      renderTierList();
    }
  }

  async function open() {
    lastFocus = document.activeElement;
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    openButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('tier-open');
    await Promise.all([checkAdmin(), loadSettings()]);
    resetButton.hidden = !isAdmin;
    adminStatus.textContent = isAdmin
      ? 'Редактор · перетаскивайте обложки и меняйте ряды'
      : state.tierSchemaReady === false
        ? 'Нужно применить миграцию тир-листа'
        : 'Публичный просмотр';
    renderTierList();
    requestAnimationFrame(() => panel.classList.add('is-open'));
    closeButton.focus();
  }

  function close() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    openButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('tier-open', 'tier-game-dragging');
    clearDropIndicators();
    setTimeout(() => {
      panel.hidden = true;
      lastFocus?.focus();
    }, 280);
  }

  openButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  panel.addEventListener('click', event => {
    if (event.target.matches('[data-tier-close]')) close();
  });

  panel.addEventListener('dragover', event => {
    if (!draggedId || !isAdmin) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  });

  panel.addEventListener('drop', event => {
    if (draggedId && !event.target.closest('[data-tier]')) event.preventDefault();
  });

  board.addEventListener('dragstart', event => {
    const card = event.target.closest('[data-tier-game]');
    if (!card || !isAdmin) return;
    draggedId = card.dataset.tierGame;
    draggedPlacement = null;
    card.classList.add('is-dragging');
    card.setAttribute('aria-grabbed', 'true');
    document.body.classList.add('tier-game-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedId);
    const previewOffset = prepareDragPreview(card);
    event.dataTransfer.setDragImage(dragPreview, previewOffset.x, previewOffset.y);
  });

  board.addEventListener('dragend', event => {
    const card = event.target.closest('[data-tier-game]');
    card?.classList.remove('is-dragging');
    card?.setAttribute('aria-grabbed', 'false');
    draggedId = '';
    draggedPlacement = null;
    document.body.classList.remove('tier-game-dragging');
    clearDropIndicators();
    renderTierList();
  });

  board.addEventListener('dragover', event => {
    if (!draggedId || !isAdmin) return;
    const placement = getDropPlacement(event);
    if (!placement) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    draggedPlacement = placement;
    showDropPlacement(placement);
  });

  board.addEventListener('drop', async event => {
    if (!isAdmin) return;
    const id = draggedId || event.dataTransfer.getData('text/plain');
    const placement = draggedPlacement || getDropPlacement(event);
    if (!id || !placement) return;
    event.preventDefault();
    draggedPlacement = null;
    clearDropIndicators();
    await moveGame(id, placement.tier, placement.index);
  });

  board.addEventListener('click', async event => {
    const settings = event.target.closest('[data-row-settings]');
    const move = event.target.closest('[data-row-move]');
    if (settings) openRowSettings(settings.dataset.rowSettings);
    if (move) await moveRow(move.dataset.rowId, move.dataset.rowMove);
  });

  colorPresets.addEventListener('click', event => {
    const button = event.target.closest('[data-tier-color]');
    if (button) selectColor(button.dataset.tierColor);
  });
  rowColor.addEventListener('input', () => selectColor(rowColor.value));

  rowAddAboveButton?.addEventListener('click', () => addRow('above'));
  rowAddBelowButton?.addEventListener('click', () => addRow('below'));
  rowClearButton?.addEventListener('click', async () => {
    const id = editingRow;
    rowDialog.close();
    editingRow = '';
    await clearRowGames(id);
  });
  rowDeleteButton?.addEventListener('click', deleteRow);

  resetButton.addEventListener('click', () => resetDialog.showModal());
  document.getElementById('tierResetConfirm').addEventListener('click', async event => {
    event.preventDefault();
    if (!isAdmin) return;
    resetDialog.close();
    adminStatus.textContent = 'Сбрасываем…';
    const games = eligible();
    const beforeGames = snapshotPositions();
    const beforeRows = cloneRows(rows);
    games.forEach(game => {
      game.tier_rank = '';
      game.tier_order = 0;
    });

    try {
      await persistGames(games);
      rows = cloneRows(base);
      await persistRows();
      adminStatus.textContent = 'Тир-лист сброшен';
      renderTierList();
    } catch (error) {
      restorePositions(beforeGames);
      rows = beforeRows;
      adminStatus.textContent = error.message;
      renderTierList();
    }
  });

  rowSaveButton.addEventListener('click', async event => {
    event.preventDefault();
    const row = rows.find(item => item.id === editingRow);
    const label = rowLabel.value.trim();
    if (!row || !label) {
      rowLabel.focus();
      return;
    }

    const before = { ...row };
    row.label = label;
    row.color = validColor(rowColor.value);
    rowDialog.close();
    editingRow = '';
    renderTierList();
    if (!await saveRows('Настройки ряда сохранены')) {
      Object.assign(row, before);
      renderTierList();
    }
  });

  document.addEventListener('keydown', event => {
    if (
      event.key === 'Escape' &&
      !panel.hidden &&
      !rowDialog.open &&
      !resetDialog.open
    ) close();
  });
})();
