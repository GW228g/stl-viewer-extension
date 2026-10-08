# Changelog

All notable changes to STL Viewer for Google Classroom are documented here.

---

## [1.4.2] — 2026-10-08

### Fixed
- **Floating-geometry check no longer flags pieces that are embedded in the
  model.** It used to warn about any separate piece that didn't reach the print
  bed, so lettering or artwork inlaid in a plate, and parts nested inside a
  body, were reported as floating even though they print fine. Of 41 real STL
  files, 6 were flagged; in the 4 inspected piece by piece, every flagged piece
  sat inside the main body's footprint rather than hanging in the air. None of
  the 41 are flagged now. A piece is now floating only if it neither reaches
  the bed nor overlaps (by bounding box, with the same tolerance) a piece that
  is supported, directly or through a chain of overlapping pieces. A letter hovering above a
  plate is still flagged. The warning's tooltip is reworded to match
- Known limit: because the overlap test uses bounding boxes, a part floating
  inside a hollow body, or in the empty corner of an L-shaped one, is not
  caught. Check speed is unchanged (about 190 ms for 864,500 triangles)

---

## [1.4.1] — 2026-10-08

### Changed
- **Save PNG is named after the student's file** — a submission called
  `Cool Boat.stl` saves as `Cool Boat-screenshot.png` instead of the same
  `stl-preview.png` every time, so feedback images no longer overwrite each
  other or need renaming. The name comes from the download's
  `Content-Disposition` header, falling back to an `.stl` link or on-page
  text, then to `stl-preview-screenshot.png`. Characters Windows doesn't allow
  in file names are stripped

## [1.4.0] — 2026-10-04

### Added
- **Material selector** (PLA / PETG) next to the infill selector, using typical
  densities of 1.24 and 1.27 g/cm³. The choice carries over between models in
  the same page session and appears in the Save PNG header (e.g.
  `~15.4 g of PETG at 20% infill`). Materials live in one `MATERIALS` table,
  so adding another is a one-line change
- **Floating-check status in the toolbar** — a pill that reads "Checking for
  floating geometry…" while it runs, then "✓ No floating geometry" or the
  existing warning, with explicit "skipped" and "failed" states. A missing
  warning therefore always means the check passed, never that it didn't run.
  The Save PNG header shows whichever state it's in when saved

### Changed
- **The floating check no longer delays the viewer.** It used to run before
  the viewer opened; it now runs just after the first paint, on a short
  timer rather than `requestAnimationFrame` so it still completes if the tab
  is in the background
- **Floating-check limit raised from 200,000 to 1,000,000 triangles.** The old
  cap was far more cautious than needed: the check measures about 0.25 ms per
  1,000 triangles (864,500 triangles took roughly 200 ms), so large-but-normal
  models like 3DBenchy (225,706 triangles) were being skipped silently

### Fixed
- **Toolbar pushing Save PNG and Close off-screen in narrower windows** — the
  toolbar now gives up space in order: the control hint shrinks first, then
  the buttons wrap together onto a second row. Nothing is hidden or lost.
  Checked from 600 to 1366 px wide

---

## [1.3.0] — 2026-10-04

### Added
- **Volume and estimated weight** in the toolbar and the Save PNG header —
  e.g. `67.2 cm³ · ~56.3 g`. Volume is computed from the mesh with signed
  tetrahedron sums (`meshVolume()`), so it's independent of winding order and
  where the model sits relative to the origin
- **Infill selector** (10%–100% in steps of 10, default 20%) that adjusts the
  weight estimate; the choice carries over between models in the same page
  session. Weight is PLA (1.24 g/cm³) with about 1.2 mm of solid shell
  around the surface (`estimateGrams()`) and the infill percentage applied
  only to the interior, so thin parts like keychains — which are mostly walls
  and top/bottom layers — barely change with infill, as they wouldn't in a
  slicer. A rough guide, not a slicer's number. Assumes millimetre units and
  a watertight mesh; hidden when the volume is ~0 (e.g. an open surface mesh,
  or a file exported in meters)

