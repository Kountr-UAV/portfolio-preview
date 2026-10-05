(() => {
  const viewport = document.querySelector('.railway-window');
  if (!viewport) return;
  const train = viewport.querySelector('.railway-train');
  const original = train.querySelector('.train-set');
  const toggle = document.querySelector('[data-train-toggle]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let copies = [];
  let cycle = 0;
  let position = 0;
  let frame = 0;
  let lastTime = 0;
  let visible = false;
  let paused = false;
  let hovered = false;
  let touching = false;
  let resumeAfter = 0;

  function measure() {
    cycle = original.getBoundingClientRect().width;
    position = viewport.scrollLeft;
  }

  function tick(time) {
    const elapsed = lastTime ? Math.min(time - lastTime, 50) : 0;
    lastTime = time;
    const focused = viewport.contains(document.activeElement);
    const previewOpen = document.documentElement.classList.contains('portfolio-open');
    if (!paused && !hovered && !touching && !focused && !previewOpen && time > resumeAfter && cycle) {
      position = (position + elapsed * .025) % cycle;
      viewport.scrollLeft = position;
    } else {
      position = viewport.scrollLeft;
    }
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (visible && !motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function configure() {
    copies.forEach(copy => copy.remove());
    copies = [];
    measure();
    if (!motion.matches && cycle) {
      // Enough repeated trains to cover the screen even on ultrawide displays.
      const count = Math.ceil(viewport.clientWidth / cycle);
      for (let index = 0; index < count; index++) {
        const copy = original.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });
        train.append(copy);
        copies.push(copy);
      }
    }
    toggle.hidden = motion.matches;
    measure();
    updatePlayback();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.innerHTML = paused ? 'Play train <span aria-hidden="true">▷</span>' : 'Pause train <span aria-hidden="true">Ⅱ</span>';
  });
  viewport.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; });
  viewport.addEventListener('pointerleave', () => { hovered = false; });
  viewport.addEventListener('pointerdown', () => { touching = true; });
  const release = () => {
    if (!touching) return;
    touching = false;
    resumeAfter = performance.now() + 2500;
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  viewport.addEventListener('wheel', () => { resumeAfter = performance.now() + 2500; }, { passive: true });
  addEventListener('resize', configure);
  document.addEventListener('visibilitychange', updatePlayback);
  motion.addEventListener('change', configure);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      updatePlayback();
    }).observe(viewport);
  } else {
    visible = true;
  }
  configure();
})();
