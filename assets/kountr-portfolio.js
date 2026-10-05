(() => {
  const browser = document.querySelector('[data-portfolio-browser]');
  if (!browser || typeof browser.showModal !== 'function') return;

  const frame = browser.querySelector('iframe');
  const address = browser.querySelector('[data-browser-address]');
  const closeButton = browser.querySelector('[data-browser-close]');
  const root = document.documentElement;
  const home = new URL('index.html', location.href);
  let opener;

  function close() {
    if (browser.open) browser.close();
  }

  // Delegate so the carousel's repeated cards open the same previews.
  document.addEventListener('click', event => {
      const link = event.target.closest?.('a[data-portfolio]');
      if (!link) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      address.textContent = `kountr / ${link.dataset.projectName}`;
      browser.setAttribute('aria-label', `${link.dataset.projectName} website preview`);
      frame.title = `${link.dataset.projectName} portfolio website`;
      frame.src = link.href;
      browser.showModal();
      root.classList.add('portfolio-open');
      closeButton.focus({ preventScroll: true });
  });

  closeButton.addEventListener('click', close);
  browser.addEventListener('click', event => {
    if (event.target !== browser) return;
    const bounds = browser.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  browser.addEventListener('close', () => {
    root.classList.remove('portfolio-open');
    frame.removeAttribute('src');
    opener?.focus({ preventScroll: true });
  });

  frame.addEventListener('load', () => {
    if (!browser.open) return;
    let page;
    try {
      page = frame.contentDocument;
    } catch {
      return;
    }
    if (!page) return;

    // The examples' own return links close this preview and keep the parent's place.
    page.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = new URL(link.href);
      if (target.origin === home.origin && (target.pathname === home.pathname || target.pathname === new URL('.', home).pathname)) {
        event.preventDefault();
        close();
      }
    });
    page.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (page.querySelector('dialog[open], [aria-modal="true"]:not([hidden])')) return;
      event.preventDefault();
      close();
    });
  });

  addEventListener('pagehide', close);
})();
