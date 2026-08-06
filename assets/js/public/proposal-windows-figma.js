(() => {
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  const mediaPanel = document.getElementById('mediaPanel');
  const suggestionForm = document.getElementById('suggestionForm');
  const mediaForm = document.getElementById('mediaForm');
  const steamInput = document.getElementById('suggestionSteamUrl');
  const previewButton = document.getElementById('suggestionPreviewButton');
  const mediaInput = document.getElementById('mediaFileInput');
  const mediaTitleInput = document.getElementById('mediaSubmissionTitle');
  const dropzone = document.getElementById('mediaDropzone');
  if (!suggestionsPanel || !mediaPanel) return;

  suggestionsPanel.classList.add('is-figma-proposal');
  mediaPanel.classList.add('is-figma-proposal');

  if (suggestionForm && !suggestionForm.querySelector('.figma-duration-field')) {
    const label = suggestionForm.querySelector('label[for="suggestionComment"]');
    const field = document.createElement('div');
    field.className = 'figma-duration-field';
    field.innerHTML = `
      <span class="figma-field-label">Приблизительное время прохождения</span>
      <div class="figma-duration-row">
        <input aria-label="Минимальное время прохождения" min="1" placeholder="Мин" type="number">
        <span>—</span>
        <input aria-label="Максимальное время прохождения" min="1" placeholder="Макс" type="number">
      </div>`;
    label?.before(field);
  }

  if (mediaForm && !mediaForm.querySelector('.figma-proposal-title')) {
    const title = document.createElement('h3');
    title.className = 'figma-proposal-title';
    title.textContent = 'Предложить фото/видео';
    mediaForm.prepend(title);
  }

  if (dropzone) {
    const strong = dropzone.querySelector('strong');
    const hint = dropzone.querySelector('span');
    if (strong) strong.textContent = 'Выбрать файл';
    if (hint) hint.textContent = 'или выбери';
  }

  if (dropzone && !mediaForm?.querySelector('.figma-file-label')) {
    const fileLabel = document.createElement('span');
    fileLabel.className = 'figma-field-label figma-file-label';
    fileLabel.textContent = 'Прикрепить файл';
    dropzone.before(fileLabel);
  }

  if (mediaForm && !mediaForm.querySelector('.figma-media-category-field')) {
    const category = document.createElement('div');
    category.className = 'figma-media-category-field';
    category.innerHTML = `
      <span class="figma-field-label">Категория</span>
      <div class="figma-media-categories" role="group" aria-label="Категория материала">
        <button class="active" data-category="personal" type="button">Личное</button>
        <button data-category="creative" type="button">Творчество</button>
        <button data-category="internet" type="button">Интернет</button>
      </div>`;
    dropzone?.after(category);
    category.addEventListener('click', event => {
      const button = event.target.closest('button[data-category]');
      if (!button) return;
      category.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      mediaForm.dataset.category = button.dataset.category || 'personal';
    });
    mediaForm.dataset.category = 'personal';
  }

  function fillMediaTitleFromFile() {
    if (!mediaTitleInput || mediaTitleInput.value.trim()) return;
    const file = mediaInput?.files?.[0];
    if (!file) return;
    mediaTitleInput.value = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Материал для стрима';
    mediaTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  mediaInput?.addEventListener('change', () => window.setTimeout(fillMediaTitleFromFile, 0));
  dropzone?.addEventListener('drop', () => window.setTimeout(fillMediaTitleFromFile, 30));

  function openSuggestions() {
    suggestionsPanel.hidden = false;
    suggestionsPanel.setAttribute('aria-hidden', 'false');
    suggestionsPanel.querySelector('[data-suggestions-panel="rating"]')?.setAttribute('hidden', '');
    suggestionsPanel.querySelector('[data-suggestions-panel="submit"]')?.removeAttribute('hidden');
    document.documentElement.classList.add('suggestions-open');
    window.setTimeout(() => steamInput?.focus(), 30);
  }

  function openMedia() {
    mediaPanel.hidden = false;
    mediaPanel.setAttribute('aria-hidden', 'false');
    mediaPanel.querySelector('[data-media-view="published"]')?.setAttribute('hidden', '');
    mediaPanel.querySelector('[data-media-view="upload"]')?.removeAttribute('hidden');
    document.documentElement.classList.add('media-open');
  }

  document.querySelectorAll('.proposal-desk-trigger').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault();
      if (trigger.dataset.proposalTab === 'media') openMedia();
      else openSuggestions();
    });
  });

  let timer = 0;
  steamInput?.addEventListener('input', () => {
    clearTimeout(timer);
    if (!/store\.steampowered\.com\/app\/\d+/i.test(steamInput.value)) return;
    timer = window.setTimeout(() => previewButton?.click(), 450);
  });
})();
