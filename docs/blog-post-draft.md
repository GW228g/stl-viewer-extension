# Blog post draft — maker404.com

*Prep draft, not final copy — adjust tone/length to match the rest of the
site before publishing. Placeholders are marked `[ ]`.*

---

**Title options:**
- "Stop Downloading 30 STL Files One at a Time"
- "A Free Chrome Extension for Grading Tinkercad Submissions"
- "How I Fixed the Worst Part of My 3D Printing Unit"

**Suggested URL slug:** `/blog/stl-viewer-chrome-extension`

**Meta description (~150 characters):**
```
A free Chrome extension that previews student STL files right inside Google
Classroom — no downloads, no Tinkercad, no slicer needed.
```

**Tags/categories:** 3D Printing, Tinkercad, Google Classroom, Tools, Free Resources

---

## Draft body

If you run a 3D printing unit through Google Classroom, you already know the
annoying part isn't the printing — it's the grading.

A class of 30 students submits their Tinkercad keychains as STL files.
Classroom can't preview them ("No preview available"), so checking each one
means: download the file, open it in Tinkercad or a slicer, look at it,
close it, move to the next submission. Multiply that by 30, twice a unit,
every year.

That's the exact problem **STL Viewer for Google Classroom** solves.

### What it does

It's a small, free Chrome extension. Wherever Classroom shows "No preview
available" for an STL file, it adds a **View in 3D** button. Click it, and a
full-screen 3D viewer opens right in your browser — rotate, zoom, done. No
download, no Tinkercad tab, no slicer.

[ screenshot: docs/screenshot.jpg from the extension repo — shows the
  toolbar with triangle count, dimensions, and the model on a grid floor ]

A few things it checks automatically while you're looking at a model:

- **Is anything floating?** — the grid floor makes it obvious if part of the
  model isn't touching the print bed, which usually means a failed print
  waiting to happen. The toolbar flags it with a warning badge if it detects
  disconnected geometry.
- **Will it fit the printer?** — dimensions are shown in mm, already
  oriented the way it'll actually sit on the bed.
- **Which way is up?** — however a student's Tinkercad export came out, the
  viewer automatically lays the model flat.

You can also save the current view as a PNG if you want to send a student
quick visual feedback ("hey, this part's floating — fix before we print").

### Privacy, since it matters in a classroom

The file never leaves your browser. It's loaded into memory just long enough
to render it, and released the moment you close the viewer. Nothing is
uploaded, logged, or stored anywhere — not by this extension, not by
Maker404. [Full privacy policy →](/stl-viewer-privacy)

### Get it

[ ] *Once live:* Get it from the Chrome Web Store → [link]
[ ] *Until then:* It's fully open source — [grab it from GitHub](https://github.com/GW228g/stl-viewer-extension)
    and load it in developer mode (instructions in the README, takes about
    two minutes).

If you teach 3D printing and Google Classroom is part of your workflow, this
is built for exactly your afternoon of grading. Let me know if you run into
anything — [contact info / GitHub issues link].

---

## Notes for whoever finalizes this

- Swap in the real screenshot file once uploaded to the CMS.
- If the Chrome Web Store listing isn't live yet, keep the GitHub
  developer-mode instructions as the primary CTA and update once approved.
- Consider a short GIF of the rotate/zoom interaction instead of a static
  screenshot if the CMS supports it — more compelling for this kind of tool.
