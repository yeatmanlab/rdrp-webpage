// Shared rendering + coin-flip navigation logic for rdrp.html and bde.html.

const TEAM_TAG_ORDER = ["Neuroimaging", "Reading & Literacy Science", "Educational Assessment", "Software Engineering", "School Partnerships", "Data Science"];

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
      const tag = btn.dataset.tag;
      container.querySelectorAll('.team-card').forEach(function (card) {
        const show = tag === 'all' || (card.dataset.tags || '').split('|').indexOf(tag) !== -1;
        card.style.display = show ? '' : 'none';
      });
    });
  }

  PEOPLE.forEach(function (p) {
    const card = document.createElement('div');
    card.className = 'team-card text-center';
    card.dataset.tags = (p.tags || []).join('|');
    card.tabIndex = 0;
    const nameHtml = p.profileUrl
      ? '<a href="' + p.profileUrl + '" class="font-bold mt-3 text-sm block accent-text hover:underline">' + escapeHtml(p.name) + '</a>'
      : '<h4 class="font-bold mt-3 text-sm">' + escapeHtml(p.name) + '</h4>';
    card.innerHTML =
      '<img src="' + p.photo + '" alt="' + escapeHtml(p.name) + '" ' +
      'class="w-full aspect-square object-cover rounded-2xl shadow" loading="lazy" ' +
      'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" />' +
      '<div class="avatar-fallback w-full aspect-square rounded-2xl items-center justify-center text-3xl font-bold text-white" style="display:none">' +
      initials(p.name) + '</div>' +
      nameHtml +
      '<p class="text-xs text-[#7F7776] mt-1">' + escapeHtml(p.role) + '</p>' +
      (p.summary ? '<p class="text-xs text-[#4D4F53] mt-1.5 leading-snug">' + escapeHtml(p.summary) + '</p>' : '') +
      buildTeamExpandHtml(p);
    container.appendChild(card);
    setupTeamExpand(card);
  });
}

// The extra bio/tags/links/publications panel that expands out of each team card
// on hover/focus/tap, rather than a separate floating popup positioned elsewhere.
function buildTeamExpandHtml(p) {
  let linksHtml = '';
  if (p.links) {
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
  if (!container) return;

  const byYear = {};
  PUBLICATIONS.forEach(function (p) { (byYear[p.year] = byYear[p.year] || []).push(p); });
  const years = Object.keys(byYear).map(Number).sort(function (a, b) { return b - a; });

  if (statsEl) {
    const totalCites = PUBLICATIONS.reduce(function (sum, p) { return sum + (p.citedBy || 0); }, 0);
    statsEl.innerHTML =
      '<div><span class="font-serif text-2xl font-bold">' + PUBLICATIONS.length + '</span> <span class="text-sm text-[#7F7776]">publications</span></div>' +
      '<div><span class="font-serif text-2xl font-bold">' + totalCites.toLocaleString() + '</span> <span class="text-sm text-[#7F7776]">citations (Google Scholar)</span></div>' +
      '<div><span class="font-serif text-2xl font-bold">' + years[years.length - 1] + '–' + years[0] + '</span> <span class="text-sm text-[#7F7776]">span</span></div>';
  }

  years.forEach(function (year, idx) {
    const details = document.createElement('details');
    details.className = 'border-b border-[#EDE9E0] py-3';
    if (idx < 3) details.setAttribute('open', '');

    const summary = document.createElement('summary');
    summary.className = 'cursor-pointer font-bold text-lg font-serif py-1 flex items-center gap-3';
    summary.innerHTML = '<span>' + year + '</span><span class="text-xs font-normal text-[#7F7776]">(' + byYear[year].length + ')</span>';
    details.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'mt-2 space-y-3';
    byYear[year].forEach(function (p) {
      const li = document.createElement('li');
      li.className = 'text-sm text-[#4D4F53] leading-relaxed pl-1';
      let links = '';
      if (p.url) {
        const label = /\.pdf($|\?)/.test(p.url) ? 'PDF' : 'Article';
        links += '<a href="' + p.url + '" target="_blank" rel="noopener" class="link-chip">' + label + '</a>';
      }
      if (p.scholarUrl) links += '<a href="' + p.scholarUrl + '" target="_blank" rel="noopener" class="link-chip">Google Scholar</a>';
      if (p.pubmedUrl) links += '<a href="' + p.pubmedUrl + '" target="_blank" rel="noopener" class="link-chip">PubMed</a>';
      const badge = p.citedBy ? '<span class="cite-badge">' + p.citedBy + ' citation' + (p.citedBy === 1 ? '' : 's') + '</span>' : '';
      li.innerHTML = escapeHtml(p.text) + ' ' + badge + '<div class="mt-1 flex flex-wrap gap-2">' + links + '</div>';
      list.appendChild(li);
    });
    details.appendChild(list);
    container.appendChild(details);
  });
}

function renderFigures() {
  var track = document.getElementById('figure-track');
  if (!track || typeof FIGURES === 'undefined') return;

  FIGURES.forEach(function (f) {
    var card = document.createElement('a');
    card.href = f.url;
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'figure-card group snap-start shrink-0 w-[280px] relative rounded-2xl overflow-hidden shadow-md bg-[#F5F4F0]';
    card.innerHTML =
      '<img src="' + f.image + '" alt="' + escapeHtml(f.title) + '" class="w-full h-[280px] object-contain" loading="lazy" />' +
      '<div class="figure-overlay hidden md:group-hover:flex absolute inset-0 bg-black/80 text-white p-5 flex-col justify-end">' +
        '<p class="text-xs font-bold uppercase tracking-widest text-white/70">' + f.year + '</p>' +
        '<h3 class="font-serif font-bold text-base mt-1 leading-snug">' + escapeHtml(f.title) + '</h3>' +
        '<p class="text-xs text-white/85 mt-2 leading-snug">' + escapeHtml(f.description) + '</p>' +
        '<span class="text-xs font-bold uppercase tracking-widest mt-3">Read the paper →</span>' +
      '</div>' +
      '<div class="md:hidden bg-white p-3">' +
        '<p class="font-bold text-sm leading-snug">' + escapeHtml(f.title) + '</p>' +
        '<p class="text-xs text-[#7F7776] mt-1">' + f.year + ' — tap to read the paper</p>' +
      '</div>';
    track.appendChild(card);
  });

  var prevBtn = document.getElementById('figure-prev');
  var nextBtn = document.getElementById('figure-next');
  var scrollAmount = function () { return track.querySelector('.figure-card').getBoundingClientRect().width + 16; };
  if (prevBtn) prevBtn.addEventListener('click', function () { track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }); });
  if (nextBtn) nextBtn.addEventListener('click', function () { track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }); });
}

function renderMedia() {
  const container = document.getElementById('media-list');
  if (!container || typeof MEDIA === 'undefined') return;
  MEDIA.forEach(function (m) {
    const a = document.createElement('a');
    a.href = m.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'block py-3 border-b border-[#EDE9E0] hover:bg-[#FBF9F5] -mx-2 px-2 rounded';
    a.innerHTML =
      '<p class="text-xs text-[#7F7776] uppercase tracking-wide font-bold">' + escapeHtml(m.outlet) + ' · ' + escapeHtml(m.date) + '</p>' +
      '<p class="font-semibold text-sm mt-1">' + escapeHtml(m.title) + '</p>';
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
    setTimeout(function () { window.location.href = otherPageUrl; }, 550);
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

function initSite(currentView, otherPageUrl) {
  renderTeam();
  renderPublications();
  renderMedia();
  renderFigures();
  setupCoin(currentView, otherPageUrl);
  setupSwipeDemo();
}
