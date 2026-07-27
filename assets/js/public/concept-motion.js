(() => {
  const toggle = document.getElementById('conceptFilterToggle');
  const panel = document.getElementById('advancedFilters');
  if (toggle && panel) {
    const close = () => { panel.hidden = true; toggle.setAttribute('aria-expanded','false'); };
    toggle.addEventListener('click',event => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded',String(!panel.hidden));
    });
    panel.addEventListener('click',event => {
      if (event.target.closest('[data-filter]')) close();
      event.stopPropagation();
    });
    document.addEventListener('click',close);
    document.addEventListener('keydown',event => { if (event.key === 'Escape') close(); });
  }

  const actions = document.querySelectorAll('.concept-action');
  if (!('IntersectionObserver' in window)) {
    actions.forEach(item => item.classList.add('is-shown'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-shown');
      observer.unobserve(entry.target);
    });
  },{ threshold:.18 });
  actions.forEach((item,index) => {
    item.style.setProperty('--concept-delay',`${index * 90}ms`);
    observer.observe(item);
  });
})();
