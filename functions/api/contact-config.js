import { configured, json } from '../../lib/contact.js';
export const onRequest = ({ request, env }) => {
  if (request.method !== 'GET') return json({ ok: false }, 405, { Allow: 'GET' });
  if (!configured(env)) return json({ ok: false }, 503);
  if (new URL(request.url).origin !== new URL(env.PORTFOLIO_ORIGIN).origin) return json({ ok: false }, 403);
  return json({ ok: true, siteKey: env.TURNSTILE_SITE_KEY, privacyNoticeUrl: env.PRIVACY_NOTICE_URL });
};
