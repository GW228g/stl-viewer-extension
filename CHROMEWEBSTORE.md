# Chrome Web Store — Permissions & Policy Tracking

This file tracks what the extension requests, why, and what it discloses to
Chrome Web Store review — kept in sync with `manifest.json`. Whenever a
permission is added, removed, or the reason for one changes, update this file
in the same commit as the manifest change.

For marketing copy (descriptions, category, screenshots), see
[docs/chrome-web-store-listing.md](docs/chrome-web-store-listing.md). This
file is specifically the permissions/privacy compliance record.

---

## Single purpose

> This extension adds a "View in 3D" button to Google Classroom and Google
> Drive whenever an STL file can't be previewed, so a teacher can inspect the
> 3D model directly in the browser without downloading it.

---

## Permissions in `manifest.json`

No `permissions` array — only `host_permissions`. No `storage`, `activeTab`,
`scripting`, `tabs`, or any other API permission is requested.

### `host_permissions`

| Host pattern | Why it's needed |
|---|---|
| `https://classroom.google.com/*` | Detect STL submissions on Classroom assignment pages and inject the "View in 3D" button when Classroom can't preview the file. |
| `https://drive.google.com/*` | Detect unsupported STL files on Drive's own file preview page, and fetch the file's bytes (via the user's existing session) for rendering. |
| `https://drive.usercontent.google.com/*` | Drive serves the actual file bytes for a download from this domain (distinct from `drive.google.com`); required for the background fetch to succeed without a CORS error. |
| `https://docs.google.com/*` | Classroom and Drive sometimes embed the file preview in a `docs.google.com` iframe; needed so the same detection/viewer logic runs inside that frame. |
| `https://*.googleusercontent.com/*` | Drive serves some file content and preview iframes from `googleusercontent.com` subdomains; required for the background fetch to succeed without a CORS error. |

### `background` (service worker)

`background.js` fetches the STL file's bytes on behalf of the content script.
This runs outside any web page specifically to bypass the CORS restrictions
that block a content-script fetch across Google's domains — see
[background.js](background.js). It only ever fetches the one URL the content
script resolves for the file being previewed; no other requests are made.

### Content script matches

Deliberately narrower than `host_permissions` — no `drive.usercontent.google.com`
or `*.googleusercontent.com` entry, since the content script never needs to
run on those domains directly; it only needs the background worker to be
*permitted* to fetch from them.

```json
"matches": [
  "https://classroom.google.com/*",
  "https://drive.google.com/*",
  "https://docs.google.com/*"
]
```

---

## Data usage disclosure (Privacy practices tab)

| Category | Collected/used? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No — see note below |

**Note on "Website content":** the extension reads one file's binary content
(the STL being previewed) transiently, in the browser's memory, purely to
render it. It is never stored, logged, or transmitted anywhere — not to
Maker404, not to any third party. There is no backend server for this
extension at all. See the full [privacy policy](docs/privacy-policy.md).

**Certification:** this extension does not sell or transfer user data to
third parties, and does not use or transfer data for purposes unrelated to
its single purpose.

---

## Remote code

None. No `eval`, no remotely hosted or dynamically fetched JavaScript. All
code ships in the extension package (`content.js`, `background.js`).

---

## Change log

Update this section whenever `host_permissions` changes.

- **2026-09-29** — Added `https://drive.usercontent.google.com/*` (file
  bytes are served from this domain, distinct from `drive.google.com`).
- **2026-09-17** — Removed `https://*.google.com/*` and
  `https://*.googleapis.com/*`; neither was actually used by any fetch in
  the code, and broad host permissions like these are a common cause of
  delay in Chrome Web Store review.
- **2026-09-16** — Initial `host_permissions` set at v1.0.0–v1.2.0:
  `classroom.google.com`, `drive.google.com`, `docs.google.com`,
  `*.google.com`, `*.googleapis.com`, `*.googleusercontent.com`.
