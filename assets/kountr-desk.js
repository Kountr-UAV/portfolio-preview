(() => {
  const hero = document.querySelector('.desk-hero');
  if (!hero) return;
  const stage = hero.querySelector('.desk-stage');
  const book = hero.querySelector('.notebook');
  const paper = hero.querySelector('.notepad-scene');
  const paperLink = paper.querySelector('a');
  const cue = hero.querySelector('.desk-scroll-cue');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const mix = (from, to, t) => from + (to - from) * t;
  let geometry;
  let frame = 0;

  function render() {
    frame = 0;
    if (motion.matches || !geometry) return;
    const { start, distance, width, bookWidth, bookHeight, endWidth, endHeight, small } = geometry;
    const progress = clamp((scrollY - start) / distance);
    const pull = ease((progress - .035) / .39);
    const grow = ease((progress - .48) / .40);
    const fade = ease((progress - .51) / .24);
    const side = width * (small ? .255 : .25);
    const paperWidth = bookWidth * .88;
    const paperHeight = bookHeight * .89;
    const sideScale = small ? .69 : .94;
    const paperX = mix(mix(bookWidth * .10, side, pull), 0, grow);
    const paperY = mix(mix(-bookHeight * .035, 8, pull), 0, grow);
    const paperScale = mix(mix(1, sideScale, pull), 1, grow);

    book.style.transform = `translate(calc(-50% + ${-side * pull - width * .12 * grow}px), -50%) rotate(${mix(-6, -11, pull)}deg) scale(${mix(1, small ? .72 : .94, pull)})`;
    book.style.opacity = String(1 - fade);
    paper.style.width = `${mix(paperWidth, endWidth, grow)}px`;
    paper.style.height = `${mix(paperHeight, endHeight, grow)}px`;
    paper.style.setProperty('--sheet-inset', `${mix(14, small ? 22 : Math.min(42, width * .03), grow)}px`);
    paper.style.setProperty('--headline-size', `${Math.min(mix(paperWidth, endWidth, grow) * (small ? .105 : .087), mix(paperHeight, endHeight, grow) * .16)}px`);
    paper.style.transform = `translate(calc(-50% + ${paperX}px), calc(-50% + ${paperY}px)) rotate(${mix(mix(-6, 5, pull), 0, grow)}deg) scale(${paperScale})`;
    // Keep the sheet behind the cover until it has cleared the notebook.
    paper.style.zIndex = progress > .45 ? '3' : '1';
    cue.style.opacity = String(1 - ease(progress / .18));
    // Hidden controls must not receive keyboard focus under the cover.
    paperLink.tabIndex = progress < .38 ? -1 : 0;
  }

  function measure() {
    hero.classList.toggle('is-scroll-scene', !motion.matches);
    if (motion.matches) {
      [book, paper, cue].forEach(element => element.removeAttribute('style'));
      paperLink.removeAttribute('tabindex');
      geometry = null;
      return;
    }
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const small = width < 700;
    const bookWidth = Math.min(small ? 320 : 410, width * (small ? .65 : .34), height * .51);
    const bookHeight = bookWidth / .81;
    book.style.width = `${bookWidth}px`;
    geometry = {
      start: hero.getBoundingClientRect().top + scrollY,
      distance: hero.offsetHeight - height,
      width, height, bookWidth, bookHeight, small,
      endWidth: Math.min(1120, width - (small ? 32 : 112)),
      endHeight: Math.min(780, height * (small ? .78 : .80))
    };
    render();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  measure();
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure);
  addEventListener('pageshow', measure);
  motion.addEventListener('change', measure);
})();
