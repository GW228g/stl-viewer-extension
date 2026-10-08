# Chrome Web Store Listing — Prep Sheet

Copy-paste source for the Developer Dashboard forms. Character counts are
called out where the Store enforces a limit — verify against the live form,
since Store limits/fields do drift over time.

**Current for v1.4.2** (2026-10-08). Update the feature list below whenever a
release adds or changes a user-visible feature.

---

## Package to upload

`stl-viewer-extension.zip` from the
[v1.4.2 release](https://github.com/GW228g/stl-viewer-extension/releases/tag/v1.4.2)
(manifest, `content.js`, `background.js`, `icons/`). The manifest version
must be higher than whatever was last uploaded to the Store.

---

## Short description (132 characters max)

```
Preview student STL files in Google Classroom instantly — no downloads, no Tinkercad, no slicer needed.
```
*(103 characters)*

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
• Floating geometry detection — runs the moment the viewer opens and shows
  its status in the toolbar (checking, all clear, or a warning when a part
  hangs in the air instead of touching the print bed), so you can catch
  print failures before they happen
• Model dimensions — width × depth × height in mm, in print orientation, so
  you know at a glance whether it fits your printer's bed
• Volume and estimated weight — cm³ and approximate grams of PLA or PETG at
  an infill you choose (10%–100%), to help budget filament for a class set
• Auto-orient — sets each model on the grid the way it would sit on your
  print bed, using Tinkercad's own orientation: a lighthouse stands up and
  a flat keychain lies flat
• Save PNG — export the current view as an image, with the dimensions,
  weight estimate and floating-geometry result in the header, named after
  the student's file (e.g. "Cool Boat-screenshot.png") to send back as
  feedback
• Nothing stored, nothing tracked — the file is loaded into memory only to
  render it, and is discarded the moment you close the viewer (the only
  thing ever saved is a PNG you choose to export). No accounts, no
  analytics, no ads, no data ever leaves your browser.

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

## Permission justifications & data usage disclosure

Moved to [CHROMEWEBSTORE.md](../CHROMEWEBSTORE.md) at the repo root, which
tracks permissions, their justifications, and the data usage disclosure
answers alongside `manifest.json` so the two stay in sync as permissions
change. Copy the relevant text from there into the dashboard's Privacy
practices tab.

---

## Screenshots

- [docs/screenshot.jpg](screenshot.jpg) — 3DBenchy at exactly 1280×800, ready
  to upload as-is. Shows the grid floor, dimensions, volume and weight with
  the PLA/PETG and infill selectors, and the green "No floating geometry"
  pill.
- [docs/screenshot-floating.jpg](screenshot-floating.jpg) — also exactly
  1280×800. A keychain whose "STL" letters hover above the plate, with the
  orange "Floating geometry detected" warning in the toolbar. This is a
  purpose-built demo model, not a student file:
  [docs/demo-floating-keychain.stl](demo-floating-keychain.stl) is the exact
  file, so you can upload it to Drive and see the warning yourself. The
  extension UI in the image is the real one.
  Suggested caption: "Catch letters and parts that aren't attached to the
  print bed before they fail."

Upload the Benchy shot first so it's the main image, then this one.
