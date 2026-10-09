# Privacy Policy — STL Viewer for Google Classroom

**Last updated:** October 9, 2026

STL Viewer for Google Classroom ("the extension") is built by Maker404 to help
teachers preview STL 3D files submitted by students in Google Classroom,
without downloading them. This page explains exactly what the extension does
and does not do with your data.

> Publish this page at a stable URL (e.g. `maker404.com/stl-viewer-privacy`)
> and use that URL in the Chrome Web Store listing's privacy policy field.

## Summary

The extension does not collect, log, sell, or transmit any personal data to
Maker404, to any third party, or to any server of any kind. There is no
analytics, no tracking, and no advertising. All processing happens locally,
inside your own browser. The only thing it saves is two on/off switches for
its optional features (see "What the extension saves" below) — never any
student, file, or model data.

## What the extension accesses, and why

When you click **View in 3D** on a submitted STL file:

1. The extension uses your existing, already-authenticated Google session to
   fetch the raw bytes of that one file from Google Drive.
2. The file is decoded and rendered entirely inside your browser's memory,
   using your computer's own graphics hardware (WebGL).
3. When you close the 3D viewer, the file data and the rendered graphics
   buffers are released. The STL itself is never written to disk, cached, or
   retained after that point.

To do this, the extension requests permission to run on Google Classroom,
Google Drive, and Google Docs pages. These permissions are used exclusively
to (a) detect when a "No preview available" STL submission appears on the
page, and (b) fetch that one file's bytes. When you only use View in 3D, the
extension does not read, collect, or transmit any other content from these
pages — grades, student names, comments, or any other Classroom or Drive data
are never accessed or sent anywhere. The one optional feature that reads more
is the Print checklist, described below, and it is off unless you switch it on.

The one thing the extension can save is an image you ask for. If you click
**Save PNG**, it draws the current view (with the toolbar details such as
dimensions and weight estimate) into an image on your own computer, and your
browser downloads it like any other file. That only happens when you click,
and the image is never sent anywhere.

## Optional features (both off by default)

You switch these on yourself, from the extension's toolbar icon. Neither runs
until you do.

**Print checklist.** Adds a "Print checklist" button to an assignment's
*Student work* page. When — and only when — you click that button, the extension
reads from that page the class name and section, the assignment title, and for
each student their name, submission status, and the names of their attachments.
It builds a one-page list for you in a new tab of the extension, grouped by the
colour named in each file, so you can plan your prints. That information is held
in your browser's memory while the page is open, handed between the two tabs
inside your browser, and never saved or sent anywhere. Closing the tab discards
it. If you print the page or save it as a PDF, that is your own action and your
own file.

**Troubleshooting tool.** Adds a small "Copy page structure" button to Classroom
pages. When you click it, the extension builds an outline of the page's layout
with all text removed (names, file names, ids and link identifiers are replaced), shows it to
you, and copies it to your clipboard only if you press Copy. Nothing leaves your
browser unless you paste it somewhere yourself.

## What the extension saves

The extension asks Chrome for its `storage` permission for exactly one purpose:
remembering the two switches above. It saves two true/false values,
`rosterEnabled` and `rosterDebug`, and nothing else. Chrome keeps these with the
extension's other settings in your browser profile and, if you use Chrome Sync,
syncs them across your signed-in browsers through your Google account, like any
extension setting. They contain no names, files, models, or Classroom data.
The material and infill you pick for the weight estimate are held in memory for
the current page only and are not saved.

## What the extension does not do

- It does not create an account or require any sign-in of its own — it relies
  entirely on your existing Google session.
- It does not use cookies or any other mechanism to track you or your students
  across sessions or sites. (The two on/off switches above are the only thing it
  saves, and they identify no one.)
- It does not transmit any data to Maker404's servers or to any third
  party — the extension has no backend server at all.
- It does not use analytics, telemetry, or crash reporting of any kind.
- It does not display ads.

## Student data and school compliance (FERPA / COPPA)

Because this extension is used inside Google Classroom, we want to be
explicit: it never collects, stores, or transmits any information about
students, their submissions, or their identities to anyone. With View in 3D it
only reads the binary content of an STL file already visible to the signed-in
teacher, entirely within that teacher's own browser, for as long as the viewer
is open. If the teacher switches on and uses the optional Print checklist, it
also reads the student names and attachment names already shown on the Student
work page, in that teacher's browser, to produce a list for that teacher only —
held in memory, never saved or sent anywhere.

## Changes to this policy

If this policy changes, the "Last updated" date above will be revised and the
new version posted at this same URL.

## Contact

Questions about this policy or the extension: [maker404.com](https://maker404.com)
or open an issue on the [GitHub repository](https://github.com/GW228g/stl-viewer-extension).
