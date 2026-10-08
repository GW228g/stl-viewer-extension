// Background service worker — fetches STL files on behalf of the content script.
// Running here (outside any web page) bypasses the CORS restrictions that block
// content-script fetches across Google domains.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'FETCH_STL') return;

  fetch(msg.url, { credentials: 'include' })
    .then(async res => {
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        throw new Error('Got an HTML page — make sure you are signed in to Google.');
      }

      const buf = await res.arrayBuffer();

      // ArrayBuffers can't pass through sendMessage directly, so convert to base64.
      // We chunk the conversion to avoid hitting the JS call-stack limit on large files.
      const bytes = new Uint8Array(buf);
      const CHUNK = 0x8000; // 32 KB at a time — safe across all JS engines
      let binary = '';
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }

      sendResponse({
        ok: true,
        b64: btoa(binary),
        filename: filenameFromDisposition(res.headers.get('content-disposition')),
      });
    })
    .catch(err => {
      sendResponse({ ok: false, error: err.message });
    });

  return true; // Keep the message channel open for the async response
});

// Pull the real file name out of a Content-Disposition header, preferring the
// RFC 5987 `filename*=UTF-8''…` form (handles non-ASCII names) over `filename="…"`.
function filenameFromDisposition(header) {
  if (!header) return null;
  const star = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)?'[^']*'([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1].trim()); }
    catch { /* malformed %-escape — fall back to the plain filename below */ }
  }
  const plain = header.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
  return plain ? (plain[1] || plain[2]).trim() : null;
}
