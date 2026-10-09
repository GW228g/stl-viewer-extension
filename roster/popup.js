// Settings popup: switches for the Print checklist button and the troubleshooting tool.
// Both are off by default. Switching one on reloads the Classroom tab you are looking at so the
// feature is there straight away (it can't be, on a page that was open before the extension updated).
const CLASSROOM = 'https://classroom.google.com/';

function reloadClassroomTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (tab && tab.url && tab.url.startsWith(CLASSROOM)) chrome.tabs.reload(tab.id);
  });
}

for (const [id, key] of [['roster', 'rosterEnabled'], ['debug', 'rosterDebug']]) {
  const box = document.getElementById(id);
  chrome.storage.sync.get({ [key]: false }, (v) => { box.checked = !!v[key]; });
  box.addEventListener('change', () => {
    // Reload only after the setting is saved, or the reloaded page would still see the old value.
    chrome.storage.sync.set({ [key]: box.checked }, () => { if (box.checked) reloadClassroomTab(); });
  });
}
