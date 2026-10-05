(() => {
  const viewport = document.querySelector('.portfolio-carousel');
  if (!viewport) return;
  const track = viewport.querySelector('.portfolio-grid');
  const toggle = document.querySelector('[data-carousel-toggle]');
  const cards = [...track.children];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let copies = [];
  let cycle = 0;
  let frame = 0;
  let lastTime = 0;
  let visible = false;
  let hovered = false;
  let paused = false;
  let touching = false;
  let resumeAfter = 0;
  let position = 0;

  function measure() {
    cycle = copies.length ? copies[0].offsetLeft - cards[0].offsetLeft : 0;
    position = viewport.scrollLeft;
  }

  function tick(time) {
    const elapsed = lastTime ? Math.min(time - lastTime, 50) : 0;
    lastTime = time;
    const focused = viewport.contains(document.activeElement);
    const previewOpen = document.documentElement.classList.contains('portfolio-open');
    if (!paused && !hovered && !touching && !focused && !previewOpen && time > resumeAfter && cycle) {
      // Accumulate fractional pixels so slow movement stays smooth on every display.
      position = (position + elapsed * .026) % cycle;
      viewport.scrollLeft = position;
    } else {
      position = viewport.scrollLeft;
    }
    frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    lastTime = 0;
    if (!motion.matches && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function configure() {
    copies.forEach(card => card.remove());
    copies = [];
    if (!motion.matches) {
      copies = cards.map(card => {
        const copy = card.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        copy.tabIndex = -1;
        track.append(copy);
        return copy;
      });
    }
    toggle.hidden = motion.matches;
    measure();
    updatePlayback();
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Play carousel' : 'Pause carousel';
  });
  viewport.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovered = true; });
  viewport.addEventListener('pointerleave', () => { hovered = false; });
  viewport.addEventListener('pointerdown', () => { touching = true; });
  const release = () => { touching = false; resumeAfter = performance.now() + 2500; };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  viewport.addEventListener('wheel', () => { resumeAfter = performance.now() + 2500; }, { passive: true });
  viewport.addEventListener('keydown', () => { resumeAfter = performance.now() + 2500; });
  addEventListener('resize', measure);
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
