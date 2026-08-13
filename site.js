// Shared rendering + coin-flip navigation logic for rdrp.html and bde.html.

const TEAM_TAG_ORDER = ["Faculty", "Postdoc", "Student", "Staff", "Neuroimaging", "Reading & Literacy Science", "Educational Assessment", "Software Engineering", "School Partnerships", "Data Science"];

const PROGRAM_TAG_ORDER = ["Reading & Dyslexia Research Program", "Brain Development & Education Lab"];

const PUBS_TAG_ORDER = [
  "White Matter", "Reading Development & Dyslexia",
  "Vision Science", "ROAR & Reading Assessment", "Visual Word Form Area",
  "Clinical Populations & Neurological Conditions",
  "Open Source Software and Computational Methods",
  "Reading Intervention & Neuroplasticity",
  "Brain Development in Infancy & Childhood", "Education, Equity & Policy",
];

// Surfaces a person's most recent papers by matching their surname(s) against
// PUBLICATIONS' author-list strings (format "Surname, F." or "FI Surname,").
function recentPublicationsFor(surnames) {
  if (!surnames || !surnames.length || typeof PUBLICATIONS === 'undefined') return [];
  const matches = PUBLICATIONS.filter(function (p) {
    return surnames.some(function (sn) {
      const escaped = sn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('\\b' + escaped + ',\\s*[A-Z]').test(p.text);
    });
  });
  matches.sort(function (a, b) { return b.year - a.year; });
  return matches.slice(0, 3);
}

function renderTeam() {
  const container = document.getElementById('team-grid');
  const filterBar = document.getElementById('team-filters');
  if (!container) return;

  const tagCounts = {};
  PEOPLE.forEach(function (p) { (p.tags || []).forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
  const tagsPresent = TEAM_TAG_ORDER.filter(function (t) { return tagCounts[t]; });

  if (filterBar) {
    let pillsHtml = '<button class="filter-pill active" data-tag="all">All (' + PEOPLE.length + ')</button>';
    tagsPresent.forEach(function (t) {
      pillsHtml += '<button class="filter-pill" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + ' (' + tagCounts[t] + ')</button>';
    });
    filterBar.innerHTML = pillsHtml;
    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyTeamFilter(container, btn.dataset.tag);
    });
  }

  PEOPLE.forEach(function (p) {
    const card = document.createElement('div');
    card.className = 'team-card text-center';
    card.dataset.tags = (p.tags || []).join('|');
    card.tabIndex = 0;
    const nameHtml = p.profileUrl
      ? '<h3 class="font-bold mt-3 text-sm"><a href="' + p.profileUrl + '" class="block accent-text hover:underline">' + escapeHtml(p.name) + '</a></h3>'
      : '<h3 class="font-bold mt-3 text-sm">' + escapeHtml(p.name) + '</h3>';
    card.innerHTML =
      '<div class="team-photo-wrap relative aspect-square rounded-2xl shadow overflow-hidden">' +
        buildAvatarHtml(p) +
        buildTeamExpandHtml(p) +
      '</div>' +
      nameHtml +
      '<p class="text-xs text-[#6B6560] mt-1">' + escapeHtml(p.role) + '</p>' +
      (p.summary ? '<p class="text-xs text-[#4D4F53] mt-1.5 leading-snug">' + escapeHtml(p.summary) + '</p>' : '');
    container.appendChild(card);
    setupTeamExpand(card);
  });
}

// Photo with an initials avatar as the fallback. When no photo file is listed at all we
// skip the <img> and show the initials straight away, so a person without a headshot
// costs no failed request.
function buildAvatarHtml(p) {
  const fallbackClasses = 'avatar-fallback absolute inset-0 items-center justify-center text-3xl font-bold text-white';
  if (!p.photo) {
    return '<div class="' + fallbackClasses + '" style="display:flex">' + initials(p.name) + '</div>';
  }
  return '<img src="' + p.photo + '" alt="' + escapeHtml(p.name) + '" ' +
    'class="w-full h-full object-cover" loading="lazy" ' +
    'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" />' +
    '<div class="' + fallbackClasses + '" style="display:none">' + initials(p.name) + '</div>';
}

function renderAlumni() {
  const container = document.getElementById('alumni-grid');
  if (!container || typeof ALUMNI === 'undefined' || !ALUMNI.length) return;

  ALUMNI.forEach(function (p) {
    const card = document.createElement('div');
    card.className = 'team-card text-center';
    card.tabIndex = 0;
    card.innerHTML =
      '<div class="team-photo-wrap relative aspect-square rounded-2xl shadow overflow-hidden">' +
        buildAvatarHtml(p) +
        buildTeamExpandHtml(p) +
      '</div>' +
      '<h3 class="font-bold mt-3 text-sm">' + escapeHtml(p.name) + '</h3>' +
      '<p class="text-xs text-[#6B6560] mt-1">' + escapeHtml(p.role) + '</p>';
    container.appendChild(card);
    setupTeamExpand(card);
  });
}

