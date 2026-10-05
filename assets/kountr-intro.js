(() => {
  const root = document.documentElement;
  const intro = document.querySelector('[data-brand-intro]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!intro || !root.classList.contains('intro-pending')) return;

  const skip = intro.querySelector('[data-intro-skip]');
  const previousFocus = document.activeElement;
  const content = [...document.querySelectorAll('.skip-link, .site-header, main, .site-footer')]
    .filter(element => !element.inert);
  let leaveTimer;
  let finishTimer;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    const restoreFocus = intro.contains(document.activeElement);
    clearTimeout(window.kountrIntroFallback);
    clearTimeout(leaveTimer);
    clearTimeout(finishTimer);
    root.classList.remove('intro-pending', 'intro-running');
    intro.hidden = true;
    content.forEach(element => {
      element.inert = false;
      element.removeAttribute('data-intro-inert');
    });
    document.removeEventListener('keydown', onKeydown);
    motion.removeEventListener('change', onMotionChange);
    window.removeEventListener('pagehide', finish);
    if (restoreFocus) {
      skip.blur();
      if (previousFocus instanceof HTMLElement && previousFocus !== document.body) {
        previousFocus.focus({ preventScroll: true });
      }
    }
  }

  function leave() {
    if (finished || intro.classList.contains('is-leaving')) return;
    intro.classList.add('is-leaving');
    finishTimer = setTimeout(finish, 700);
  }

  function onKeydown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      intro.classList.add('is-keyboard');
      skip.focus({ preventScroll: true });
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finish();
    }
  }

  function onMotionChange() {
    if (motion.matches) finish();
  }

  // Never cover the site when motion is disabled or the intro CSS fails to load.
  if (motion.matches || getComputedStyle(intro).position !== 'fixed') {
    finish();
    return;
  }

  content.forEach(element => {
    element.inert = true;
    element.setAttribute('data-intro-inert', '');
  });
  intro.hidden = false;
  root.classList.add('intro-running');
  skip.focus({ preventScroll: true });
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', onKeydown);
  motion.addEventListener('change', onMotionChange);
  window.addEventListener('pagehide', finish);
  intro.addEventListener('animationend', event => {
    if (event.target === intro && event.animationName === 'intro-exit') finish();
  });
  leaveTimer = setTimeout(leave, 2700);
})();
