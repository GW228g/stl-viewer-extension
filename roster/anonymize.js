// Describes a page's DOM structure with every piece of text removed, so a teacher can
// share the layout of a Classroom page without sharing student names or file names.
//
// What survives: tag names, class names, roles, jsname/jscontroller, aria/data attribute
// NAMES, link shapes (ids replaced), a few well-known status words ("Assigned", ...).
// What is replaced: all other text, aria-label/title/alt values, ids, data-* values, hrefs'
// ids and query strings, any text containing ".stl" (shown as [FILE.stl]).
(function (root) {
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'TEMPLATE', 'HEAD']);
  const STATUS_WORDS = new Set([
    'assigned', 'turned in', 'handed in', 'done', 'done late', 'missing', 'returned',
    'graded', 'draft', 'late', 'resubmitted', 'not turned in', 'marked as done',
    'no grade', 'view', 'open', 'download', 'attach', 'add', 'remove', 'edit',
  ]);
  const ENUM_VALUE = /^(true|false|mixed|polite|assertive|off|none|page|listbox|menu|dialog|grid|presentation|button|link)$/;
  const PATH_WORDS = new Set([
    'a', 'c', 'g', 'tg', 'sp', 'sw', 't', 'w', 'r', 'u', 'h', 'm', 'p', 's', 'd', 'i',
    'details', 'stream', 'classwork', 'people', 'grades', 'submissions', 'todo', 'all',
    'file', 'folder', 'view', 'edit', 'preview', 'drive', 'embeddedfolderview',
  ]);
  const MAX_DEPTH = 60;
  const MAX_CHARS = 150000;
  const MAX_CHAINS = 3;

  function redactText(raw) {
    const s = String(raw).trim().replace(/\s+/g, ' ');
    if (!s) return null;
    if (/\.stl\b/i.test(s)) return '[FILE.stl]';
    if (STATUS_WORDS.has(s.toLowerCase())) return s;
    return '[T]';
  }

  // https://host/NzU4/Mjk#x -> https://host/[ID]/[ID]
  function urlPattern(url, base) {
    try {
      const u = new URL(url, base);
      const segs = u.pathname.split('/').filter(Boolean)
        .map(seg => (PATH_WORDS.has(seg.toLowerCase()) ? seg : '[ID]'));
      return u.protocol + '//' + u.host + (segs.length ? '/' + segs.join('/') : '');
    } catch (e) {
      return '[URL]';
    }
  }

  function tagLabel(el, classLimit) {
    const classes = [...el.classList].slice(0, classLimit);
    return el.tagName.toLowerCase() + classes.map(c => '.' + c).join('');
  }

  function attrText(el, baseUrl) {
    const out = [];
    if (el.id) out.push('id=[ID]');
    for (const a of el.attributes) {
      const n = a.name.toLowerCase();
      if (n === 'class' || n === 'id' || n === 'style') continue;
      if (n === 'role' || n === 'type' || n === 'jsname' || n === 'jscontroller') {
        out.push(`${n}=${a.value}`);
      } else if (n.startsWith('aria-')) {
        out.push(`${n}=${ENUM_VALUE.test(a.value) ? a.value : '[T]'}`);
      } else if (n.startsWith('data-')) {
        out.push(`${n}=[V]`);
      } else if (n === 'href' || (n === 'src' && el.tagName === 'IFRAME')) {
        out.push(`${n}=${urlPattern(a.value, baseUrl)}`);
      } else if (n === 'src') {
        out.push('src=[IMG]');
      } else if (n === 'title' || n === 'alt' || n === 'placeholder') {
        out.push(`${n}=[T]`);
      }
    }
    return out.length ? ' ' + out.join(' ') : '';
  }

  // Blocks of consecutive identical children are printed once, with a count.
  function describeChildren(el, depth, ctx) {
    const blocks = [];
    for (const node of el.childNodes) {
      let text = null;
      if (node.nodeType === 3) {
        const t = redactText(node.nodeValue);
        if (t) {
          text = '  '.repeat(depth) + JSON.stringify(t);
          if (t === '[FILE.stl]') ctx.stlCount++;
          else if (t !== '[T]') ctx.status[t.toLowerCase()] = (ctx.status[t.toLowerCase()] || 0) + 1;
        }
      } else if (node.nodeType === 1 && !SKIP_TAGS.has(node.tagName) && !node.hasAttribute('data-roster-ignore')) {
        text = describeElement(node, depth, ctx);
      }
      if (text == null) continue;
      const last = blocks[blocks.length - 1];
      if (last && last.text === text) last.count++;
      else blocks.push({ text, count: 1 });
    }
    return blocks.map(b => (b.count > 1
      ? b.text + '\n' + '  '.repeat(depth) + `^ x${b.count} identical siblings`
      : b.text));
  }

  function describeElement(el, depth, ctx) {
    const head = '  '.repeat(depth) + tagLabel(el, 8) + attrText(el, ctx.base);
    if (depth >= MAX_DEPTH) return head + ' ...(depth limit)';
    if (el.tagName === 'SVG' || el.tagName === 'svg') return head;
    const kids = describeChildren(el, depth + 1, ctx);
    return kids.length ? head + '\n' + kids.join('\n') : head;
  }

  // For each .stl text found: its ancestor chain, flagging levels that repeat among siblings
  // (those repeating levels are the per-student rows).
  function stlChains(doc) {
    const chains = [];
    const walker = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */);
    let n;
    while ((n = walker.nextNode()) && chains.length < MAX_CHAINS) {
      if (!/\.stl\b/i.test(n.nodeValue)) continue;
      const parts = [];
      for (let el = n.parentElement; el && el !== doc.body; el = el.parentElement) {
        let label = tagLabel(el, 3);
        const parent = el.parentElement;
        if (parent) {
          const same = [...parent.children].filter(c => c.tagName === el.tagName && c.className === el.className).length;
          if (same >= 2) label += ` [x${same} similar siblings]`;
        }
        parts.push(label);
      }
      chains.push(parts.reverse().join(' > '));
    }
    return chains;
  }

  function describePage(doc, loc) {
    const ctx = { stlCount: 0, status: {}, base: loc.href };
    const outline = describeChildren(doc.body, 0, ctx).join('\n');
    const status = Object.entries(ctx.status).map(([w, c]) => `${w} x${c}`).join(', ') || '(none)';
    const chains = stlChains(doc);

    let text = [
      '# Classroom page structure (all text redacted)',
      `url: ${urlPattern(loc.href, loc.href)}`,
      `.stl names found on page: ${ctx.stlCount}`,
      `status words seen: ${status}`,
      '',
      '## Ancestor chains of the first .stl names',
      ...(chains.length ? chains.map((c, i) => `${i + 1}. ${c}`) : ['(no .stl text found)']),
      '',
      '## Outline',
      outline,
    ].join('\n');

    if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS) + '\n...(truncated)';
    return text;
  }

  const api = { describePage, redactText, urlPattern };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RosterAnonymize = api;
})(typeof self !== 'undefined' ? self : this);
