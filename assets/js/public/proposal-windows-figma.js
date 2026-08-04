(() => {
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  const mediaPanel = document.getElementById('mediaPanel');
  const suggestionForm = document.getElementById('suggestionForm');
  const mediaForm = document.getElementById('mediaForm');
  const steamInput = document.getElementById('suggestionSteamUrl');
  const previewButton = document.getElementById('suggestionPreviewButton');
  if (!suggestionsPanel || !mediaPanel) return;

  suggestionsPanel.classList.add('is-figma-proposal');
  mediaPanel.classList.add('is-figma-proposal');

  if (suggestionForm && !suggestionForm.querySelector('.figma-duration-field')) {
    const label = suggestionForm.querySelector('label[for="suggestionComment"]');
    const field = document.createElement('div');
    field.className = 'figma-duration-field';
    field.innerHTML = '<span class="figma-field-label">Приблизительное время прохождения</span><div class="figma-duration-row"><input min="1" placeholder="От" type="number"><span>—</span><input min="1" placeholder="До" type="number"></div>';
    label?.before(field);
  }

  if (mediaForm && !mediaForm.querySelector('.figma-proposal-title')) {
    const title = document.createElement('h3');
    title.className = 'figma-proposal-title';
    title.textContent = 'Предложить фото/видео';
    mediaForm.prepend(title);
    const dropzone = document.getElementById('mediaDropzone');
    const category = document.createElement('div');
    category.className = 'figma-media-category-field';
    category.innerHTML = '<span class="figma-field-label">Категория</span><div class="figma-media-categories"><button class="active" type="button">Геймплей</button><button type="button">Творчество</button><button type="button">Интернет</button></div>';
    dropzone?.after(category);
    category.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      category.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
    });
  }

  function openSuggestions() {
    suggestionsPanel.hidden = false;
    suggestionsPanel.setAttribute('aria-hidden', 'false');
    suggestionsPanel.querySelector('[data-suggestions-panel="rating"]')?.setAttribute('hidden', '');
    suggestionsPanel.querySelector('[data-suggestions-panel="submit"]')?.removeAttribute('hidden');
    document.documentElement.classList.add('suggestions-open');
    steamInput?.focus();
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
    timer = setTimeout(() => previewButton?.click(), 450);
  });
})();
