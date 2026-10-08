// Settings popup: one switch that turns the Print checklist button on or off (off by default).
const box = document.getElementById('roster');
chrome.storage.sync.get({ rosterEnabled: false }, (v) => { box.checked = !!v.rosterEnabled; });
box.addEventListener('change', () => chrome.storage.sync.set({ rosterEnabled: box.checked }));