// Filters the team grid with a two-phase shuffle: cards leaving the filter fade out
// first (while everyone else is still in their old spot, so there's no reflow to
// fight), then the grid re-flows and every remaining/entering card animates from its
// old screen position to its new one (a FLIP animation) instead of snapping instantly.
function applyTeamFilter(container, tag) {
  const cards = [].slice.call(container.querySelectorAll('.team-card'));
  const willShow = function (card) { return tag === 'all' || (card.dataset.tags || '').split('|').indexOf(tag) !== -1; };
  const leaving = cards.filter(function (c) { return c.style.display !== 'none' && !willShow(c); });

  function reflowAndReveal() {
    const beforeRects = new Map();
    cards.forEach(function (c) {
      if (c.style.display !== 'none') beforeRects.set(c, c.getBoundingClientRect());
    });

    cards.forEach(function (c) { c.style.display = willShow(c) ? '' : 'none'; });

    cards.forEach(function (c) {
      if (!willShow(c)) return;
      const before = beforeRects.get(c);
      c.style.transition = 'none';
      if (before) {
        const after = c.getBoundingClientRect();
        const dx = before.left - after.left, dy = before.top - after.top;
        c.style.transform = (dx || dy) ? 'translate(' + dx + 'px,' + dy + 'px)' : '';
        c.style.opacity = '';
      } else {
        c.style.transform = 'scale(.88)';
        c.style.opacity = '0';
      }
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cards.forEach(function (c) {
          if (!willShow(c)) return;
          c.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1), opacity .35s ease';
          c.style.transform = '';
          c.style.opacity = '';
        });
      });
    });
  }

  if (!leaving.length) { reflowAndReveal(); return; }

  leaving.forEach(function (c) {
    c.style.transition = 'transform .2s ease, opacity .2s ease';
    c.style.transform = 'scale(.88)';
    c.style.opacity = '0';
  });
  setTimeout(reflowAndReveal, 200);
}

// The extra bio/tags/links/publications panel that expands out of each team card
// on hover/focus/tap, rather than a separate floating popup positioned elsewhere.
function buildTeamExpandHtml(p) {
  let linksHtml = '';
  if (p.links) {
    if (p.links.stanfordProfile) linksHtml += '<a href="' + p.links.stanfordProfile + '" target="_blank" rel="noopener" class="link-chip">Stanford Profile ↗</a>';
    if (p.links.website) linksHtml += '<a href="' + p.links.website + '" target="_blank" rel="noopener" class="link-chip">Website ↗</a>';
    if (p.links.linkedin) linksHtml += '<a href="' + p.links.linkedin + '" target="_blank" rel="noopener" class="link-chip">LinkedIn ↗</a>';
    if (p.links.scholar) linksHtml += '<a href="' + p.links.scholar + '" target="_blank" rel="noopener" class="link-chip">Scholar ↗</a>';
  }

  const pubs = recentPublicationsFor(p.pubMatch);
  let pubsHtml = '';
  if (pubs.length) {
    pubsHtml = '<div class="team-expand-pubs"><div class="team-expand-pubs-title">Recent Publications</div><ul>' +
      pubs.map(function (pub) {
        const link = pub.url || pub.scholarUrl || pub.pubmedUrl;
        const text = escapeHtml(pub.text.length > 130 ? pub.text.slice(0, 127) + '…' : pub.text);
        return '<li>' + text + (link ? ' <a href="' + link + '" target="_blank" rel="noopener">↗</a>' : '') + '</li>';
      }).join('') + '</ul></div>';
  }

  if (!p.bio && !linksHtml && !pubsHtml && !(p.tags && p.tags.length)) return '';

  return '<div class="team-expand">' +
    (p.bio ? '<p class="team-expand-bio">' + escapeHtml(p.bio) + '</p>' : '') +
    (p.tags && p.tags.length ? '<div class="team-expand-tags">' + p.tags.map(function (t) { return '<span class="team-tag-pill">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') +
    (linksHtml ? '<div class="team-expand-links">' + linksHtml + '</div>' : '') +
    pubsHtml +
    '</div>';
}

// Hover/focus already reveal .team-expand via CSS; click/tap toggles it too, so it
// works on touch devices and lets a click "pin" it open on desktop.
function setupTeamExpand(card) {
  card.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    if (!card.querySelector('.team-expand')) return;
    const wasOpen = card.classList.contains('expanded');
    document.querySelectorAll('.team-card.expanded').forEach(function (c) {
      if (c !== card) c.classList.remove('expanded');
    });
    card.classList.toggle('expanded', !wasOpen);
  });
}

document.addEventListener('click', function (e) {
  if (e.target.closest('.team-card')) return;
  document.querySelectorAll('.team-card.expanded').forEach(function (c) { c.classList.remove('expanded'); });
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.team-card.expanded').forEach(function (c) { c.classList.remove('expanded'); });
  }
});

