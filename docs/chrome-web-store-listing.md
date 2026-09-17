# Chrome Web Store Listing — Prep Sheet

Copy-paste source for the Developer Dashboard forms. Character counts are
called out where the Store enforces a limit — verify against the live form,
since Store limits/fields do drift over time.

---

## Short description (132 characters max)

```
Preview student STL files in Google Classroom instantly — no downloads, no Tinkercad, no slicer needed.
```
*(106 characters)*

---

## Detailed description

```
Stop downloading STL files one at a time to check them.

STL Viewer for Google Classroom adds a "View in 3D" button wherever Google
Classroom shows "No preview available" for a student's STL submission.
Click it, and a full-screen interactive 3D viewer opens right in your
browser — rotate, zoom, and check the model before it ever reaches a printer.

Built by a Tech Ed teacher running a 3D printing unit with 30 students
submitting Tinkercad keychains through Google Classroom — reviewing each one
by downloading it first was the actual problem this solves.

FEATURES

• Instant 3D preview — no downloading, no opening Tinkercad, no slicer
• Grid floor — instantly see if any part of a model is floating above the
  print bed instead of touching it
• Floating geometry detection — automatic warning when disconnected mesh
  pieces are found, so you can catch print failures before they happen
• Model dimensions — width × depth × height in mm, in print orientation, so
  you know at a glance whether it fits your printer's bed
• Auto-orient — detects how the model was exported and lays it flat
  automatically, regardless of how a student's Tinkercad export came out
• Save PNG — export the current view (with dimensions and warnings) as an
  image to send back to a student as feedback
• Nothing stored, nothing tracked — the file is loaded into memory only to
  render it, and is discarded the moment you close the viewer. No accounts,
  no analytics, no ads, no data ever leaves your browser.

WHO IT'S FOR

Any teacher running a 3D printing or CAD unit with Tinkercad, Fusion 360, or
any other tool that exports STL files, and collecting submissions through
Google Classroom.

PRIVACY

This extension does not collect, store, or transmit any data. Full privacy
policy: https://maker404.com/stl-viewer-privacy

Built by Maker404 — free tools for K-12 makers and tech educators.
https://maker404.com
```

---

## Category

Suggested: **Productivity** (or **Tools**, depending on what the dashboard
offers at submission time — Chrome Web Store category options change
periodically, so pick whichever is closest to those two when you're actually
in the form).

---

## Single purpose description

(Required field — one or two sentences stating the extension's one job.)

```
This extension adds a "View in 3D" button to Google Classroom and Google
Drive whenever an STL file can't be previewed, so a teacher can inspect the
3D model directly in the browser without downloading it.
```

---

## Permission justifications

Chrome Web Store requires a plain-language reason for each host permission.
Suggested text per entry in `host_permissions`:

**`https://classroom.google.com/*`**
```
Required to detect STL file submissions on Google Classroom assignment pages
and inject the "View in 3D" button when Classroom cannot preview the file.
```

**`https://drive.google.com/*`**
```
Required to detect unsupported STL files on Google Drive's own file preview
page, and to fetch the file's bytes (using the user's existing session) so it
can be rendered in the in-browser 3D viewer.
```

**`https://docs.google.com/*`**
```
Google Classroom and Drive sometimes embed the file preview in a
docs.google.com iframe; this permission lets the same detection and viewer
logic run inside that embedded frame.
```

**`https://*.googleusercontent.com/*`**
```
Google Drive serves some file content and preview iframes from
googleusercontent.com subdomains; this permission is required for the
background fetch of the file's bytes to succeed without a CORS error.
```

---

## Data usage disclosure (Privacy practices tab)

For each category the dashboard asks about ("Does your extension collect or
use this type of data?"), the honest answer here is **No** for all of them —
personally identifiable information, health info, financial info,
authentication info, personal communications, location, web history, user
activity, and website content. The extension reads one file's binary content
transiently, in-memory, and never stores or transmits it anywhere.

You'll need to check the certification box confirming this disclosure is
accurate, and that the extension doesn't sell or transfer user data to third
parties.

---

## Screenshots

- [docs/screenshot.jpg](screenshot.jpg) — already in the repo, shows the
  viewer's toolbar, grid floor, and a rendered model. Chrome Web Store wants
  1280×800 or 640×400; check the current screenshot's dimensions and crop/
  resize if needed before uploading.
- Consider a second screenshot showing the floating-geometry warning badge,
  since that's a standout feature reviewers/teachers will want to see.
