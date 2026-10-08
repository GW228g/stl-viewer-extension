// Renders the printable checklist from window.ROSTER_DATA:
// { course, assignment, students: [{ name, files: [] }] }
(function () {
  const { COLORS, groupByColor } = window.RosterColors;
  const data = window.ROSTER_DATA;
  const sheet = document.getElementById('sheet');
  const modeSelect = document.getElementById('mode');
  const overrides = {};   // "<name>|<file>" -> color chosen by the teacher

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
    if (withPicker) {
      const pick = el('select');
      for (const c of COLORS.concat('unsorted')) {
        const o = el('option', null, c);
        o.value = c;
        pick.append(o);
      }
      pick.value = item.color;
      pick.addEventListener('change', () => {
        overrides[item.name + '|' + item.file] = pick.value;
        render();
      });
      r.append(pick);
    }
    return r;
  }

  function colorView(cols) {
    const { groups, notSubmitted } = groupByColor(data.students, overrides);
    for (const g of groups) {
      const box = el('section', 'group');
      box.dataset.color = g.color;
      const title = g.color === 'unsorted' ? 'Unsorted - check color' : g.color;
      const h = el('h2', null, title);
      h.append(el('span', null, String(g.items.length)));
      box.append(h);
      for (const item of g.items) box.append(row({ ...item, color: g.color }, true));
      cols.append(box);
    }
    if (notSubmitted.length) {
      const box = el('section', 'group missing');
      const h = el('h2', null, 'Not submitted');
      h.append(el('span', null, String(notSubmitted.length)));
      box.append(h);
      for (const name of notSubmitted) box.append(row({ name, file: 'no file' }, false));
      cols.append(box);
    }
  }

  function studentView(cols) {
    const box = el('section', 'group');
    const sorted = [...data.students].sort((a, b) => a.name.localeCompare(b.name));
    for (const s of sorted) {
      if (!s.files.length) {
        const r = row({ name: s.name, file: 'no file' }, false);
        r.classList.add('missing');
        box.append(r);
      }
      for (const file of s.files) box.append(row({ name: s.name, file }, false));
    }
    cols.append(box);
  }

  function render() {
    sheet.replaceChildren();
    sheet.append(el('h1', null, data.course));
    const total = data.students.reduce((n, s) => n + s.files.length, 0);
    sheet.append(el('p', 'sub', `${data.assignment} - ${data.students.length} students, ${total} files`));
    const cols = el('div', 'cols');
    (modeSelect.value === 'color' ? colorView : studentView)(cols);
    sheet.append(cols);
  }

  modeSelect.addEventListener('change', render);
  document.getElementById('print').addEventListener('click', () => window.print());
  render();
})();