function initials(name) {
  return name.replace(/,.*/, '').split(' ').filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function renderPublications() {
  const container = document.getElementById('pubs-list');
  const statsEl = document.getElementById('pubs-stats');
  const filterBar = document.getElementById('pubs-filters');
  if (!container) return;

  const byYear = {};
  PUBLICATIONS.forEach(function (p) { (byYear[p.year] = byYear[p.year] || []).push(p); });
  const years = Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; });

  if (statsEl) {
    const totalCites = PUBLICATIONS.reduce(function (sum, p) { return sum + (p.citedBy || 0); }, 0);
    statsEl.innerHTML =
      '<div><span class="font-serif text-2xl font-bold">' + PUBLICATIONS.length + '</span> <span class="text-sm text-[#6B6560]">publications</span></div>' +
      '<div><span class="font-serif text-2xl font-bold">' + totalCites.toLocaleString() + '</span> <span class="text-sm text-[#6B6560]">citations (Google Scholar)</span></div>' +
      '<div><span class="font-serif text-2xl font-bold">' + years[years.length - 1] + '–' + years[0] + '</span> <span class="text-sm text-[#6B6560]">span</span></div>';
  }

  if (filterBar) {
    const tagCounts = {};
    PUBLICATIONS.forEach(function (p) { (p.tags || []).forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
    const tagsPresent = PUBS_TAG_ORDER.filter(function (t) { return tagCounts[t]; });
    let pillsHtml = '<button class="filter-pill filter-pill-primary active" data-tag="all">All (' + PUBLICATIONS.length + ')</button>';
    PROGRAM_TAG_ORDER.forEach(function (t) {
      if (!tagCounts[t]) return;
      pillsHtml += '<button class="filter-pill filter-pill-primary" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + ' (' + tagCounts[t] + ')</button>';
    });
    pillsHtml += '<span class="pill-divider" aria-hidden="true"></span>';
    tagsPresent.forEach(function (t) {
      pillsHtml += '<button class="filter-pill" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + ' (' + tagCounts[t] + ')</button>';
    });
    filterBar.innerHTML = pillsHtml;
    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applyPubsFilter(container, btn.dataset.tag);
    });
  }

  years.forEach(function (year, idx) {
    const details = document.createElement('details');
    details.className = 'border-b border-[#EDE9E0] py-3';
    // Only the newest year starts expanded. With all 18 open the section ran ~14,500px —
    // 58% of the whole page — so the thing most worth featuring was the least scannable.
    // Collapsed, you see 18 year headers with counts and open what you want.
    // applyPubsFilter reads defaultOpen to restore this when the filter returns to "all",
    // and force-opens any year that contains matches while a filter is active.
    const openByDefault = idx === 0;
    details.dataset.defaultOpen = openByDefault ? '1' : '0';
    if (openByDefault) details.setAttribute('open', '');

    const summary = document.createElement('summary');
    summary.className = 'cursor-pointer font-bold text-lg font-serif py-1 flex items-center gap-3';
    summary.innerHTML = '<span>' + year + '</span><span class="text-xs font-normal text-[#6B6560]">(' + byYear[year].length + ')</span>';
    details.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'mt-2 space-y-3';
    byYear[year].forEach(function (p) {
      const li = document.createElement('li');
      li.className = 'pub-item text-sm text-[#4D4F53] leading-relaxed relative rounded-lg -mx-2 px-2 py-1.5 transition-colors hover:bg-white focus-within:bg-white hover:shadow-sm focus-within:shadow-sm';
      li.dataset.tags = (p.tags || []).join('|');
      let links = '';
      if (p.url) {
        const label = /\.pdf($|\?)/.test(p.url) ? 'PDF' : 'Article';
        links += '<a href="' + p.url + '" target="_blank" rel="noopener" class="link-chip">' + label + '</a>';
      }
      if (p.scholarUrl) links += '<a href="' + p.scholarUrl + '" target="_blank" rel="noopener" class="link-chip">Google Scholar</a>';
      if (p.pubmedUrl) links += '<a href="' + p.pubmedUrl + '" target="_blank" rel="noopener" class="link-chip">PubMed</a>';
      if (p.pdf) links += '<a href="' + p.pdf + '" target="_blank" rel="noopener" class="link-chip">PDF</a>';
      const badge = p.citedBy ? '<span class="cite-badge">' + p.citedBy + ' citation' + (p.citedBy === 1 ? '' : 's') + '</span>' : '';
      const primaryLink = p.url || p.scholarUrl || p.pubmedUrl || p.pdf;
      const citationHtml = primaryLink
        ? '<a href="' + primaryLink + '" target="_blank" rel="noopener" class="hover:underline">' + escapeHtml(p.text) + '</a>'
        : escapeHtml(p.text);
      li.innerHTML = citationHtml + ' ' + badge + '<div class="mt-1 flex flex-wrap gap-2">' + links + '</div>' + buildPubCardHtml(p);
      list.appendChild(li);
      positionPubCardOnHover(li);
    });
    details.appendChild(list);
    details.dataset.year = String(year);
    // A closed year renders nothing, so letting the last open one close would leave the
    // list empty with no explanation. Keep at least one year showing. Re-opening fires
    // another toggle, which returns early, so this can't loop.
    details.addEventListener('toggle', function () {
      if (details.open) return;
      const anyOpen = [].slice.call(container.querySelectorAll('details'))
        .some(function (d) { return d.open && d.style.display !== 'none'; });
      if (!anyOpen) details.open = true;
    });
    container.appendChild(details);
  });

  buildPubYearStrip(container, years, byYear);
}

