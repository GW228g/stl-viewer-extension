// Settings popup: switches for the Print checklist button and the troubleshooting tool.
// Both are off by default.
for (const [id, key] of [['roster', 'rosterEnabled'], ['debug', 'rosterDebug']]) {
  const box = document.getElementById(id);
  chrome.storage.sync.get({ [key]: false }, (v) => { box.checked = !!v[key]; });
  box.addEventListener('change', () => chrome.storage.sync.set({ [key]: box.checked }));
}
