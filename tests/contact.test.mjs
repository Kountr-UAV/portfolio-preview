import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, validateEnquiry, configured } from '../lib/contact.js';
import { onRequest as configRequest } from '../functions/api/contact-config.js';
const env = {
  CONTACT_ENABLED: 'true', PORTFOLIO_ORIGIN: 'https://portfolio.example',
  ENQUIRY_INGEST_URL: 'https://outreach.example/api/ingest/enquiries',
  ENQUIRY_INGEST_TOKEN: 'test-only-ingest-token', TURNSTILE_SECRET_KEY: 'test-only-turnstile-secret',
  TURNSTILE_SITE_KEY: 'test-only-public-key', PRIVACY_NOTICE_URL: 'https://portfolio.example/privacy.html'
};
const input = {
  submissionId: '3fb3b4a9-9903-4ffa-8d24-0c2515ff3a14', name: 'Example business', email: 'hello@example.com',
  website: 'https://example.com', message: 'Please improve our site.',
  marketingConsent: false, companyFax: '', turnstileToken: 'mock-token'
};
const request = (data = input, headers = {}, method = 'POST') => new Request('https://portfolio.example/api/contact', {
  method, headers: { Origin: env.PORTFOLIO_ORIGIN, 'Content-Type': 'application/json', ...headers },
  ...(method === 'POST' ? { body: typeof data === 'string' ? data : JSON.stringify(data) } : {})
});
const verify = (extra = {}) => Response.json({ success: true, hostname: 'portfolio.example', action: 'portfolio_contact', ...extra });

test('disabled or incomplete configuration fails closed, including privacy notice', async () => {
  for (const key of Object.keys(env)) assert.equal(configured({ ...env, [key]: '' }), false, key);
  const res = await handleContact(request(), { ...env, CONTACT_ENABLED: 'false' }, () => { throw new Error('Must not fetch'); });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).ok, false);
});
test('rejects wrong origin, method, content type, malformed and oversized bodies before external calls', async () => {
  const cases = [
    [request(input, { Origin: 'https://attacker.example' }), 403],
    [request(input, { Origin: '' }), 403], [request(undefined, {}, 'GET'), 405],
    [request(input, { 'Content-Type': 'text/plain' }), 415], [request('{'), 400],
    [request(' '.repeat(17000)), 413], [request(input, { 'Content-Length': '17000' }), 413]
  ];
  for (const [req, code] of cases) assert.equal((await handleContact(req, env, () => { throw new Error('Must not fetch'); })).status, code);
});
test('validates required fields, bounds, strict booleans, UUID and safe website protocols', () => {
  for (const value of ['', '   ', 'x'.repeat(121)]) assert(validateEnquiry({ ...input, name: value }).errors.name);
  for (const value of ['', 'bad', 'x'.repeat(255) + '@example.com']) assert(validateEnquiry({ ...input, email: value }).errors.email);
  for (const value of ['', 'x'.repeat(2001)]) assert(validateEnquiry({ ...input, message: value }).errors.message);
  for (const value of ['javascript:alert(1)', 'ftp://example.com', 'https://user:password@example.com']) assert(validateEnquiry({ ...input, website: value }).errors.website);
  assert.deepEqual(validateEnquiry({ ...input, website: '' }).errors, {});
  assert(validateEnquiry({ ...input, marketingConsent: 'true' }).errors.form);
  assert(validateEnquiry({ ...input, submissionId: 'invalid' }).errors.form);
  for (const value of [null, [], 'bad']) assert(validateEnquiry(value).errors.form);
});
test('honeypot and invalid form cannot reach backend or claim success', async () => {
  for (const [data, code] of [[{ ...input, companyFax: 'bot' }, 400], [{ ...input, email: 'bad' }, 422], [{ ...input, turnstileToken: '' }, 400]]) {
    assert.equal((await handleContact(request(data), env, () => { throw new Error('Must not fetch'); })).status, code);
  }
});
test('requires valid single-use Turnstile result, action and hostname', async () => {
  for (const failure of [{ success: false }, { hostname: 'attacker.example' }, { action: 'other' }]) {
    let calls = 0;
    assert.equal((await handleContact(request(), env, async () => { calls++; return verify(failure); })).status, 400);
    assert.equal(calls, 1);
  }
});
test('forwards only bounded enquiry contract with server token and stable idempotency key', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options]);
    return calls.length === 1 ? verify() : Response.json({ status: 'received', id: 'enquiry_123' }, { status: 202 });
  };
  const response = await handleContact(request({ ...input, source: 'attacker', unknown: 'ignored' }), env, fetcher);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, reference: 'enquiry_123' });
  const [url, options] = calls[1];
  assert.equal(url, env.ENQUIRY_INGEST_URL);
  assert.equal(options.headers.Authorization, `Bearer ${env.ENQUIRY_INGEST_TOKEN}`);
  assert.equal(options.headers['Idempotency-Key'], input.submissionId);
  assert.equal(options.redirect, 'error');
  const payload = JSON.parse(options.body);
  assert.equal(payload.sourceUrl, 'https://portfolio.example/');
  assert.equal(payload.marketingConsent, false);
  for (const key of ['unknown', 'turnstileToken', 'companyFax', 'remoteip', 'Authorization']) assert(!(key in payload));
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('accepts durable duplicate acknowledgement for an idempotent retry', async () => {
  let calls = 0;
  const res = await handleContact(request(), env, async () => ++calls === 1 ? verify() : Response.json({ status: 'received', id: 'existing_enquiry' }, { status: 202 }));
  assert.equal(res.status, 202);
});
test('upstream failures, false acknowledgements, redirects, invalid JSON and timeouts never succeed', async () => {
  const failures = [
    () => new Response('failure', { status: 500 }), () => new Response(null, { status: 204 }),
    () => Response.json({ status: 'received' }, { status: 202 }),
    () => Response.json({ status: 'queued', id: 'x' }, { status: 202 }),
    () => Response.json({ status: 'received', id: '<script>' }, { status: 202 }),
    () => Response.json({ status: 'received', id: 'x' }, { status: 200 }),
    () => new Response('invalid', { status: 202 }),
    () => new Response(null, { status: 302 }), () => { throw new Error('Timeout'); }
  ];
  for (const failure of failures) {
    let calls = 0;
    const res = await handleContact(request(), env, async () => ++calls === 1 ? verify() : failure());
    assert.equal(res.status, 502);
    assert.equal((await res.json()).ok, false);
  }
});
test('upstream throttling returns a bounded retry instruction without leaking backend response', async () => {
  let calls = 0;
  const res = await handleContact(request(), env, async () => ++calls === 1 ? verify() : new Response('private backend detail', { status: 429 }));
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '60');
  assert(!(await res.text()).includes('private backend'));
});
test('verification outage prevents ingestion', async () => {
  let calls = 0;
  const res = await handleContact(request(), env, async () => { calls++; return new Response('down', { status: 503 }); });
  assert.equal(res.status, 502);
  assert.equal(calls, 1);
});
test('public configuration exposes only the site key and approved privacy URL', async () => {
  const res = configRequest({ request: new Request('https://portfolio.example/api/contact-config'), env });
  assert.deepEqual(await res.json(), { ok: true, siteKey: env.TURNSTILE_SITE_KEY, privacyNoticeUrl: env.PRIVACY_NOTICE_URL });
  assert.equal(configRequest({ request: new Request('https://other.example/api/contact-config'), env }).status, 403);
});
