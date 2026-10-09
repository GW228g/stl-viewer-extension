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

**Open decision before submitting:** the optional Print checklist (a printable
student list) is a second feature. The Store's single-purpose policy is judged on
the extension's stated purpose, so either widen it, e.g. "Help teachers review and
plan 3D-print submissions in Google Classroom: preview STL files, and list who
submitted which file", or ship the checklist as a separate extension. Not decided.

---

## Permissions in `manifest.json`

### `permissions`

| Permission | Why it's needed |
|---|---|
| `storage` | Remembers two true/false switches (`rosterEnabled`, `rosterDebug`) for the optional features, via `chrome.storage.sync`. Nothing else is ever stored — no names, files or models. Adding it shows no new warning at install or update. |

No `activeTab`, `scripting`, `tabs`, `downloads`, `clipboardWrite` or other API
permission is requested. (The popup reloads the active tab only if it is a
Classroom tab, which the existing host permission already covers.)

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

### `action` (toolbar popup)

`roster/popup.html` — the settings popup with the two switches. It has no network
access and shows nothing from Classroom.

### Content script 2 and `web_accessible_resources` (optional features)

A second content script, Classroom pages only, loads `roster/anonymize.js`,
`debug.js`, `scrape.js` and `launch.js`. Until the teacher turns a switch
on they do nothing visible and read nothing from the page (they only keep a hidden
button and a timer waiting). `roster/print.html` is web-accessible to `classroom.google.com` only, so
the Classroom tab can open the checklist page; it accepts data only from the tab that
opened it, checked by origin. None of this code makes a network request.

### Content script matches (View in 3D)

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
| Personally identifiable information | Not collected or transmitted. See the Print checklist note |
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
extension at all. The only thing it can write is a PNG of the current view,
created on the user's device and downloaded by the browser when the user
clicks Save PNG; it is never sent anywhere. See the full
[privacy policy](docs/privacy-policy.md).

**Note on the Print checklist (optional, off by default):** when the teacher
switches it on and clicks its button, the extension reads student names, submission
status and attachment names, plus the class name and assignment title, from the Student
work page they are looking at. They are held in memory in the teacher's browser to
build one printable list, never stored and never transmitted. The Store's definition of
"collect" should be re-read at submission time; the cautious answer is to disclose that
student names are *handled locally* and say plainly that nothing leaves the browser.
Not decided; not submitting yet.

**Browser storage:** `chrome.storage.sync` holds only `{ "rosterEnabled": bool,
"rosterDebug": bool }`. Chrome may sync those two values through the teacher's Google
account like any extension setting.

**Certification:** this extension does not sell or transfer user data to
third parties, and does not use or transfer data for purposes unrelated to
its single purpose.

---

## Remote code

None. No `eval`, no remotely hosted or dynamically fetched JavaScript. All
code ships in the extension package (`content.js`, `background.js`, `roster/*.js`).

---

## Change log

Update this section whenever a permission or other manifest entry changes.

- **2026-10-09** — Added the `storage` permission, a toolbar popup (`action`), a
  second content script on `classroom.google.com` (`roster/*.js`) and
  `web_accessible_resources` for `roster/print.html`, all for the optional Print
  checklist. Host permissions unchanged.
- **2026-09-29** — Added `https://drive.usercontent.google.com/*` (file
  bytes are served from this domain, distinct from `drive.google.com`).
- **2026-09-17** — Removed `https://*.google.com/*` and
  `https://*.googleapis.com/*`; neither was actually used by any fetch in
  the code, and broad host permissions like these are a common cause of
  delay in Chrome Web Store review.
- **2026-09-16** — Initial `host_permissions` set at v1.0.0–v1.2.0:
  `classroom.google.com`, `drive.google.com`, `docs.google.com`,
  `*.google.com`, `*.googleapis.com`, `*.googleusercontent.com`.
