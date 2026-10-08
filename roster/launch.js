// Adds a "Print checklist" button to Classroom's student-work page, when the teacher has turned
// the feature on in the extension's popup. The button lives on <body>, outside the parts of the page
// Classroom re-renders, and is positioned over the right end of the page's tab bar ("Instructions |
// Student work"); if that bar isn't found it floats at the top right instead. On click it reads the page, opens the
// checklist tab, and hands the data over with postMessage. Nothing is stored and the data lives
// only in memory in the two tabs.
(function () {
  try {
    if (window.top !== window || document.getElementById('stl-roster-launch')) return;

    const SUBMISSIONS_PAGE = /\/c\/[^/]+\/a\/[^/]+\/submissions\//;
    const EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;
    const PRINTER_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
      '<path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7' +
      'c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>';
    const BASE_STYLE = 'display:none;align-items:center;gap:8px;padding:0 16px;height:36px;border:0;' +
      'border-radius:18px;background:#1a73e8;color:#fff;cursor:pointer;z-index:2147483646;' +
      'font:500 14px "Google Sans",Roboto,Arial,sans-serif;box-shadow:0 1px 3px rgba(60,64,67,.35);';
    const BUTTON_HEIGHT = 36;

    let enabled = false;
    let onReady = null;

    const btn = document.createElement('button');
    btn.id = 'stl-roster-launch';
    btn.type = 'button';
    btn.title = 'Make a printable list of each student and their STL file';
    btn.innerHTML = PRINTER_ICON + '<span>Print checklist</span>';
    btn.style.cssText = BASE_STYLE;

    function tabBar() {
      return [...document.querySelectorAll('nav')].find(n => n.querySelector('a[href*="/submissions/"]')) || null;
    }

    // Line the button up with the tab bar's right end when there is room; otherwise float it.
    function place() {
      if (btn.parentElement !== document.body) document.body.appendChild(btn);
      const bar = tabBar();
      const rect = bar && bar.getBoundingClientRect();
      const roomy = rect && rect.width >= 700 && rect.height > 0 && rect.bottom > 0;
      const top = roomy ? rect.top + (rect.height - BUTTON_HEIGHT) / 2 : 76;
      btn.style.cssText = BASE_STYLE + `position:fixed;right:24px;top:${Math.round(top)}px;display:inline-flex;`;
    }

    // Classroom is a single-page app and re-renders often, so keep the button in step with it.
    function sync() {
      if (enabled && SUBMISSIONS_PAGE.test(location.pathname)) place();
      else btn.style.display = 'none';
    }
    document.body.appendChild(btn);
    setInterval(sync, 500);
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);

    chrome.storage.sync.get({ rosterEnabled: false }, (v) => { enabled = !!v.rosterEnabled; sync(); });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.rosterEnabled) { enabled = !!changes.rosterEnabled.newValue; sync(); }
    });

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
