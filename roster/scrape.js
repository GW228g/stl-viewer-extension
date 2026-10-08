// Reads the teacher's Classroom "Student work" page and returns each student's name,
// submission status and attachments. Selectors come from a real page's structure
// (see the debug outline): one card per student, holding a name and attachment links.
(function (root) {
  const STATUS_RE = /^(turned in|handed in|assigned|done|done late|returned|graded|missing|draft|resubmitted|late)$/i;

  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const textOf = el => clean(el && el.textContent);

  // One element per student: the card that carries data-submission-id.
  function findCards(doc) {
    let cards = [...doc.querySelectorAll('[data-submission-id][data-kami-view-time]')];
    if (!cards.length) {
      // Class/attr names drifted: fall back to the box around each materials block.
      cards = [...doc.querySelectorAll('[data-include-submission-materials]')]
        .map(m => m.parentElement && m.parentElement.parentElement)
        .filter(Boolean);
    }
    return [...new Set(cards)];
  }

  function nameOf(card) {
    const direct = card.querySelector('.J33wTc');
    if (direct && textOf(direct)) return textOf(direct);
    const box = card.querySelector('.lt5Mnc');
    return box ? textOf(box) : '';
  }

  function statusOf(card) {
    for (const el of card.querySelectorAll('span, div')) {
      if (el.childElementCount || el.closest('a')) continue;
      const t = textOf(el);
      if (STATUS_RE.test(t)) return t;
    }
    return '';
  }

  // [{ name, isStl, isLink }]
  function attachmentsOf(card) {
    const out = [];
    for (const a of card.querySelectorAll('a[jsname="HrdP0"]')) {
      const name = textOf(a.querySelector('.K013Jb')) || clean(a.getAttribute('title')) || clean(a.getAttribute('aria-label')) || textOf(a);
      if (!name) continue;
      let host = '';
      try { host = new URL(a.href).hostname; } catch (e) { /* relative or invalid */ }
      out.push({
        name,
        isStl: /\.stl$/i.test(name),
        isLink: !/(^|\.)(classroom|drive|docs)\.google\.com$/.test(host),
      });
    }
    return out;
  }

  // Returns { title, students: [{ id, name, status, files, others }], warnings }.
  //  files:  .stl file names
  //  others: [{ name, isLink }] attachments that are not .stl (Tinkercad links, etc.)
  function scrape(doc) {
    const warnings = [];
    const cards = findCards(doc);
    const students = cards.map(card => {
      const atts = attachmentsOf(card);
      return {
        id: card.getAttribute('data-submission-id') || '',
        name: nameOf(card),
        status: statusOf(card),
        files: atts.filter(a => a.isStl).map(a => a.name),
        others: atts.filter(a => !a.isStl).map(a => ({ name: a.name, isLink: a.isLink })),
      };
    });

    if (!students.length) {
      warnings.push("Couldn't find any student cards. Open the assignment's Student work page with all students showing, then try again.");
    } else {
      const expected = doc.querySelectorAll('tr[data-student-id]').length;
      if (expected && expected !== students.length) {
        warnings.push(`The page lists ${expected} students but only ${students.length} submissions were read. Scroll the page so everyone loads, then try again.`);
      }
      if (students.some(s => !s.name)) warnings.push('Some students had no readable name.');
    }

    return { title: clean(doc.title), students, warnings };
  }

  const api = { scrape };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RosterScrape = api;
})(typeof self !== 'undefined' ? self : this);
