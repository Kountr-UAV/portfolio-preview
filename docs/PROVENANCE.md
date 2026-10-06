# Source selection, 6 October 2026

Both current repositories were inspected with GitHub branch discovery, fresh `git ls-remote` and commit/history inspection before editing. Each exposed only `main` at inspection. No separate `live` branch was found. The overhaul SHA mentioned in the brief is an ancestor commit of public main.

| Source | Commit | Tree | Author/date and role |
| --- | --- | --- | --- |
| Public `Kountr-UAV/portfolio-preview` main | `9beaa111eda0eb42581c62ed6b25b903d7492176` | `0bfe89d120ab31f889da3cb7e432fd32ac68b0d0` | Thomas, 5 October 2026 21:26:02 +01:00, final changes. Selected base. |
| Public overhaul | `43c032dd5c26592cdde8a0cf3e1f6784728777b7` | `ab2e44b41cc67d24864469a995a6aea5d46fad08` | Kountr-UAV, 5 October 2026 20:05:54 +01:00. Direct parent of selected base. |
| Private `Kountr-UAV/website-services` main | `b21b8da24938fc7d5671ffe67ceb45a3e7a11f03` | `3a817fec3fe03cfd92360ceb1a1d28ca21bb57d5` | 5 October 2026 07:30:11 UTC, documentation reconciliation, older source structure. Not imported. |

Public history runs from `7e7510f4033cf4060718143f20969637c6d4f2d9` through the overhaul to Thomas's final changes. The final commit changes ten files, adding the railway/footer, carousel and desk behavior and refining the public design. The four example routes share the preserved tree `7f3cbf0588fe7a3b6985fbf1b24cf96b4b9886d8` across the two latest public commits.

Private `AGENTS.md`, `operations-command.md`, shared learning and role context, cloud/toolkit/writing guidance, and relevant brief, component and visual-quality skills were read explicitly. Their dated public-preview statement still names `7e7510f4` and is superseded by the fresh remote evidence and delegated instruction for this task. No private draft or generated private landing was copied over the newer public design.

Review branch: `review/cloudflare-contact-2026-10-06`, created directly at selected public main. It changes only contact integration, deployment preparation, narrowly related description metadata, tests and supporting documentation. Existing demo/source assets and design scripts are retained byte-for-byte. All history is retained; no force push or merge is part of this task.

Read-only GitHub Pages metadata identified legacy deployment from public `main` at `/`, with no custom domain. A review branch push does not update that configured deployment source. External Cloudflare project settings/access are unverified, so no automatic Cloudflare integration or deployment is assumed.

The environment is the selected hosted Linux runner under `/workspace`, with no local Mac session dependency. Explicit guidance reading is confirmed. Automatic role discovery, effective configured model settings and independent visual approval are not claimed.

## Proposed reusable lesson

Source: fresh public/private refs and selected history on 6 October 2026. A dated operational record can lag a newer user-authored public overhaul. Before choosing a deployment base, verify both refs, parent commits and editable-source architecture. Verification standard: record full commit/tree SHAs, preserve the chosen parent history, and prove unchanged design/demo files by diff. This proposal grants no publishing, database or DNS authorization.
