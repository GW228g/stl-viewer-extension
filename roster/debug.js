// TEMPORARY helper: adds a small "Copy page structure" button to Classroom pages.
// It builds a text outline of the page with all text removed (see anonymize.js), shows it
// for review, and copies it on request. Nothing leaves the browser unless the teacher pastes it.
(function () {
  try {
    if (window.top !== window || document.getElementById('stl-roster-debug')) return;

    const btn = document.createElement('button');
    btn.id = 'stl-roster-debug';
    btn.type = 'button';
    btn.setAttribute('data-roster-ignore', '');
    btn.textContent = 'Copy page structure';
    btn.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483646;padding:5px 10px;' +
      'font:12px system-ui,sans-serif;border:1px solid #888;border-radius:14px;background:#fff;' +
      'color:#333;cursor:pointer;opacity:.6';
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '.6'; });
    btn.addEventListener('click', showPanel);
    document.body.appendChild(btn);

    function showPanel() {
      let text;
      try {
        // Hide our own button so it doesn't appear in the outline.
        btn.hidden = true;
        text = window.RosterAnonymize.describePage(document, location);
      } catch (e) {
        text = 'Could not read the page: ' + e.message;
      } finally {
        btn.hidden = false;
      }

      const panel = document.createElement('div');
      panel.setAttribute('data-roster-ignore', '');
      panel.style.cssText = 'position:fixed;inset:5vh 5vw;z-index:2147483647;display:flex;flex-direction:column;' +
        'gap:8px;padding:12px;background:#fff;color:#222;border:2px solid #444;border-radius:8px;' +
        'font:13px system-ui,sans-serif;box-shadow:0 8px 40px rgba(0,0,0,.4)';

      const note = document.createElement('div');
      note.textContent = `${text.length.toLocaleString()} characters. Check the text below for anything ` +
        'private, then copy it. Names should all show as [T] and file names as [FILE.stl].';

      const area = document.createElement('textarea');
      area.readOnly = true;
      area.value = text;
      area.style.cssText = 'flex:1;font:11px/1.3 ui-monospace,Menlo,monospace;white-space:pre;resize:none';

      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:8px;align-items:center';
      const copy = document.createElement('button');
      copy.textContent = 'Copy';
      const close = document.createElement('button');
      close.textContent = 'Close';
      const status = document.createElement('span');
      bar.append(copy, close, status);

      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = 'Copied.';
        } catch (e) {
          area.select();
          status.textContent = 'Clipboard blocked - text is selected, press Cmd/Ctrl+C.';
        }
      });
      close.addEventListener('click', () => panel.remove());

      panel.append(note, area, bar);
      document.body.appendChild(panel);
    }
  } catch (e) {
    console.warn('[stl-roster-debug] disabled:', e);
  }
})();
