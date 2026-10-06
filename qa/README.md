# Cloud preparation validation, 6 October 2026

Implementation checks by this task in the selected hosted Linux environment. These results support review; they do not grant independent visual approval, establish a live deployment or prove database persistence.

## Passed checks

| Check | Result / scope |
| --- | --- |
| `npm run build` | Static allowlist output built successfully, no framework migration |
| `npm run check` | 43 public files and 55 local navigation/asset links verified; server/config/docs excluded; noindex retained |
| `npm test` | 11 server contract/security tests passed, including durable 202 receipt, idempotent duplicate, malformed response, HTTP failure and thrown timeout |
| `npm run check:cloudflare` | Wrangler 4.148.0 compiled the Pages Function successfully with no account login or deployment |
| `npm run test:browser` | 22 checks passed in Chromium 151.0.7922.173 on Debian 13 with Playwright 1.63.0 |
| axe-core 4.13.0 | Zero WCAG A/AA/2.1 AA violations in scoped enquiry normal and validation-error states |
| Local Wrangler Pages emulation | `/` 200 with configured headers; config GET 503; contact GET 405; disabled contact POST 503; missing route, README and Function source URL each 404 |
| Diff/prose review | `git diff --check` passed; newly authored docs and contact messages contain no em dashes; retained source copy was not globally rewritten |

Browser coverage includes widths 320, 375, 599, 600, 767, 768, 899, 900, 1024 and 1440 CSS pixels, 900px height. Screenshots capture the complete enquiry section, not just its viewport. Checks cover document overflow, navigation anchors, all four example previews and their return links, Escape/focus return, required/URL validation with focus and aria-invalid, optional unchecked marketing choice, loading and duplicate-submit prevention, retained notes after failure, unchanged retry UUID, success focus, network failure and malformed response, rate-limit cooldown, unavailable configuration, security expiration/failure, no JavaScript, reduced motion, normal intro/carousel pause and 375x812 touch interaction. The keyboard-submit and axe check uses the default 1440x1000 viewport.

Turnstile and the contact endpoint are mocked in browser checks. Server tests replace outbound Siteverify/ingestion fetches. Only synthetic values such as `hello@example.com` appear in evidence. No enquiry was sent to a real backend and no email was sent. No paid AI/API calls were made. The real widget, record write/readback, concurrent distributed idempotency, suppression behavior and backend abuse limits await the backend/hosting owner.

## Review evidence

- [320px contact](screenshots/contact-320.png), [375px contact](screenshots/contact-375.png), [768px contact](screenshots/contact-768.png), [1024px contact](screenshots/contact-1024.png), [1440px contact](screenshots/contact-1440.png).
- [Validation-error state](screenshots/validation-desktop.png), [confirmed mock success](screenshots/success-desktop.png), [normal-motion carousel state](screenshots/desktop-motion.png).
- Breakpoint-edge captures at 599, 600, 767, 899 and 900px are in [screenshots](screenshots/).

The implementation review inspected desktop/mobile form screenshots for alignment, wrapping and clipping. This task preserves source design and has not approved its own visual changes. Parent should arrange independent functional/visual acceptance before publication. Other browsers, real mobile devices and full assistive-technology testing remain unverified.

## Corrections verified

A first browser run found that the refreshed security token after a failed write replaced the retained-notes status with the generic ready status. The callback now preserves visible failure feedback and the retry test passes. Screenshot review also prompted a distinct green focus outline on an invalid field, while other invalid fields retain a red border; the browser test checks both first-field focus and outline colour. The no-JavaScript assertion was changed to inspect the rendered fallback paragraph inside `noscript`; no source fallback change was needed. The initial Wrangler log path was unavailable on this runner, so final checks used a writable `/tmp` log directory and telemetry disabled. Function compilation and local emulation then passed; no authentication files were moved.

## Provenance checks

Selected parent is Thomas's final public commit `9beaa111eda0eb42581c62ed6b25b903d7492176`. Demo tree remains `7f3cbf0588fe7a3b6985fbf1b24cf96b4b9886d8`. All existing design CSS, intro/carousel/desk/railway scripts, images, fonts, example HTML and license files are unchanged. Only root contact markup/handler and related description metadata changed among existing source files. New contact files, build/Pages preparation, tests and review evidence are separate additions. Full history and tree selection are recorded in [provenance](../docs/PROVENANCE.md).

See [deployment gates](../docs/CLOUDFLARE.md) and [ingestion contract](../docs/INGESTION.md) for remaining blockers. No source, infrastructure, DNS or mailbox changes were made in the outreach, private website-services, Railway, Namecheap or Google systems.