---

## [1.2.1] — 2026-09-29

### Fixed
- **Auto-orient showing tall models on their side** — the old heuristic
  guessed the model's "up" axis by picking whichever bounding-box dimension
  was even marginally the smallest of the three, which broke down for
  genuinely tall/3D models (a lighthouse, a figurine) with no dramatically
  thin axis to detect — confirmed against two real student submissions where
  the model's true height (on the raw Z axis) got mapped horizontal instead.
  Replaced with `determineUpAxis()`: Tinkercad's editor treats Z as vertical
  height and exports STL in that same convention, so Z is now the default
  "up" axis regardless of proportions; the exception is a flat plaque (a
  keychain) whose thickness is clearly — at least 2x — thinner than the
  other two axes, which is treated as "up" instead since that's the actual
  print-bed normal for a flat part. Applied to both the auto-orient rotation
  and `detectFloating()`'s floor-axis selection, which shared the same logic
- **"Failed to fetch" on download** — narrowing `host_permissions` (see
  below) accidentally dropped coverage for `drive.usercontent.google.com`,
  the domain Google actually serves file bytes from (distinct from
  `drive.google.com` and from `*.googleusercontent.com` despite the similar
  name). Added it back specifically rather than reinstating a broad wildcard
- **Download URL detection grabbing Google's own support links** —
  `findDownloadUrl()`'s loosest strategy (any link with "download" in its
  text) could match a Google help article instead of the actual file when
  opening an STL directly from Google Drive's file list (as opposed to
  through a Classroom submission). Reordered so the more reliable
  iframe/URL/data-id strategies run first, excluded Google's own
  support/account domains from the loose text match, and made the "View in
  3D" button re-resolve the URL on every click instead of caching a
  possibly-wrong one from injection time
- **Near-invisible toolbar hint text** — the drag/pan/zoom control hint was
  set to a color nearly identical to the toolbar's own background, making it
  unreadable; changed to the same light lavender used elsewhere in the
  toolbar

### Added
- Icon set (16/48/128px) and wired into `manifest.json`'s `icons` field —
  one of the Chrome Web Store submission requirements

### Changed
- Narrowed `host_permissions` to only the domains the extension actually
  fetches from, removing the unused broad `https://*.google.com/*` and
  `https://*.googleapis.com/*` wildcards (reduces Chrome Web Store review
  friction around overly broad permission requests)

---

## [1.2.0] — 2026-09-17

### Added
- **Floating geometry detection** — union-find algorithm identifies disconnected mesh
  components that don't touch the print floor; shows an orange ⚠️ badge in the toolbar
- **Model dimensions** in toolbar — W × D × H in mm, computed in print orientation
  (H = thickness), with tooltip explaining the axis convention
- **↺ Reset View button** — restores initial camera angle, zoom, and pan in one click
- **📷 Save PNG button** — exports the current 3D view as a PNG with the toolbar
  (dimensions, floating warning) composited into the image header, ready to send
  to a student as feedback
- `preserveDrawingBuffer: true` on WebGL context so canvas pixel data is available
  for PNG export

### Fixed
- **Window event listener leak** — `mouseup` and `mousemove` listeners on `window`
  were never removed when the viewer closed; they now use named functions and are
  cleaned up in the close button handler, preventing accumulation across multiple
  views in one session
- **ASCII STL zero-normal fallback** — `parseASCII` now matches `parseBinary` in
  falling back to computed face normals when stored normals are all `0 0 0`
- **Variable shadowing** — `dx`/`dy` in the mousemove handler renamed to `mdx`/`mdy`
  to avoid shadowing the bounding box `dx`/`dy` from the outer scope
- **Default camera angle** — `rotX` changed from `-0.45` to `+0.45`; the negative
  value was tilting the model so the camera looked from underneath, showing the
  bottom face on first load and after Reset View

