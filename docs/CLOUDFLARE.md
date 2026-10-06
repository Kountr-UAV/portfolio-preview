# Cloudflare Pages deployment preparation

Prepared for a static HTML portfolio with two Pages Functions. No Astro/Next.js adapter or Node server is needed for the selected public source. No live deployment, account creation, DNS, credentials, persistent access, spending or email action has occurred.

The proposed `wrangler.jsonc` name `kountr-portfolio` is a reviewable placeholder, not evidence of an existing account/project. Parent owns Cloudflare authorization, account/project discovery, safe deployment scope, any credential permissions or charges, PostgreSQL provider choice and backend linkage. Parent later reported that the user connected Cloudflare and its installed manifest declares executor MCP `cloudflare` at `https://mcp.cloudflare.com/mcp`, with `requires_executor=true`. This runner's current callable tool metadata contains no Cloudflare tools or tool-search capability, and read-only `codex mcp list --json` exits successfully with an empty server list. Consequently no account/zone/project list could be performed here. This is an executor tool-availability blocker, not evidence of failed authorization or a reason to request reconnection. No authentication caches were inspected or copied.

## Reviewable build settings

| Setting | Value |
| --- | --- |
| Framework | None, standalone static HTML |
| Repository root | `/` |
| Node | 24.19.0 |
| Install | `npm ci --ignore-scripts` |
| Build | `npm run build` |
| Static output | `dist` |
| Function source | repository-root `functions/` |
| Compatibility date | 2026-10-06 |
| Function routes | `/api/contact`, `/api/contact-config` only |
| D1/KV/database binding | None |

Wrangler's Pages configuration becomes project configuration on deployment. For an existing project, first read its actual settings through authorized access and reconcile the file rather than overwriting them with this preparation. Preview and production each explicitly default `CONTACT_ENABLED` to `false`. Their environment variables need separate approved values; do not bind arbitrary preview branches to the production backend or reuse its ingestion token.

## Required environment values

| Name | Visibility and purpose |
| --- | --- |
| `CONTACT_ENABLED` | Server configuration, `false` until gates below are complete |
| `PORTFOLIO_ORIGIN` | Server configuration, exact approved HTTPS origin such as `https://portfolio.example`, no path; must match the incoming request origin |
| `ENQUIRY_INGEST_URL` | Server configuration, approved HTTPS URL ending `/api/ingest/enquiries`; not exposed in public config; no query/credentials/fragment |
| `ENQUIRY_INGEST_TOKEN` | Dedicated server secret, scoped only to backend enquiry ingestion |
| `TURNSTILE_SECRET_KEY` | Server secret for Siteverify |
| `TURNSTILE_SITE_KEY` | Public widget key; restrict its allowed hostnames to approved portfolio hosts |
| `PRIVACY_NOTICE_URL` | Approved HTTPS privacy-notice URL on the exact portfolio origin |

Secrets must be supplied through approved Cloudflare secret management, with only needed privileges. None belongs in GitHub, browser assets, static output, screenshots, chat or ordinary public vars. No credentials were requested, generated or saved. `.env*` and `.dev.vars*` are ignored as a guard, not proof of safety.

`GET /api/contact-config` exposes only the public Turnstile key and privacy URL when all configuration is present. Requests fail closed otherwise. The widget is explicitly rendered with `portfolio_contact` action; the server validates action and hostname as well as Siteverify success. Siteverify receives the Cloudflare connection IP when available, but the IP is not forwarded to the enquiry database. Fetches reject redirects and have bounded timeouts. The adapter never logs request contents or secrets.

## Contact and publication gates

1. Parent establishes authorized Cloudflare account/project, intended preview/production scope and any costs. No paid hosting budget is approved.
2. Backend owner provisions the chosen shared PostgreSQL service and ingestion endpoint under separate authorization. Verify the exact contract, rate limiting, durable idempotency and opt-out preservation. Test a synthetic enquiry through the real Function and confirm its database record before claiming delivery.
3. Owner approves and publishes a complete privacy notice, with legal controller identity/contact, enquiry lawful basis, retention policy or criteria, hosting/processor recipients and transfers/safeguards, applicable rights, withdrawal/objection route and ICO complaint information. The inline notice is a purpose summary, not a substitute for those unresolved facts. Collection cannot be enabled without an approved URL. Update notice/version evidence in the backend when approved.
4. Configure approved production and preview origins, scoped ingestion and Turnstile secrets, widget host restrictions and approved privacy URL. Validate the real widget, delivery and failure path. Enable only the reviewed environment after these checks.
5. Obtain independent visual/functional acceptance, then review publication separately. This implementation's screenshots and automated checks are not independent design approval. Keep review noindex/robots rules until production indexing is explicitly reviewed.
6. Review domain migration and rollback separately. Preserve Namecheap nameservers, Railway apex/www records, Google MX and the existing site/mail path until the migration is authorized. No DNS, Google settings or Railway services are changed here. The production hostname must be confirmed instead of inferred from historical documentation.

Start with a separately authorized preview using an isolated backend test scope or keep contact disabled. Do not upload repository root as static content. Dashboard drag-and-drop is not this Function deployment path; use approved Git integration or an authorized Wrangler Pages deployment after project settings are reconciled. No deployment command was run in this task.

## Official references checked on 6 October 2026

- [Cloudflare Pages Functions configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), including `pages_build_output_dir`, source-of-truth behavior and environment configuration.
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) and [explicit client rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/). Tokens must be verified server-side and are single-use.
- [ICO privacy information guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/). Owner-specific privacy facts remain unresolved; this is a launch dependency, not a legal-compliance certification.
