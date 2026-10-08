// Adds a "Print checklist" button on Classroom's student-work page. On click it reads the
// page, opens the checklist tab, and hands the data over with postMessage. Nothing is stored
// and no permissions are needed: the data lives only in memory in the two tabs.
(function () {
  try {
    if (window.top !== window || document.getElementById('stl-roster-launch')) return;

    const SUBMISSIONS_PAGE = /\/c\/[^/]+\/a\/[^/]+\/submissions\//;
    const EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
    let onReady = null;

    const btn = document.createElement('button');
    btn.id = 'stl-roster-launch';
    btn.type = 'button';
    btn.setAttribute('data-roster-ignore', '');
    btn.textContent = 'Print checklist';
    btn.style.cssText = 'position:fixed;left:12px;bottom:44px;z-index:2147483646;padding:7px 14px;' +
      'font:13px system-ui,sans-serif;border:1px solid #1a73e8;border-radius:16px;background:#1a73e8;' +
      'color:#fff;cursor:pointer;display:none';
    document.body.appendChild(btn);

    // Classroom is a single-page app, so check the address now and then.
    const sync = () => { btn.style.display = SUBMISSIONS_PAGE.test(location.pathname) ? 'block' : 'none'; };
    sync();
    setInterval(sync, 1500);

    btn.addEventListener('click', () => {
      const payload = window.RosterScrape.scrape(document);
      const w = window.open(chrome.runtime.getURL('roster/print.html'));
      if (!w) { alert('Your browser blocked the checklist tab. Allow pop-ups for classroom.google.com and try again.'); return; }

      if (onReady) window.removeEventListener('message', onReady);
      onReady = (e) => {
        if (e.source !== w || e.origin !== EXT_ORIGIN || !e.data || e.data.type !== 'roster-ready') return;
        w.postMessage({ type: 'roster-data', payload }, EXT_ORIGIN);
      };
      window.addEventListener('message', onReady);
    });
  } catch (e) {
    console.warn('[stl-roster-launch] disabled:', e);
  }
})();