// "Jump to" index above the publication list: one chip per year, plus an expand-all
// toggle. Chips scroll to a year and open it rather than filtering, so they compose with
// the topic pills instead of competing with them.
function buildPubYearStrip(container, years, byYear) {
  const strip = document.getElementById('pubs-years');
  if (!strip) return;

  strip.innerHTML = '<span class="pubs-years-label">Jump to</span>';
  const toggle = document.createElement('button');
  toggle.className = 'pub-year-all';
  toggle.type = 'button';
  toggle.textContent = 'Expand all';
  strip.appendChild(toggle);

  years.forEach(function (year) {
    const chip = document.createElement('button');
    chip.className = 'pub-year-chip';
    chip.type = 'button';
    chip.dataset.year = String(year);
    // No count here — each year's own heading already shows "(12)", and dropping it is
    // what keeps all 18 chips on a single line inside the 944px column.
    chip.textContent = String(year);
    chip.setAttribute('aria-label', year + ' — ' + byYear[year].length + ' publications');
    chip.addEventListener('click', function () {
      const target = container.querySelector('details[data-year="' + year + '"]');
      if (!target) return;
      // One year at a time. Closed years render nothing now, so leaving several open would
      // just rebuild the long list the chips exist to replace.
      [].slice.call(container.querySelectorAll('details')).forEach(function (d) { d.open = (d === target); });
      markActiveYearChip(String(year));
      syncPubYearChips();
      // Land the year heading just below the header and this strip, both of which stick.
      const offset = stickyOffset() + strip.getBoundingClientRect().height + 10;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
    strip.appendChild(chip);
  });

  toggle.addEventListener('click', function () {
    const groups = [].slice.call(container.querySelectorAll('details'));
    const visible = groups.filter(function (d) { return d.style.display !== 'none'; });
    const expanding = visible.some(function (d) { return !d.open; });
    visible.forEach(function (d) {
      d.open = expanding ? true : d.dataset.defaultOpen === '1';
    });
    // Only the newest year carries defaultOpen, so if a topic filter has excluded it,
    // collapsing would close everything and empty the list. Fall back to the newest
    // year the filter did leave in place.
    if (!expanding && visible.length && !visible.some(function (d) { return d.open; })) {
      visible[0].open = true;
    }
    toggle.textContent = expanding ? 'Collapse all' : 'Expand all';
  });

  syncPubYearChips();
  window.addEventListener('scroll', scheduleYearSpy, { passive: true });
}

function stickyOffset() {
  const header = document.querySelector('body > header') || document.querySelector('header');
  return header ? header.getBoundingClientRect().height : 62;
}

function markActiveYearChip(year) {
  document.querySelectorAll('.pub-year-chip').forEach(function (c) {
    c.classList.toggle('active', c.dataset.year === year);
  });
}

// Hide chips for years the topic filter has emptied out, and reset the expand-all label
// so it always describes what the button will actually do next.
function syncPubYearChips() {
  const container = document.getElementById('pubs-list');
  const strip = document.getElementById('pubs-years');
  if (!container || !strip) return;
  let shown = 0;
  strip.querySelectorAll('.pub-year-chip').forEach(function (chip) {
    const d = container.querySelector('details[data-year="' + chip.dataset.year + '"]');
    const visible = d && d.style.display !== 'none';
    chip.hidden = !visible;
    if (visible) shown++;
  });
  strip.hidden = shown < 2;   // a single year needs no index
  const toggle = strip.querySelector('.pub-year-all');
  if (toggle) {
    const visible = [].slice.call(container.querySelectorAll('details')).filter(function (d) { return d.style.display !== 'none'; });
    toggle.textContent = visible.length && visible.every(function (d) { return d.open; }) ? 'Collapse all' : 'Expand all';
  }
}

// Highlight whichever year is currently under the strip, so the index reflects position.
let yearSpyQueued = false;
function scheduleYearSpy() {
  if (yearSpyQueued) return;
  yearSpyQueued = true;
  requestAnimationFrame(function () {
    yearSpyQueued = false;
    const container = document.getElementById('pubs-list');
    const strip = document.getElementById('pubs-years');
    if (!container || !strip || strip.hidden) return;
    const line = stickyOffset() + strip.getBoundingClientRect().height + 16;
    let current = null;
    [].slice.call(container.querySelectorAll('details')).forEach(function (d) {
      // Closed years are display:none, so their rect collapses to 0 and would otherwise
      // always test as "above the line". Only open, filter-visible years can be current.
      if (!d.open || d.style.display === 'none') return;
      if (d.getBoundingClientRect().top <= line) current = d.dataset.year;
    });
    if (current) markActiveYearChip(current);
  });
}

// The card normally opens upward above its row; for rows near the top of the
// viewport (e.g. right below the sticky header) that would push the card off
// screen, so flip it to open downward instead when there isn't room above.
function positionPubCardOnHover(li) {
  function check() {
    const card = li.querySelector('.pub-card');
    if (!card) return;
    // Measure from the default (upward-opening) position, not whatever the
    // card's current flipped state happens to be, or this would oscillate:
    // reset first, then decide.
    card.classList.remove('flip-down');
    const rect = card.getBoundingClientRect();
    card.classList.toggle('flip-down', rect.top < 8);
  }
  li.addEventListener('mouseenter', check);
  li.addEventListener('focusin', check);
}

// Only renders a hover card once a paper has a real summary — papers not yet written
// up just show the plain citation, so nothing looks broken while coverage is filled in.
function buildPubCardHtml(p) {
  if (!p.summary) return '';
  const figureHtml = p.figure ? '<img src="' + p.figure + '" alt="Key result figure" class="pub-card-figure" loading="lazy" />' : '';
  return '<div class="pub-card">' + figureHtml + '<p class="pub-card-summary">' + escapeHtml(p.summary) + '</p></div>';
}

// Same fade-out-then-FLIP-in shuffle as the team filter, adapted for a year-grouped
// accordion: a year auto-opens if filtering reveals a match inside it, and collapses
// back to its original open/closed state once the filter returns to "all".
function applyPubsFilter(container, tag) {
  const items = [].slice.call(container.querySelectorAll('.pub-item'));
  const willShow = function (li) { return tag === 'all' || (li.dataset.tags || '').split('|').indexOf(tag) !== -1; };
  const isOpen = function (li) { const d = li.closest('details'); return !d || d.open; };
  const leaving = items.filter(function (li) { return li.style.display !== 'none' && isOpen(li) && !willShow(li); });

  function reflowAndReveal() {
    const beforeRects = new Map();
    items.forEach(function (li) {
      if (li.style.display !== 'none' && isOpen(li)) beforeRects.set(li, li.getBoundingClientRect());
    });

    items.forEach(function (li) { li.style.display = willShow(li) ? '' : 'none'; });

    [].slice.call(container.querySelectorAll('details')).forEach(function (d) {
      const anyMatch = [].slice.call(d.querySelectorAll('.pub-item')).some(willShow);
      d.style.display = anyMatch ? '' : 'none';
      if (tag === 'all') d.open = d.dataset.defaultOpen === '1';
      else if (anyMatch) d.open = true;
    });
    syncPubYearChips();   // drop chips for years this filter emptied out

    items.forEach(function (li) {
      if (!willShow(li) || !isOpen(li)) return;
      const before = beforeRects.get(li);
      li.style.transition = 'none';
      if (before) {
        const after = li.getBoundingClientRect();
        const dx = before.left - after.left, dy = before.top - after.top;
        li.style.transform = (dx || dy) ? 'translate(' + dx + 'px,' + dy + 'px)' : '';
        li.style.opacity = '';
      } else {
        li.style.transform = 'translateY(-8px)';
        li.style.opacity = '0';
      }
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        items.forEach(function (li) {
          if (!willShow(li) || !isOpen(li)) return;
          li.style.transition = 'transform .45s cubic-bezier(.34,1.56,.64,1), opacity .3s ease';
          li.style.transform = '';
          li.style.opacity = '';
        });
      });
    });
  }

  if (!leaving.length) { reflowAndReveal(); return; }
  leaving.forEach(function (li) {
    li.style.transition = 'transform .18s ease, opacity .18s ease';
    li.style.transform = 'translateY(-8px)';
    li.style.opacity = '0';
  });
  setTimeout(reflowAndReveal, 180);
}

