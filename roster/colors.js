// Guess a filament color from a student's file name, and group a class roster by it.
// Pure logic with no DOM or extension APIs, so it runs in the browser and in Node tests.
(function (root) {
  // Display order of the groups on the printed sheet.
  const COLORS = [
    'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'gold', 'silver', 'teal', 'multicolor', 'clear',
  ];

  const SYNONYMS = {
    red:        ['red', 'crimson', 'scarlet', 'maroon'],
    orange:     ['orange'],
    yellow:     ['yellow'],
    green:      ['green', 'lime'],
    blue:       ['blue', 'navy'],
    purple:     ['purple', 'violet', 'lavender', 'lilac'],
    pink:       ['pink', 'magenta'],
    brown:      ['brown'],
    black:      ['black'],
    white:      ['white'],
    gray:       ['gray', 'grey'],
    gold:       ['gold'],
    silver:     ['silver'],
    teal:       ['teal', 'turquoise', 'aqua', 'cyan'],
    multicolor: ['rainbow', 'multicolor', 'multicolour', 'multi'],
    clear:      ['clear', 'transparent'],
  };

  // Ordinary words that sit one typo away from a color and show up in 3D-print names.
  // They are never fuzzy-matched (an exact color word still wins).
  const NOT_COLORS = new Set([
    'block', 'blank', 'blur', 'glue', 'crown', 'drown', 'grown', 'brown',
    'fellow', 'mellow', 'sliver', 'server', 'write', 'while', 'whole',
    'greek', 'greet', 'greed', 'bold', 'told', 'hold', 'mold', 'gild',
    'team', 'tell', 'deal', 'seal', 'tail', 'real', 'pine', 'ping', 'pint',
    'link', 'mink', 'arrange', 'hundred',
  ]);

  const WORD_TO_COLOR = {};
  for (const color of COLORS) for (const w of SYNONYMS[color]) WORD_TO_COLOR[w] = color;
  const COLOR_WORDS = Object.keys(WORD_TO_COLOR);

  // Edit distance counting a swapped pair of letters ("bleu" vs "blue") as one typo.
  function distance(a, b) {
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 0; j <= b.length; j++) { d[0][j] = j; }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }

  // "RedDragon_v2.stl" -> ["red", "dragon", "v"]
  function tokenize(fileName) {
    return String(fileName || '')
      .replace(/\.stl$/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean);
  }

  // Returns { color, certain, word } or { color: null }.
  // certain=false means a guess (typo or color glued to another word) the teacher should glance at.
  function detectColor(fileName) {
    const words = tokenize(fileName);

    // Exact color word. Students often put the color first or last ("red dragon",
    // "d1p2 john fitz project #3 Orange"); one buried in the middle of a long name could be
    // part of a name or title ("john brown project"), and two different colors are ambiguous.
    // Either case still picks the last color word but is marked as a guess.
    const named = words.filter(w => w.length >= 2);   // stray letters from "d1p2", "v2"
    let first = -1, last = -1;
    const found = new Set();
    named.forEach((w, i) => {
      if (!WORD_TO_COLOR[w]) return;
      found.add(WORD_TO_COLOR[w]);
      if (first < 0) first = i;
      last = i;
    });
    if (last >= 0) {
      const atEdge = first === 0 || last === named.length - 1;
      return { color: WORD_TO_COLOR[named[last]], certain: found.size === 1 && atEdge, word: named[last] };
    }

    // Color glued to another word: "reddragon", "froggreen".
    for (const w of words) {
      if (w.length < 6) continue;
      for (const cw of COLOR_WORDS) {
        if (w.length - cw.length >= 3 && (w.startsWith(cw) || w.endsWith(cw))) {
          return { color: WORD_TO_COLOR[cw], certain: false, word: w };
        }
      }
    }

    // Misspelling: same first letter and one typo (two for long words).
    let best = null;
    for (const w of words) {
      if (w.length < 4 || NOT_COLORS.has(w)) continue;
      const limit = w.length >= 7 ? 2 : 1;
      for (const cw of COLOR_WORDS) {
        if (cw.length < 4 || cw[0] !== w[0]) continue;
        const dist = distance(w, cw);
        if (dist <= limit && (!best || dist < best.dist)) {
          best = { color: WORD_TO_COLOR[cw], certain: false, word: w, dist };
        }
      }
    }
    return best ? { color: best.color, certain: false, word: best.word } : { color: null };
  }

  // Sort key for "First Last" or "Last, First" names.
  function nameKey(name, mode) {
    const n = String(name || '').trim();
    let first, last;
    if (n.includes(',')) {
      [last, first] = n.split(',').map(x => x.trim());
    } else {
      const parts = n.split(/\s+/);
      last = parts.pop() || '';
      first = parts.join(' ');
    }
    return (mode === 'first' ? first + ' ' + last : last + ' ' + first).toLowerCase();
  }

  const DONE_STATUS = /^(turned in|handed in|done|done late|returned|graded|resubmitted)$/i;

  // students: [{ id?, name, status?, files: ["a.stl"], others?: [{ name, isLink }] }]
  // overrides: { "<id or name>|<file>": "red" | "unsorted" } set by the teacher in the preview.
  // opts.sort: "last" (default) or "first".
  function groupByColor(students, overrides, opts) {
    overrides = overrides || {};
    const mode = (opts && opts.sort) || 'last';
    const cmp = (a, b) => nameKey(a.name, mode).localeCompare(nameKey(b.name, mode));
    const byColor = {};
    const notSubmitted = [];
    const others = [];

    for (const s of students) {
      const files = s.files || [];
      const extra = s.others || [];
      if (!files.length && !extra.length) { notSubmitted.push(s); continue; }
      for (const o of extra) others.push({ name: s.name, title: o.name, isLink: o.isLink });
      for (const file of files) {
        const key = (s.id || s.name) + '|' + file;
        const guess = detectColor(file);
        const forced = overrides[key];
        const color = forced || guess.color || 'unsorted';
        const uncertain = !forced && color !== 'unsorted' && !guess.certain;
        const pending = !!s.status && !DONE_STATUS.test(s.status);
        (byColor[color] = byColor[color] || []).push({ key, name: s.name, file, uncertain, pending });
      }
    }

    const groups = [];
    for (const color of COLORS.concat('unsorted')) {
      if (!byColor[color]) continue;
      byColor[color].sort(cmp);
      groups.push({ color, items: byColor[color] });
    }
    return {
      groups,
      notSubmitted: notSubmitted.sort(cmp).map(s => s.name),
      others: others.sort(cmp),
    };
  }

  const api = { COLORS, detectColor, groupByColor, nameKey, tokenize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RosterColors = api;
})(typeof self !== 'undefined' ? self : this);
