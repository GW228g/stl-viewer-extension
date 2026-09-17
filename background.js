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

      sendResponse({ ok: true, b64: btoa(binary) });
    })
    .catch(err => {
      sendResponse({ ok: false, error: err.message });
    });

  return true; // Keep the message channel open for the async response
});