// Shared by both pages' figure carousels (BDE's brain-imaging figures and RDRP's
// ROAR/dyslexia findings) - same markup and scroll behavior, different data + ids.
function shuffled(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// A single-slide auto-rotating carousel: loads in random order, advances every
// 12s, and resets that timer on any manual interaction (arrows, dots, or just
// hovering/focusing the slider) so it doesn't yank a slide away mid-read.
// Pull the paper title out of a full citation: "Authors (2026). Title. Journal, vol, pages."
// Titles can end in ? or ! as well as . — two of the 92 do.
function pubTitleFromCitation(text) {
  const m = text.match(/\(\d{4}[a-z]?\)\.\s*(.+?)[.?!]\s/);
  return m ? m[1] : null;
}

function pubYearFromCitation(text) {
  const m = text.match(/\((\d{4})[a-z]?\)/);
  return m ? m[1] : '';
}

// A horizontally swipeable strip of every publication in this page's program that has a
// figure, newest first. Each card shows year + title; hovering (or focusing) reveals the
// full summary, so long academic summaries never get truncated mid-clause.
function renderPubFigureStrip(programTag) {
  const strip = document.getElementById('pubfig-strip');
  if (!strip || typeof PUBLICATIONS === 'undefined') return;

  const items = PUBLICATIONS
    .filter(function (p) { return p.figure && (p.tags || []).indexOf(programTag) !== -1; })
    .slice()
    .sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
  if (!items.length) return;

  items.forEach(function (p) {
    const href = p.url || p.scholarUrl || p.pubmedUrl || p.pdf;
    const card = document.createElement(href ? 'a' : 'div');
    card.className = 'pubfig-card';
    if (href) { card.href = href; card.target = '_blank'; card.rel = 'noopener'; }
    card.tabIndex = 0;
    const title = pubTitleFromCitation(p.text) || p.text;
    // Downscaled copy for the card; the full-size figure stays for the publication hover card.
    const thumb = 'assets/figures/thumbs/' + p.figure.split('/').pop();
    card.innerHTML =
      '<div class="pubfig-fig"><img data-src="' + thumb + '" alt="" /></div>' +
      '<div class="pubfig-body">' +
        '<p class="pubfig-year">' + escapeHtml(pubYearFromCitation(p.text)) + '</p>' +
        '<p class="pubfig-title">' + escapeHtml(title) + '</p>' +
      '</div>' +
      (p.summary ? '<div class="pubfig-over"><p>' + escapeHtml(p.summary) + '</p></div>' : '');
    strip.appendChild(card);
  });

  // loading="lazy" doesn't help here: every card sits inside the vertical viewport, so the
  // browser would fetch all 48-65 figures at once. Observe against the strip's own scroll
  // box instead, so only what's near the horizontal viewport loads.
  const imgs = strip.querySelectorAll('.pubfig-fig img[data-src]');
  const load = function (img) {
    if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        load(e.target);
        io.unobserve(e.target);
      });
    }, { root: strip, rootMargin: '0px 600px' });
    imgs.forEach(function (img) { io.observe(img); });
  } else {
    imgs.forEach(load);
  }

  const step = function () {
    const c = strip.querySelector('.pubfig-card');
    return c ? c.getBoundingClientRect().width + 16 : 280;
  };
  const glide = makeStripGlider(strip);
  const prev = document.getElementById('pubfig-prev');
  const next = document.getElementById('pubfig-next');
  if (prev) prev.addEventListener('click', function () { glide.by(-step() * 2, 760); });
  if (next) next.addEventListener('click', function () { glide.by(step() * 2, 760); });

  // Grey out an arrow once you can't travel any further that way, and keep the rail
  // thumb tracking the scroll position so the strip reads as something you can slide.
  const railThumb = document.getElementById('pubfig-rail-thumb');
  const syncArrows = function () {
    const travel = strip.scrollWidth - strip.clientWidth;
    if (prev) prev.classList.toggle('is-off', strip.scrollLeft <= 2);
    if (next) next.classList.toggle('is-off', strip.scrollLeft >= travel - 2);
    if (railThumb) {
      const rail = railThumb.parentElement.clientWidth;
      const frac = strip.clientWidth / strip.scrollWidth;          // how much is on screen
      const w = Math.max(26, Math.round(rail * frac));
      const p = travel > 0 ? strip.scrollLeft / travel : 0;
      railThumb.style.width = w + 'px';
      railThumb.style.transform = 'translateX(' + Math.round(p * (rail - w)) + 'px)';
    }
  };
  strip.addEventListener('scroll', syncArrows);
  window.addEventListener('resize', syncArrows);
  syncArrows();

  setupPubFigureStripMotion(strip, step, [prev, next], glide);
}

