# Kountr portfolio Cloudflare preparation

This review branch preserves Thomas's newest public portfolio at `9beaa111eda0eb42581c62ed6b25b903d7492176`. It prepares the static site for Cloudflare Pages and replaces the local-only brief with a secure enquiry form. Nothing has been deployed, no database has been provisioned and real persistence is unverified. Contact collection is disabled by default.

The editable source is this repository's root `index.html`, `assets/` and `examples/`, not the older private Astro draft. The four complete examples, intro, desk, carousel and railway footer remain from the selected source. See [source provenance](docs/PROVENANCE.md), [backend contract](docs/INGESTION.md), [deployment dependencies](docs/CLOUDFLARE.md) and [validation](qa/README.md).

## Build and checks

Use Node 24.19.0 and npm 11.9.0. Development dependencies are pinned in `package-lock.json`. The build itself uses only Node's standard library, with no framework migration or new browser runtime dependency.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
WRANGLER_SEND_METRICS=false npm run check:cloudflare
npm run test:browser
```

`dist/` contains only the explicitly allowed static files. Functions are compiled separately from `functions/` with their server-only library in `lib/`. Documentation, tests, package files and configuration are excluded from static output. `404.html` prevents an unknown API path falling back to the portfolio HTML. `_routes.json` limits Function invocation to the two contact routes. Existing robots and noindex settings remain suitable for review until launch is approved.

Browser checks require a Linux Chromium executable, default `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation. They use local static serving with mocked Turnstile and contact responses. No paid AI/API requests are used. To run Pages locally after building:

```sh
WRANGLER_SEND_METRICS=false npm run dev
```

On a restricted runner, point npm's cache and Wrangler's log/config directories to writable task directories with `--cache`, `WRANGLER_LOG_PATH` and `XDG_CONFIG_HOME`. Never move authentication caches to this project.

## Contact behavior

Required name, reply email and project message are validated in the browser and again by the Pages Function. Website is optional. Marketing consent is a separate unchecked choice; sending an enquiry is not a marketing subscription or a booked call. The backend preserves existing suppression and owns persistence.

Notes remain available after failure, rate limiting or an ambiguous timeout. An unchanged retry retains its UUID idempotency key and performs a new security check. Success requires the backend's explicit durable receipt. The form reports unavailability while backend, Turnstile or approved privacy configuration is missing. Email links are visitor-controlled fallbacks; this task sends no email.

## Tooling provenance

| Tool | Pin | Source / licence | Scope |
| --- | --- | --- | --- |
| Playwright Test | 1.63.0 | [Microsoft Playwright](https://github.com/microsoft/playwright), Apache-2.0, package LICENSE and NOTICE retained by npm | Development browser checks only |
| Wrangler | 4.148.0 | [Cloudflare workers-sdk](https://github.com/cloudflare/workers-sdk/tree/main/packages/wrangler), MIT OR Apache-2.0 package declaration | Local Pages compilation and emulation only |
| axe-core Playwright | 4.13.0 | [Deque axe-core-npm](https://github.com/dequelabs/axe-core-npm), MPL-2.0 | Development accessibility checks only |
| Turnstile | Cloudflare hosted API | [Official integration documentation](https://developers.cloudflare.com/turnstile/get-started/) | Loads only when collection is enabled and fully configured; provider terms/privacy need launch review |

Tool packages were inspected and installed with lifecycle scripts disabled. Node, Chromium and the existing portfolio assets were supplied by the cloud runner/repository. No runtime component kit, external skill installer or analytics was adopted. Existing asset/font notices are preserved in `licenses/`.
