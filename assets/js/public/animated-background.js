(() => {
  const backdrop = document.getElementById('animatedBackdrop');
  const canvas = document.getElementById('backdropEmbers');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!backdrop || !canvas || reducedMotion.matches) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let particles = [];
  let animationFrame = 0;
  let lastTime = performance.now();

  function createParticle(randomY = true) {
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : height + 12,
      radius: .6 + Math.random() * 1.8,
      speed: 7 + Math.random() * 16,
      drift: -5 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      alpha: .15 + Math.random() * .55
    };
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = width < 760 ? 12 : Math.min(32, Math.max(18, Math.round(width / 58)));
    particles = Array.from({ length: count }, () => createParticle());
  }

  function draw(time) {
    const delta = Math.min((time - lastTime) / 1000, .05);
    lastTime = time;
    context.clearRect(0, 0, width, height);

    particles.forEach((particle, index) => {
      particle.y -= particle.speed * delta;
      particle.x += (particle.drift + Math.sin(time / 1300 + particle.phase) * 4) * delta;
      if (particle.y < -16 || particle.x < -20 || particle.x > width + 20) particles[index] = createParticle(false);

      const glow = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 5);
      glow.addColorStop(0, `rgba(255, 126, 66, ${particle.alpha})`);
      glow.addColorStop(.25, `rgba(230, 55, 34, ${particle.alpha * .72})`);
      glow.addColorStop(1, 'rgba(125, 12, 8, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * 5, 0, Math.PI * 2);
      context.fill();
    });

    animationFrame = requestAnimationFrame(draw);
  }

  function setPaused(paused) {
    backdrop.classList.toggle('is-paused', paused);
    cancelAnimationFrame(animationFrame);
    if (!paused) {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(draw);
    }
  }

  resize();
  animationFrame = requestAnimationFrame(draw);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
})();