// Native scrollBy({behavior:'smooth'}) is short and hard-eased, and scroll-snap re-settles
// after it lands, so a timed step reads as two small jerks. This drives scrollLeft itself
// over a longer eased curve, with snap suspended while it runs.
function makeStripGlider(strip) {
  let raf = null, snapWas = null;

  const easeInOutCubic = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const releaseSnap = function () {
    if (snapWas !== null) { strip.style.scrollSnapType = snapWas; snapWas = null; }
  };

  const stop = function () {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    releaseSnap();
  };

  const to = function (target, duration) {
    const max = strip.scrollWidth - strip.clientWidth;
    const end = Math.max(0, Math.min(max, target));
    const from = strip.scrollLeft;
    const delta = end - from;
    if (Math.abs(delta) < 1) return;

    if (raf) cancelAnimationFrame(raf);
    if (snapWas === null) snapWas = strip.style.scrollSnapType || '';
    strip.style.scrollSnapType = 'none';

    const t0 = performance.now();
    const frame = function (now) {
      const p = Math.min(1, (now - t0) / duration);
      strip.scrollLeft = from + delta * easeInOutCubic(p);
      if (p < 1) { raf = requestAnimationFrame(frame); return; }
      raf = null;
      strip.scrollLeft = end;   // land exactly on the card boundary before snap returns
      releaseSnap();
    };
    raf = requestAnimationFrame(frame);
  };

  return {
    to: to,
    by: function (dx, duration) { to(strip.scrollLeft + dx, duration); },
    stop: stop,
    get busy() { return raf !== null; }
  };
}

// Cards settle into place the first time the strip scrolls into view, then it steps one
// card along every 4s. The auto-advance yields to the reader: hovering a card reveals its
// summary, so anything that looks like reading or manual navigation pauses it.
function setupPubFigureStripMotion(strip, step, arrows, glide) {
  const cards = [].slice.call(strip.querySelectorAll('.pubfig-card'));
  if (!cards.length) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AUTO_MS = 3000;
  const RESUME_MS = 9000;   // after the visitor drives it themselves, wait before taking over again

  // Only the cards that can actually be seen need staggering; the rest are off to the right.
  const dealt = Math.min(cards.length, 8);
  if (!reduceMotion) {
    strip.classList.add('is-dealing');
    cards.forEach(function (c, i) {
      if (i < dealt) c.style.transitionDelay = (i * 70) + 'ms';
    });
  }

  let timer = null, held = 0, entered = false, inView = false, engaged = false;

  const atEnd = function () { return strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 4; };
  const tick = function () {
    // `engaged` covers the whole time a pointer rests on the strip (a card's summary is
    // showing then); `held` is the cool-down after a scroll, swipe, or arrow click.
    if (engaged || Date.now() < held || glide.busy) return;
    if (!atEnd()) { glide.by(step(), 1150); return; }
    // Racing ~12,000px back to the first card would be a blur, so cross-fade instead.
    strip.classList.add('is-rewinding');
    setTimeout(function () {
      // If a hand arrived mid-fade, abandon the rewind rather than yanking them back.
      if (!engaged && Date.now() >= held) strip.scrollLeft = 0;
      strip.classList.remove('is-rewinding');
    }, 420);
  };
  const play = function () { if (!reduceMotion && !timer && inView && !document.hidden) timer = setInterval(tick, AUTO_MS); };
  const pause = function () { if (timer) { clearInterval(timer); timer = null; } };
  const holdOff = function () { held = Date.now() + RESUME_MS; };

  // Only a real mouse resting on the strip counts as `engaged` — that's when a card's
  // summary is on screen. Touch taps synthesize mouseenter but often never deliver the
  // matching mouseleave, which would strand `engaged` and kill the advance for the whole
  // visit; touch instead gets the `held` cool-down below, via touchstart.
  const isMouse = function (e) { return !e.pointerType || e.pointerType === 'mouse'; };
  strip.addEventListener('pointerenter', function (e) { if (isMouse(e)) engaged = true; });
  strip.addEventListener('pointerleave', function (e) { if (isMouse(e)) { engaged = false; holdOff(); } });
  strip.addEventListener('pointercancel', function () { engaged = false; });
  strip.addEventListener('focusin', function () { engaged = true; });
  strip.addEventListener('focusout', function () { engaged = false; holdOff(); });
  // A hand on the strip wins immediately: kill any glide in flight so it isn't fought.
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    strip.addEventListener(ev, function () { glide.stop(); holdOff(); }, { passive: true });
  });
  (arrows || []).forEach(function (btn) {
    if (btn) btn.addEventListener('click', holdOff);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else play();
  });

  if (!('IntersectionObserver' in window)) {
    strip.classList.remove('is-dealing');
    inView = true;
    play();
    return;
  }

  // Deal on the first look; only run the timer while the strip is actually on screen.
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      inView = e.isIntersecting;
      if (!inView) { pause(); glide.stop(); return; }
      if (!entered) {
        entered = true;
        requestAnimationFrame(function () { strip.classList.remove('is-dealing'); });
      }
      play();
    });
  }, { threshold: 0.2 });
  io.observe(strip);
}

