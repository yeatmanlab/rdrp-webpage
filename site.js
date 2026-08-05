// Shared rendering + coin-flip navigation logic for rdrp.html and bde.html.

function renderTeam() {
  const container = document.getElementById('team-grid');
  if (!container) return;
  PEOPLE.forEach(function (p) {
    const card = document.createElement('div');
    card.className = 'text-center';
    const nameHtml = p.profileUrl
      ? '<a href="' + p.profileUrl + '" class="font-bold mt-3 text-sm block accent-text hover:underline">' + escapeHtml(p.name) + '</a>'
      : '<h4 class="font-bold mt-3 text-sm">' + escapeHtml(p.name) + '</h4>';
    card.innerHTML =
      '<img src="' + p.photo + '" alt="' + escapeHtml(p.name) + '" ' +
      'class="w-20 h-20 rounded-full object-cover mx-auto shadow" loading="lazy" ' +
      'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" />' +
      '<div class="avatar-fallback w-20 h-20 rounded-full mx-auto items-center justify-center text-lg font-bold text-white" style="display:none">' +
      initials(p.name) + '</div>' +
      nameHtml +
      '<p class="text-xs text-[#7F7776] mt-1">' + escapeHtml(p.role) + '</p>';
    container.appendChild(card);
  });
}

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
  coin.addEventListener('click', function () {
    coin.classList.add('is-navigating');
    setTimeout(function () { window.location.href = otherPageUrl; }, 420);
  });
}

function initSite(currentView, otherPageUrl) {
  renderTeam();
  renderPublications();
  renderMedia();
  renderFigures();
  setupCoin(currentView, otherPageUrl);
}