---

## [1.1.0] — 2026-09-16

### Added
- **Grid floor** — 20×20 `GL_LINES` grid rendered at the bottom of the model's
  bounding box, making floating geometry immediately visible
- **Auto-orient** — detects the thinnest bounding box axis (print-bed normal) and
  pre-rotates the model to lie flat regardless of export orientation from Tinkercad:
  `rotX(-90°)` when Z is thin, `rotZ(+90°)` when X is thin, no rotation when Y is thin
- `rotZ` added to the `m4` matrix math object
- Background service worker (`background.js`) fetches STL files outside the page
  context, bypassing the CORS restrictions that blocked content-script fetches

### Fixed
- **"Failed to fetch" (CORS)** — content-script fetch to Google Drive was blocked
  cross-origin; routing through the background service worker resolves this
- **"Cannot access 'gl' before initialization"** — `const gl` declared after the
  `resize` callback that referenced it caused a TDZ error; changed to `let gl = null`
  declared before the callback
- **Blank canvas on open** — `resize()` was called before the overlay was appended
  to the DOM, so `canvas.clientWidth/Height` were both 0; moved the initial `resize()`
  call to after the WebGL context is created and the overlay is in the DOM
- **Grid cutting through model** — `autoRot` was being applied twice to the grid
  (once baked into grid geometry position, once via the shared model matrix); gave
  the grid its own MVP that includes only user-drag rotation, not `autoRot`
- **Button stuck on "⏳ Parsing geometry…"** — button state was not reset after the
  viewer opened; now resets to "🖨️ View in 3D" immediately after `openViewer()` returns
- `docs.google.com` added to manifest `matches` and `host_permissions` — the file
  viewer can open on that domain and the content script was not running there

### Changed
- Button label: "Preview as STL" → "🖨️ View in 3D"
- Loading states: "Downloading file…" → "Loading…" / "Parsing geometry…" →
  "Building preview…" / added "Analysing…" during floating geometry detection
- `boundingBox()` now returns `dx`, `dy`, `dz` (individual axis ranges) in addition
  to the existing `cx`, `cy`, `cz`, `size`, `minY`

---

## [1.0.0] — 2026-09-16

### Added
- Chrome Extension Manifest V3 scaffold (`manifest.json`, `content.js`)
- Content script targeting `classroom.google.com`, `drive.google.com`,
  `docs.google.com`; runs in all frames (`all_frames: true`)
- **STL parser** — handles both binary and ASCII STL formats:
  - Binary: exact byte-length match check (`84 + nTri × 50`)
  - ASCII: keyword detection (`facet normal`, `vertex`)
  - Binary fallback for files that are at least the expected size
  - Zero-normal fallback in `parseBinary`: computes face normals from cross
    product of triangle edges when stored normals are all `0 0 0`
- **Custom WebGL renderer** — zero external dependencies (no Three.js):
  - Two GLSL shader programs: lit model shader and flat-color grid shader
  - Two directional lights plus ambient, normal-based diffuse shading
  - `m4` matrix math object: `mul`, `perspective`, `translate`, `rotX`, `rotY`
  - Mouse controls: drag to rotate, Shift+drag to pan, scroll to zoom
- **Download URL detection** — 6 strategies in priority order:
  1. Anchor `href` containing `.stl`
  2. Anchor `href` containing `export=download`
  3. Anchor text containing "download"
  4. Drive file ID extracted from `<iframe src>`
  5. Drive file ID extracted from current page URL
  6. Drive file ID from element `data-*` attributes
- **"View in 3D" button** injected below "No preview available"
- `MutationObserver` + 30-second polling safety net for slow SPA renders
- URL-change detection resets the `injected` flag when navigating between
  student submissions without a full page reload
- `README.md` with developer install instructions, usage table, privacy
  statement, and IT administrator deployment notes
- `RECAP.txt` handoff document for Claude Code continuity