// The hero buttons just activate the matching permanent program pill (added
// alongside "All" in the filter bar) so there's one consistent way to filter,
// highlight what's active, and get back to "All" - no separate clear control.
function setupHeroPubsButtons() {
  const filterBar = document.getElementById('pubs-filters');
  const section = document.getElementById('publications');
  if (!filterBar || !section) return;

  const wire = function (id, tag) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); // this button sits inside .side-panel, which flips to the other page on click
      const pill = filterBar.querySelector('.filter-pill[data-tag="' + tag + '"]');
      if (pill) pill.click();
      section.scrollIntoView({ behavior: 'smooth' });
    });
  };
  wire('hero-pubs-rdrp', 'Reading & Dyslexia Research Program');
  wire('hero-pubs-bde', 'Brain Development & Education Lab');
}

function setupResourceSlider() {
  const track = document.getElementById('resource-track');
  if (!track) return;
  const prevBtn = document.getElementById('resource-prev');
  const nextBtn = document.getElementById('resource-next');
  const scrollAmount = function () { return track.querySelector('.resource-card').getBoundingClientRect().width + 16; };
  if (prevBtn) prevBtn.addEventListener('click', function () { track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }); });
  if (nextBtn) nextBtn.addEventListener('click', function () { track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }); });
}

const MEDIA_FALLBACK_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15l-5-4-6 5-3-2-4 3"/></svg>';

