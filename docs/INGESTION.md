# Enquiry ingestion contract

Aligned with the backend owner's parent-relayed contract on 6 October 2026. The backend task owns `Kountr-UAV/ajte-outreach-brain` and PostgreSQL. This task edits no outreach code and creates no database, D1, KV or independent lead store. PostgreSQL and public backend hosting are not yet provisioned. Contract mocks do not establish database delivery.

## Server-to-server request

The browser posts to same-origin `/api/contact`. After origin, bounded body, field and Turnstile validation, the Cloudflare Pages Function calls the configurable HTTPS `ENQUIRY_INGEST_URL`, whose approved path is `/api/ingest/enquiries`.

Headers:

```http
Content-Type: application/json
Authorization: Bearer <dedicated backend ingestion secret>
Idempotency-Key: <UUID v4>
```

JSON:

```json
{
  "name": "Example business",
  "email": "hello@example.com",
  "website": "https://example.com",
  "message": "Please improve our website.",
  "sourceUrl": "https://portfolio.example/",
  "marketingConsent": false
}
```

The contract permits optional `company`; the current compact form collects name or business in `name` and omits `company`. Empty optional website is omitted. `sourceUrl` comes from the configured portfolio origin, not a browser-supplied owner or source identifier. The UUID is a header only, not an extra JSON field. The adapter forwards no owner/account ID, qualification/enrollment request, IP address, Turnstile token or internal credential in JSON.

Adapter limits: name 1 to 120 trimmed characters, email at most 254 with basic syntax validation, optional website at most 2,048 characters with http/https and no URL credentials, message 1 to 2,000 trimmed characters, boolean marketing consent, body at most 16 KiB. Backend validation remains authoritative. No mail-domain or paid email verification service is called.

## Durable response

The backend returns this response only after its PostgreSQL transaction has persisted the enquiry:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
```

```json
{ "id": "enquiry_identifier", "status": "received" }
```

An unchanged duplicate request must return the same durable record ID. Same key with changed content must fail safely rather than overwriting or silently accepting different content. The Function validates HTTP 202, `status: "received"` and a non-empty bounded safe identifier, then returns `202 {"ok":true,"reference":"enquiry_identifier"}` to the browser. Generic accepted/queued responses, empty 2xx bodies, wrong status, redirects, malformed JSON, timeouts and failures cannot display saved success. Responses are not cached.

Backend `429` yields a generic one-minute retry instruction; all other backend failures currently yield a generic 502 without leaking internal errors. Browser validation errors are shown at fields, with focus on the first invalid field. An ambiguous timeout keeps the original UUID for an idempotent retry with a fresh Turnstile token. Editing the enquiry creates a new UUID. No persistent browser storage is used.

## Ownership and suppression

The backend fixes the account owner from configuration, rather than trusting the request. It records an inbound enquiry, not a qualified prospect or permission to contact anyone else. Contact handling and the optional marketing preference are separate purposes. `marketingConsent: false` is not a new opt-out mutation, and `true` must never clear an existing suppression or automatically enroll outreach. The backend owner records durable receipt and any consent audit information according to its approved policy. This adapter does not send messages or start the existing worker/scanner.

Before contact enablement the backend owner must verify authenticated scope, durable idempotency under concurrency, persisted record lookup, prior suppression preservation for both marketing choices, and distributed abuse/rate limits. Turnstile, a honeypot, request/field limits and browser cooldown are implemented here; browser cooldown is not a server rate limit. No in-memory counter is presented as distributed protection.

The user's existing GPT cloud batch preference and $0.50/day paid API ceiling remain separate from this contact path. No paid always-on worker or API job is configured here. Hosting budget and backend hosting authorization remain unresolved.
