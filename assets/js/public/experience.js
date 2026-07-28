(() => {
  const progress = document.getElementById('scrollProgress');
  const catalog = document.getElementById('catalog');
  const catalogToolbar = catalog?.querySelector('.catalog-toolbar');
  const catalogLink = document.querySelector('.nav-link[href="#catalog"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;

  function updatePageState() {
    frame = 0;
    const scrollable = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1,Math.max(0,window.scrollY / scrollable));
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    document.body.classList.toggle('has-scrolled',window.scrollY > 24);
    if (catalog && catalogToolbar) {
      const compactStart = catalog.offsetTop + 140;
      const compactEnd = catalog.offsetTop + catalog.offsetHeight - catalogToolbar.offsetHeight;
      catalogToolbar.classList.toggle('is-compact',window.scrollY > compactStart && window.scrollY < compactEnd);
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(updatePageState);
  }

  if (catalog && catalogLink && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      catalogLink.classList.toggle('is-current',entries.some(entry => entry.isIntersecting));
    },{ rootMargin: '-20% 0px -65%',threshold: 0 });
    observer.observe(catalog);
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click',event => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target || reducedMotion) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth',block: 'start' });
      history.replaceState(null,'',hash);
    });
  });

  window.addEventListener('scroll',scheduleUpdate,{ passive: true });
  window.addEventListener('resize',scheduleUpdate,{ passive: true });
  updatePageState();
})();