function renderMedia() {
  const container = document.getElementById('media-list');
  if (!container || typeof MEDIA === 'undefined') return;
  container.className = (container.className || '') + ' grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  const filterBar = document.getElementById('media-filters');
  if (filterBar) {
    const tagCounts = {};
    MEDIA.forEach(function (m) { (m.tags || []).forEach(function (t) { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
    const tagsPresent = MEDIA_TAG_ORDER.filter(function (t) { return tagCounts[t]; });
    let pillsHtml = '<button class="filter-pill active" data-tag="all">All</button>';
    tagsPresent.forEach(function (t) {
      pillsHtml += '<button class="filter-pill" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
    });
    filterBar.innerHTML = pillsHtml;
    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      filterBar.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const tag = btn.dataset.tag;
      container.querySelectorAll('.media-card').forEach(function (card) {
        const show = tag === 'all' || (card.dataset.tags || '').split('|').indexOf(tag) !== -1;
        card.style.display = show ? '' : 'none';
      });
    });
  }

  MEDIA.forEach(function (m) {
    const a = document.createElement('a');
    a.href = m.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'media-card block rounded-2xl border border-[#DAD7CB] overflow-hidden hover:shadow-md transition-shadow bg-white';
    a.dataset.tags = (m.tags || []).join('|');
    const mediaHtml = m.image
      ? '<img src="' + m.image + '" alt="" class="w-full aspect-square object-cover" loading="lazy" />'
      : '<div class="w-full aspect-square tint-14 flex items-center justify-center accent-text">' + MEDIA_FALLBACK_ICON + '</div>';
    const tagsHtml = (m.tags || []).map(function (t) {
      return '<span class="media-tag">' + escapeHtml(t) + '</span>';
    }).join('');
    a.innerHTML =
      mediaHtml +
      '<div class="p-3">' +
      '<p class="text-[10px] text-[#6B6560] uppercase tracking-wide font-bold">' + escapeHtml(m.outlet) + ' · ' + escapeHtml(m.date) + '</p>' +
      '<p class="font-semibold text-[13px] mt-1 leading-snug">' + escapeHtml(m.title) + '</p>' +
      '<div class="flex flex-wrap gap-1 mt-2">' + tagsHtml + '</div>' +
      '</div>';
    container.appendChild(a);
  });
}

function setupCoin(currentView, otherPageUrl) {
  const coin = document.getElementById('coin');
  if (!coin) return;
  if (currentView === 'bde') coin.classList.add('is-flipped');

  let navigating = false;
  function flipAndGo() {
    if (navigating) return;
    navigating = true;
    coin.classList.add('is-navigating');
    setTimeout(function () { window.location.href = otherPageUrl; }, 900);
  }

  coin.addEventListener('click', flipAndGo);
  document.querySelectorAll('.side-panel').forEach(function (panel) {
    panel.addEventListener('click', flipAndGo);
  });
}

// Swipe-card interaction modeled on braindr's own animation (rotate 13deg +
// translate off-screen + fade, cubic-bezier(1,.5,.8,1)) — see github.com/SwipesForScience.
function setupSwipeDemo() {
  const stage = document.getElementById('swipe-stage');
  if (!stage || typeof BRAINDR_EXAMPLES === 'undefined' || !BRAINDR_EXAMPLES.length) return;

  const passBtn = document.getElementById('swipe-pass');
  const failBtn = document.getElementById('swipe-fail');
  const tally = document.getElementById('swipe-tally');
  const order = BRAINDR_EXAMPLES.map(function (_, i) { return i; });
  let cursor = 0;
  let passCount = 0, failCount = 0;
  let dragging = null;

  function makeCard(offset, depth) {
    const f = BRAINDR_EXAMPLES[order[(cursor + offset) % order.length]];
    const card = document.createElement('div');
    card.className = 'swipe-card';
    card.style.zIndex = String(10 - depth);
    card.style.transform = 'scale(' + (1 - depth * 0.045).toFixed(3) + ') translateY(' + (depth * 8) + 'px)';
    card.innerHTML =
      '<img src="' + f.image + '" alt="' + escapeHtml(f.title) + '" draggable="false" />' +
      '<div class="swipe-card-label">' + escapeHtml(f.title) + '</div>';
    return card;
  }

  function render() {
    stage.innerHTML = '';
    for (let d = 2; d >= 0; d--) stage.appendChild(makeCard(d, d));
  }

  function topCard() {
    const cards = stage.querySelectorAll('.swipe-card');
    return cards.length ? cards[cards.length - 1] : null;
  }

  function updateTally() {
    tally.textContent = passCount + ' pass · ' + failCount + ' fail — click, drag, or use arrow keys';
  }

  function flyOut(card, dir, onDone) {
    card.style.transition = 'transform .55s cubic-bezier(1,.5,.8,1), opacity .55s cubic-bezier(1,.5,.8,1)';
    requestAnimationFrame(function () {
      card.style.transform = 'translate3d(' + (dir === 'pass' ? 130 : -130) + '%,0,0) rotate(' + (dir === 'pass' ? 13 : -13) + 'deg)';
      card.style.opacity = '0';
    });
    setTimeout(onDone, 550);
  }

  function resolve(dir) {
    const top = topCard();
    if (!top || top.dataset.resolving) return;
    top.dataset.resolving = '1';
    if (dir === 'pass') passCount++; else failCount++;
    updateTally();
    flyOut(top, dir, function () {
      cursor = (cursor + 1) % order.length;
      render();
    });
  }

  passBtn.addEventListener('click', function () { resolve('pass'); });
  failBtn.addEventListener('click', function () { resolve('fail'); });
  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') resolve('pass');
    if (e.key === 'ArrowLeft') resolve('fail');
  });

  stage.addEventListener('pointerdown', function (e) {
    const top = topCard();
    if (!top || e.target.closest('.swipe-card') !== top) return;
    dragging = { card: top, startX: e.clientX };
    top.style.transition = 'none';
    top.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    dragging.dx = e.clientX - dragging.startX;
    dragging.card.style.transform = 'translate3d(' + dragging.dx + 'px,0,0) rotate(' + (dragging.dx / 14) + 'deg)';
  });
  stage.addEventListener('pointerup', function () {
    if (!dragging) return;
    const card = dragging.card, dx = dragging.dx || 0;
    dragging = null;
    if (Math.abs(dx) > 60) {
      resolve(dx > 0 ? 'pass' : 'fail');
    } else {
      card.style.transition = 'transform .3s ease';
      card.style.transform = 'scale(1) translateY(0)';
    }
  });

  render();
  updateTally();
}

function setupMobileNav() {
  const btn = document.getElementById('mobile-nav-toggle');
  const panel = document.getElementById('mobile-nav-panel');
  if (!btn || !panel) return;

  function close() {
    panel.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  }
  function open() {
    panel.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.classList.contains('hidden')) open(); else close();
  });
  panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('#mobile-nav-panel') || e.target.closest('#mobile-nav-toggle')) return;
    close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
}

function initSite(currentView, otherPageUrl) {
  renderTeam();
  renderAlumni();
  renderPublications();
  renderMedia();
  renderPubFigureStrip(currentView === 'rdrp' ? 'Reading & Dyslexia Research Program' : 'Brain Development & Education Lab');
  setupHeroPubsButtons();
  setupResourceSlider();
  setupCoin(currentView, otherPageUrl);
  setupSwipeDemo();
  setupMobileNav();
}
