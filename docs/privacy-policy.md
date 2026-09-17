# Privacy Policy — STL Viewer for Google Classroom

**Last updated:** September 17, 2026

STL Viewer for Google Classroom ("the extension") is built by Maker404 to help
teachers preview STL 3D files submitted by students in Google Classroom,
without downloading them. This page explains exactly what the extension does
and does not do with your data.

> Publish this page at a stable URL (e.g. `maker404.com/stl-viewer-privacy`)
> and use that URL in the Chrome Web Store listing's privacy policy field.

## Summary

The extension does not collect, store, log, sell, or transmit any personal
data to Maker404, to any third party, or to any server of any kind. There is
no analytics, no tracking, and no advertising. All processing happens locally,
inside your own browser.

## What the extension accesses, and why

When you click **View in 3D** on a submitted STL file:

1. The extension uses your existing, already-authenticated Google session to
   fetch the raw bytes of that one file from Google Drive.
2. The file is decoded and rendered entirely inside your browser's memory,
   using your computer's own graphics hardware (WebGL).
3. When you close the 3D viewer, the file data and the rendered graphics
   buffers are released. Nothing is written to disk, cached, or retained
   after that point.

To do this, the extension requests permission to run on Google Classroom,
Google Drive, and Google Docs pages. These permissions are used exclusively
to (a) detect when a "No preview available" STL submission appears on the
page, and (b) fetch that one file's bytes. The extension does not read,
collect, or transmit any other content from these pages — grades, student
names, comments, or any other Classroom or Drive data are never accessed or
sent anywhere.

## What the extension does not do

- It does not create an account or require any sign-in of its own — it relies
  entirely on your existing Google session.
- It does not use cookies, local storage, or any other mechanism to track you
  or your students across sessions or sites.
- It does not transmit any data to Maker404's servers or to any third
  party — the extension has no backend server at all.
- It does not use analytics, telemetry, or crash reporting of any kind.
- It does not display ads.

## Student data and school compliance (FERPA / COPPA)

Because this extension is used inside Google Classroom, we want to be
explicit: it never collects, stores, or transmits any information about
students, their submissions, or their identities. It only reads the binary
content of an STL file already visible to the signed-in teacher on the page,
entirely within that teacher's own browser, and only for as long as the 3D
viewer window is open.

## Changes to this policy

If this policy changes, the "Last updated" date above will be revised and the
new version posted at this same URL.

## Contact

Questions about this policy or the extension: [maker404.com](https://maker404.com)
or open an issue on the [GitHub repository](https://github.com/GW228g/stl-viewer-extension).
