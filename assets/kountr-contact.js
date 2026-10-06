const form = document.querySelector('#contact-form');
if (form) {
  const button = form.querySelector('[data-contact-submit]');
  const status = form.querySelector('#contact-status');
  const error = form.querySelector('#contact-error');
  const fields = Object.fromEntries(['name', 'email', 'website', 'message'].map(name => [name, form.elements.namedItem(name)]));
  let token = '';
  let widget;
  let busy = false;
  let sent = false;
  let submissionId = crypto.randomUUID();
  let cooldownUntil = 0;
  let cooldownTimer;
  const unavailable = 'The form is currently unavailable. Please email services@kountr.co.uk.';

  function showError(message, focus = false) {
    error.textContent = message;
    error.hidden = false;
    if (focus) error.focus();
  }
  function updateButton() { button.disabled = busy || sent || !token || Date.now() < cooldownUntil; }
  function clearErrors() {
    error.hidden = true;
    for (const [name, field] of Object.entries(fields)) {
      field.removeAttribute('aria-invalid');
      form.querySelector(`#${name}-error`).hidden = true;
    }
  }
  function fieldErrors(errors) {
    let first;
    for (const [name, message] of Object.entries(errors)) {
      if (!fields[name]) continue;
      const hint = form.querySelector(`#${name}-error`);
      hint.textContent = message;
      hint.hidden = false;
      fields[name].setAttribute('aria-invalid', 'true');
      first ||= fields[name];
    }
    first?.focus();
    return Boolean(first);
  }
  function collect() {
    return {
      submissionId,
      name: fields.name.value.trim(), email: fields.email.value.trim(),
      website: fields.website.value.trim(), message: fields.message.value.trim(),
      marketingConsent: form.elements.marketingConsent.checked,
      companyFax: form.elements.companyFax.value,
      turnstileToken: token
    };
  }
  function validate(value) {
    const errors = {};
    if (!value.name || value.name.length > 120) errors.name = 'Add your name or business, up to 120 characters.';
    if (!fields.email.validity.valid || !value.email || value.email.length > 254) errors.email = 'Add a valid email address so we can reply.';
    if (!value.message || value.message.length > 2000) errors.message = 'Add a short note, up to 2,000 characters.';
    if (value.website) {
      try {
        const url = new URL(value.website);
        if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password || value.website.length > 2048) throw new Error();
      } catch { errors.website = 'Use a complete http:// or https:// website address, or leave it empty.'; }
    }
    return errors;
  }
  form.addEventListener('input', () => {
    clearErrors();
    // A changed enquiry is a new submission. An unchanged retry keeps its idempotency key.
    submissionId = crypto.randomUUID();
  });
  form.addEventListener('change', () => { submissionId = crypto.randomUUID(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || sent) return;
    clearErrors();
    const value = collect();
    const errors = validate(value);
    if (Object.keys(errors).length) { showError('Check the highlighted fields.'); fieldErrors(errors); return; }
    if (Date.now() < cooldownUntil) { showError('Please wait a minute before trying again.', true); return; }
    if (!token) { showError('Complete the security check before sending.', true); return; }
    busy = true;
    updateButton();
    form.setAttribute('aria-busy', 'true');
    // Freeze fields while a request is pending, preserving the submitted content on failure.
    for (const field of form.querySelectorAll('input, textarea')) field.readOnly = true;
    for (const field of form.querySelectorAll('input[type=checkbox]')) field.disabled = true;
    status.textContent = 'Sending your enquiry…';
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', credentials: 'same-origin', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value), signal: AbortSignal.timeout(25_000)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || typeof result.reference !== 'string' || !result.reference) {
        if (response.status === 429) {
          cooldownUntil = Date.now() + 60_000;
          clearTimeout(cooldownTimer);
          cooldownTimer = setTimeout(updateButton, 60_000);
        }
        const focused = result.fields && fieldErrors(result.fields);
        showError(typeof result.error === 'string' ? result.error : 'We could not confirm your message was saved. Retry or email services@kountr.co.uk.', !focused);
        status.textContent = 'Your notes are still here.';
        return;
      }
      sent = true;
      status.textContent = `Your enquiry has been saved. Reference: ${result.reference}. This does not book a call.`;
      status.tabIndex = -1;
      status.focus();
    } catch {
      status.textContent = 'Your notes are still here.';
      showError('We could not confirm your message was saved. Retry or email services@kountr.co.uk.', true);
    } finally {
      busy = false;
      form.removeAttribute('aria-busy');
      for (const field of form.querySelectorAll('input, textarea')) field.readOnly = sent;
      for (const field of form.querySelectorAll('input[type=checkbox]')) field.disabled = sent;
      token = '';
      if (widget !== undefined && !sent) window.turnstile?.reset(widget);
      updateButton();
    }
  });

  async function initialize() {
    try {
      const response = await fetch('/api/contact-config', { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error();
      const config = await response.json();
      const privacy = new URL(config.privacyNoticeUrl);
      if (config.ok !== true || typeof config.siteKey !== 'string' || !config.siteKey || privacy.origin !== location.origin) throw new Error();
      form.querySelector('[data-privacy-link]').href = privacy.href;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      const loaded = new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
      document.head.append(script);
      await Promise.race([loaded, new Promise((_, reject) => setTimeout(reject, 10_000))]);
      widget = window.turnstile.render('#contact-security', {
        sitekey: config.siteKey, action: 'portfolio_contact', size: 'flexible',
        callback: value => { token = value; if (error.hidden && !busy && !sent) status.textContent = 'Ready to send your enquiry.'; updateButton(); },
        'expired-callback': () => { token = ''; status.textContent = 'Complete a new security check before sending.'; updateButton(); },
        'error-callback': () => { token = ''; status.textContent = 'The security check is unavailable. Please retry or email services@kountr.co.uk.'; updateButton(); }
      });
      if (!token) status.textContent = 'Complete the security check before sending.';
    } catch { status.textContent = unavailable; updateButton(); }
  }
  initialize();
}
