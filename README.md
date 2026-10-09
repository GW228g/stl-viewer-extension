# STL Viewer for Google Classroom

![Version](https://img.shields.io/badge/version-1.5.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-brightgreen)
![Chrome Extension](https://img.shields.io/badge/platform-Chrome-yellow?logo=googlechrome&logoColor=white)
![Status](https://img.shields.io/badge/status-developer%20mode%20only-orange)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

Preview student STL files directly in Google Classroom without downloading them. Built for Tech Ed teachers running 3D printing units with Tinkercad.

When a student submits an STL file and Google Classroom shows "No preview available," this extension adds a **View in 3D** button. Click it to open a full-screen interactive 3D viewer — rotate, zoom, and check for floating geometry before sending anything to a printer.

![STL Viewer showing 3DBenchy standing on a grid floor, with triangle count, dimensions, volume and weight, infill and material selectors, and the floating-geometry check in the toolbar](docs/screenshot.jpg)

---

## Features

- **Instant 3D preview** — no downloading, no opening Tinkercad, no slicer
- **Grid floor** — makes it immediately obvious if any part of the model is floating above the print bed
- **Floating geometry detection** — runs as soon as the viewer opens and shows its status in the toolbar: ⏳ checking, then ✓ clear or a ⚠️ warning when a part hangs in the air without touching or overlapping the rest of the model. Lettering or artwork inlaid in a plate, and parts nested inside a body, are not flagged (models up to 1,000,000 triangles)
- **Model dimensions** — shows W × D × H in mm in print orientation so you can check if it fits your printer
- **Volume and estimated weight** — shows cm³ and approximate grams of PLA or PETG at a selectable infill (10%–100%) to help budget filament
- **Auto-orient** — sets each model on the grid the way it would sit on your print bed, following Tinkercad's own orientation: a standing model stands up, and a flat keychain lies flat
- **Reset View button** — one click to get back to the default angle
- **Save PNG** — exports the current view with its toolbar details (dimensions, weight, floating-check result) as an image to send back to a student as feedback. The file is named after the student's file, e.g. `Cool Boat-screenshot.png`
- **Print checklist (optional, off by default)** — a button on an assignment's Student work page that makes a one-page printable list of every student and their STL file, grouped by colour, for print planning. Switch it on from the extension's toolbar icon
- **Nothing stored** — the STL loads into memory for rendering only and is never written to disk. The only things the extension ever saves are the PNG you choose to export with Save PNG and the two on/off switches for the optional features

---

## Install (Developer Mode)

The extension is not yet on the Chrome Web Store. In the meantime, you can install it manually in about two minutes.

### Step 1 — Get the files

Download the latest `stl-viewer-extension.zip` from the [Releases](../../releases) page and unzip it. You should have a folder called `stl-viewer-extension` containing `manifest.json`, `content.js`, `background.js`, and an `icons` folder.

### Step 2 — Open Chrome Extensions

In Chrome, go to:

```
chrome://extensions
```

### Step 3 — Enable Developer Mode

In the top-right corner of the Extensions page, toggle **Developer mode** on.

### Step 4 — Load the extension

Click **Load unpacked**, then select the `stl-viewer-extension` folder you unzipped in Step 1.

The extension will appear in your list as **STL Viewer for Google Classroom**. You can pin it to your toolbar by clicking the puzzle piece icon and pinning it.

### Step 5 — Try it

Open a Google Classroom assignment where a student has submitted an STL file. You should see a **🖨️ View in 3D** button appear below the "No preview available" box.

---

## Usage

| Control | Action |
|---|---|
| Drag | Rotate |
| Shift + drag | Pan |
| Scroll | Zoom in / out |
| PLA / PETG | Material used for the weight estimate |
| Infill (10%–100%) | Infill used for the weight estimate |
| ↺ Reset View | Return to default angle |
| 📷 Save PNG | Download the current view as `<student file name>-screenshot.png` |
| ✕ Close | Close the viewer |

**Reading the toolbar:**

```
🖨️  STL Preview   6,592 ▲   60.2 × 30.1 × 5.0 mm   15.6 cm³ · ~15.1 g   PLA   20% infill   ⚠️ Floating geometry detected
```

- Triangle count tells you roughly how complex the model is
- Dimensions are Width × Depth × Height in the print orientation (H = thickness)
- Volume and weight are a rough estimate at the chosen material and infill (a slicer's number will differ), and assume millimetre units and a watertight mesh
- The floating-geometry badge shows ⏳ while checking, ✓ green when clear, or an orange ⚠️ warning when it finds geometry that isn't connected to the print bed

---

## Print checklist (optional)

Off by default. To use it:

1. Click the extension's icon in the Chrome toolbar and switch on **Print checklist**. A Classroom tab you have open reloads so the button appears.
2. Open an assignment's **Student work** page, with all students showing, and click **Print checklist** (it sits near *Export to SIS*).
3. A new tab opens with a one-page list: each student and their STL file, grouped by the colour in the file name (**?** marks a guess; use the dropdown on a row to change it). Switch between *Color* and *Student* views, sort by first or last name, then **Print / Save as PDF**.

It reads the page in your browser only; nothing is saved or sent anywhere (see Privacy below). It depends on how Classroom lays out that page, so if Google changes it the checklist may stop finding students. Under **Advanced** in the same popup there is a *Troubleshooting tool* that copies an outline of the page with all text removed, to help fix it.

---

## Updating

Because this is an unpacked extension, Chrome Sync will not push updates to your other computers automatically. To update:

1. Download the new zip from Releases
2. Unzip and replace your existing folder
3. Go to `chrome://extensions` and click the **↺** refresh icon on the extension card

---

## Privacy

This extension does not collect or transmit any data, and it has no server. The only thing it saves is two on/off switches for its optional features (using Chrome's extension storage, which Chrome Sync may sync across your own browsers); no names, files, or models are ever saved.

When you click View in 3D, the STL file is fetched from Google Drive into browser memory using your existing Google session. It is parsed and rendered on your GPU, then released when you close the viewer. The STL itself is never written to disk. The only file the extension ever creates is the PNG image you choose to save with Save PNG, which your browser downloads like any other file and which is never sent anywhere. No analytics, no tracking, no external servers.

The optional Print checklist, when you switch it on and click its button, reads the student names, submission status and attachment names on that Student work page, plus the class name and assignment title. It does this in your browser, keeps the list in memory in a tab that you can close, and never saves or sends it. The *Troubleshooting tool* copies a page outline with all text removed, and only when you click Copy. The full statement is in [docs/privacy-policy.md](docs/privacy-policy.md).

---

## For IT Administrators

The extension requires these host permissions to fetch files from Google Drive using the teacher's existing authenticated session:

- `https://classroom.google.com/*`
- `https://drive.google.com/*`
- `https://drive.usercontent.google.com/*`
- `https://docs.google.com/*`
- `https://*.googleusercontent.com/*`

The extension also requests the `storage` permission, used only to remember the two on/off switches for the optional features.

See [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md) for the justification behind each permission and the full data usage disclosure.

To deploy to managed Chromebooks or school Chrome profiles without requiring developer mode, contact your Google Workspace admin about pushing extensions via the Admin Console. The extension can be deployed by Extension ID once it is published to the Chrome Web Store.

---

## Roadmap

- [ ] Chrome Web Store listing (Maker404 publisher)
- [x] Proper icon set
- [ ] Touch and stylus support
- [ ] Configurable printer bed size for the dimension check
- [ ] Color-code model height by Z layer (useful for checking wall thickness)

---

## About

Built by [Maker404](https://maker404.com) — free tools for K-12 makers and tech educators.

Questions or issues: open a GitHub issue or reach out via maker404.com.
