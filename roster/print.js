// Renders the printable checklist.
// Data: { title, students: [{ id, name, status, files: [], others: [{ name, isLink }] }], warnings: [] }
// It arrives by postMessage from the Classroom tab that opened this page; add ?mock to the
// address to develop against invented data instead.
(function () {
  const { COLORS, groupByColor, nameKey } = window.RosterColors;
  const CLASSROOM_ORIGIN = 'https://classroom.google.com';
  const sheet = document.getElementById('sheet');
  const warningsBox = document.getElementById('warnings');
  const modeSelect = document.getElementById('mode');
  const sortSelect = document.getElementById('sort');
  const overrides = {};   // item key -> color chosen by the teacher
  let data = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function row(item, withPicker) {
    const r = el('div', 'row');
    r.append(el('span', 'box'), el('span', 'who', item.name), el('span', 'file', item.file));
    if (item.uncertain) r.append(el('span', 'guess', '?'));
    if (item.pending) r.append(el('span', 'note', '(not turned in)'));
    if (withPicker) {
      const pick = el('select');
      for (const c of COLORS.concat('unsorted')) {
        const o = el('option', null, c);
        o.value = c;
        pick.append(o);
      }
      pick.value = item.color;
      pick.addEventListener('change', () => {
        overrides[item.key] = pick.value;
        render();
      });
      r.append(pick);
    }
    return r;
  }

  function section(title, count, cls) {
    const box = el('section', 'group' + (cls ? ' ' + cls : ''));
    const h = el('h2', null, title);
    h.append(el('span', null, String(count)));
    box.append(h);
    return box;
  }

  function colorView(cols, sort) {
    const { groups, notSubmitted, others } = groupByColor(data.students, overrides, { sort });
    for (const g of groups) {
      const title = g.color === 'unsorted' ? 'Unsorted - check color' : g.color[0].toUpperCase() + g.color.slice(1);
      const box = section(title, g.items.length);
      box.dataset.color = g.color;
      for (const item of g.items) box.append(row({ ...item, color: g.color }, true));
      cols.append(box);
    }
    if (others.length) {
      const box = section('Not an STL (link or other file)', others.length);
      for (const o of others) {
        box.append(row({ name: o.name, file: (o.isLink ? 'link: ' : '') + o.title }, false));
      }
      cols.append(box);
    }
    if (notSubmitted.length) {
      const box = section('Not submitted', notSubmitted.length, 'missing');
      for (const name of notSubmitted) box.append(row({ name, file: 'no file' }, false));
      cols.append(box);
    }
  }

  function studentView(cols, sort) {
    const box = el('section', 'group');
    const sorted = [...data.students].sort((a, b) => nameKey(a.name, sort).localeCompare(nameKey(b.name, sort)));
    for (const s of sorted) {
      const items = [
        ...s.files.map(f => ({ name: s.name, file: f })),
        ...(s.others || []).map(o => ({ name: s.name, file: (o.isLink ? 'link: ' : '') + o.name })),
      ];
      if (!items.length) items.push({ name: s.name, file: 'no file' });
      for (const item of items) {
        const r = row(item, false);
        if (item.file === 'no file') r.classList.add('missing');
        box.append(r);
      }
    }
    cols.append(box);
  }

  function render() {
    warningsBox.replaceChildren();
    for (const w of data.warnings || []) warningsBox.append(el('div', 'warn', w));

    sheet.replaceChildren();
    sheet.append(el('h1', null, data.title || 'Print checklist'));
    const fileCount = data.students.reduce((n, s) => n + s.files.length, 0);
    const date = new Date().toLocaleDateString();
    sheet.append(el('p', 'sub', `${data.students.length} students, ${fileCount} STL files - ${date}`));
    const cols = el('div', 'cols');
    (modeSelect.value === 'color' ? colorView : studentView)(cols, sortSelect.value);
    sheet.append(cols);
  }

  function setData(d) {
    data = d;
    render();
  }

  modeSelect.addEventListener('change', () => data && render());
  sortSelect.addEventListener('change', () => data && render());
  document.getElementById('print').addEventListener('click', () => window.print());

  if (location.search.includes('mock')) {
    const s = document.createElement('script');
    s.src = 'mock-data.js';
    s.onload = () => setData(window.ROSTER_DATA);
    document.body.append(s);
  } else {
    window.addEventListener('message', (e) => {
      if (e.origin !== CLASSROOM_ORIGIN || e.source !== window.opener) return;
      if (e.data && e.data.type === 'roster-data') setData(e.data.payload);
    });
    if (window.opener) window.opener.postMessage({ type: 'roster-ready' }, CLASSROOM_ORIGIN);
  }
})();
