export const MAX_BODY_BYTES = 16_384;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = value => typeof value === 'string' ? value.trim() : '';

export function validateEnquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { form: 'Check the form and try again.' } };
  const errors = {};
  const name = text(input.name);
  const email = text(input.email);
  const website = text(input.website);
  const message = text(input.message);
  if (!name || name.length > 120) errors.name = 'Add your name or business, up to 120 characters.';
  if (!EMAIL.test(email) || email.length > 254) errors.email = 'Add a valid email address so we can reply.';
  if (!message || message.length > 2000) errors.message = 'Add a short note, up to 2,000 characters.';
  if (website) {
    try {
      const url = new URL(website);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password || website.length > 2048) throw new Error();
    } catch { errors.website = 'Use a complete http:// or https:// website address, or leave it empty.'; }
  }
  if (!UUID.test(input.submissionId || '')) errors.form = 'Refresh the page and try again.';
  if (typeof input.marketingConsent !== 'boolean') errors.form = 'Check your choices and try again.';
  return {
    errors,
    value: { submissionId: input.submissionId, name, email, website, message, marketingConsent: input.marketingConsent }
  };
}

export function configured(env) {
  try {
    const origin = new URL(env.PORTFOLIO_ORIGIN);
    const backend = new URL(env.ENQUIRY_INGEST_URL);
    const privacy = new URL(env.PRIVACY_NOTICE_URL);
    return env.CONTACT_ENABLED === 'true' && origin.protocol === 'https:' && origin.href === `${origin.origin}/`
      && backend.protocol === 'https:' && !backend.username && !backend.password && !backend.hash && !backend.search
      && privacy.protocol === 'https:' && privacy.origin === origin.origin && !privacy.username && !privacy.password
      && Boolean(env.ENQUIRY_INGEST_TOKEN && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY);
  } catch { return false; }
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...extraHeaders
  } });
}

async function readLimited(stream, limit) {
  if (!stream) return '';
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError('Body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function handleContact(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Use the enquiry form to send a message.' }, 405, { Allow: 'POST' });
  if (!configured(env)) return json({ ok: false, error: 'The form is currently unavailable. Please email services@kountr.co.uk.' }, 503);
  const origin = new URL(env.PORTFOLIO_ORIGIN).origin;
  if (new URL(request.url).origin !== origin || request.headers.get('Origin') !== origin) return json({ ok: false, error: 'Refresh the page and try again.' }, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) return json({ ok: false, error: 'Use the enquiry form to send a message.' }, 415);
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) return json({ ok: false, error: 'Your message is too long.' }, 413);
  let input;
  try { input = JSON.parse(await readLimited(request.body, MAX_BODY_BYTES)); }
  catch (error) { return json({ ok: false, error: error instanceof RangeError ? 'Your message is too long.' : 'Check the form and try again.' }, error instanceof RangeError ? 413 : 400); }
  if (input?.companyFax !== '') return json({ ok: false, error: 'We could not verify this submission.' }, 400);
  const { value, errors } = validateEnquiry(input);
  if (Object.keys(errors).length) return json({ ok: false, error: 'Check the highlighted fields.', fields: errors }, 422);
  if (typeof input.turnstileToken !== 'string' || !input.turnstileToken || input.turnstileToken.length > 2048) return json({ ok: false, error: 'Complete the security check and try again.' }, 400);
  try {
    // Siteverify tokens are single-use. Never forward a token or an IP address to the lead database.
    const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: input.turnstileToken, remoteip: request.headers.get('CF-Connecting-IP') || undefined })
    });
    if (!verification.ok) throw new Error('Verification unavailable');
    const verified = JSON.parse(await readLimited(verification.body, 8192));
    if (verified.success !== true || verified.hostname !== new URL(origin).hostname || verified.action !== 'portfolio_contact') return json({ ok: false, error: 'Complete a new security check and try again.' }, 400);
    const upstream = await fetcher(env.ENQUIRY_INGEST_URL, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ENQUIRY_INGEST_TOKEN}`, 'Idempotency-Key': value.submissionId },
      body: JSON.stringify({ name: value.name, email: value.email, website: value.website || undefined, message: value.message, sourceUrl: new URL('/', origin).href, marketingConsent: value.marketingConsent })
    });
    if (upstream.status === 429) return json({ ok: false, error: 'Too many attempts. Please wait a minute before trying again.' }, 429, { 'Retry-After': '60' });
    // Success is the ingestion service's durable transaction acknowledgement, never just a 2xx.
    if (upstream.status !== 202) throw new Error('Ingestion failed');
    const saved = JSON.parse(await readLimited(upstream.body, 8192));
    if (saved.status !== 'received' || typeof saved.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(saved.id)) throw new Error('No persistence acknowledgement');
    return json({ ok: true, reference: saved.id }, 202);
  } catch {
    // An ambiguous timeout may have committed. Keep the submission ID for an idempotent retry.
    return json({ ok: false, error: 'We could not confirm your message was saved. Your notes are still here. Retry or email services@kountr.co.uk.' }, 502);
  }
}
