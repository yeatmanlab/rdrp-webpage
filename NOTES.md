# Project notes

Working notes for picking this project back up. This is a hand-built static site (no
build step, no framework) prototyping a replacement for **dyslexia.stanford.edu** (RDRP)
and **edneuro.stanford.edu** (BDE Lab) — two sides of the same lab, toggled with a
coin-flip. **roar.stanford.edu** is a separate, related product and is linked out to,
not reproduced here.

**Live site:** https://yeatmanlab.github.io/rdrp-webpage/
**Repo:** yeatmanlab/rdrp-webpage, `main` branch, deployed via GitHub Pages (branch: main, path: /)

## Migrating to Firebase Hosting (multi-domain)

Moving to Firebase Hosting so `dyslexia.stanford.edu` and `edneuro.stanford.edu` can
each be a real custom domain with the correct page at `/` (GitHub Pages can only take
one custom domain per repo). `firebase.json` is already written for this — two hosting
targets (`rdrp`, `bde`), both serving this same directory, each rewriting `/` to its own
homepage. What's left needs your own Firebase account/CLI access, not something I can
do from here:

1. `npm install -g firebase-tools` (or use `npx firebase-tools` each time), then `firebase login`.
2. Create a Firebase project at console.firebase.google.com if you don't have one yet.
3. In that project's Hosting tab, add **two** sites (site IDs are globally unique across
   all of Firebase, so you'll need to pick available names — e.g. try `yeatmanlab-rdrp`
   and `yeatmanlab-bde`, or similar).
4. From this repo, link the targets already defined in `firebase.json` to those two real
   site IDs — this is what generates `.firebaserc` (not committed yet, since it needs
   your actual project ID):
   ```bash
   firebase target:apply hosting rdrp <your-rdrp-site-id>
   firebase target:apply hosting bde <your-bde-site-id>
   firebase deploy --only hosting
   ```
5. In the Firebase console, open each site's settings and add its custom domain
   (`dyslexia.stanford.edu` → the `rdrp` site, `edneuro.stanford.edu` → the `bde` site).
   Firebase will give you TXT/A/CNAME records — those need to go through whoever
   currently manages DNS for those two subdomains (likely Stanford GSE/Medicine web
   services), not something either of us can add directly.
6. Once both domains actually resolve here, the coin flip's `otherPageUrl` in the
   `initSite(...)` call at the bottom of `rdrp.html`/`bde.html` should change from a
   relative path (`bde.html` / `rdrp.html`) to the absolute cross-domain URL
   (`https://edneuro.stanford.edu/` / `https://dyslexia.stanford.edu/`) — one-line change
   per file, deliberately not made yet since the domains aren't live.

## Structure

- `index.html` — redirects to `rdrp.html` (GitHub Pages needs something at `/`)
- `rdrp.html` / `bde.html` — the two homepages. Same header/coin-flip pattern, distinct
  hero/research/CTA content per program's actual audience (RDRP = participants/parents,
  BDE = academic/funding/software).
- `yeatman.html` — Jason Yeatman's bio, teaching/mentorship philosophy, and courses.
  Linked from his card in the Team section on both homepages.
- `parents.html` — Resources for Parents. Used to be the `#parents` section inside
  `rdrp.html`; it's a page now because families arriving for it shouldn't have to scroll
  past a research program to reach it, and because a linkable URL is what gets passed
  around by teachers and clinicians. Four things point at it, all on `rdrp.html`: the
  desktop nav, the mobile nav, the `Resources for Parents →` button under Why This
  Research Matters, and the footer's Explore list. There is no `#parents` anchor left
  anywhere — if you re-add one, fix all four.
- `shared-data.js` — the single source of truth for `PEOPLE`, `PUBLICATIONS`, `MEDIA`,
  and `FIGURES`. Both homepages render Team/Publications/Media from this file via
  `site.js`, so they never drift out of sync with each other.
- `site.js` — rendering logic (`renderTeam`, `renderPublications`, `renderMedia`,
  `renderFigures`) plus the coin-flip-then-navigate behavior and the mobile nav
  dropdown (`setupMobileNav`, toggled below the `lg` breakpoint on both pages).
- **The two pages deliberately diverge in section order**, because their audiences do.
  - `rdrp.html`: hero → mission → ROAR (`#roar`) → ROAR@Home (`#research`) →
    **Publications** → People → Media → Involved. ROAR stays first because this page's
    arrivals are teachers and parents looking for the screener; putting 136 papers ahead
    of it would bury the practical content. Publications sits above People (screen 3.4,
    was 7.9). Parents lives on its own page and so is a nav item without a section.
  - `bde.html`: hero → research statement (`#research`) → **Publications** → People →
    Software → ROAR → Media → Involved. A research audience, so Publications leads
    directly off the research statement (screen 1.8).
  - The header nav and the mobile panel are kept in page order on each page, so the two
    nav lists differ too. Don't "unify" them without also unifying the section order.
  `#media` (In the Media) is its own section on both pages, not nested under
  `#publications` — `renderMedia()` just targets `#media-list` wherever it lives.
- `#research` on `bde.html` is the **Lab Mission** statement — an `h2` plus one ~765-character
  paragraph, above the four project cards. The `.section-lead` rule in that page's `<style>`
  carries the paragraph: `clamp()` sizing (16.5px → 19px) so it scales without breakpoints,
  `line-height:1.6`, and `max-width:67ch`.
  - Measure it, don't assume it. Source Sans 3's `ch` is narrow — 67ch renders ~633px and
    71 characters a line, inside the comfortable 45-75 range. 72ch overshot at 77, and 62ch
    squeezed it to an 11-line 585px ribbon.
  - Not a Tailwind utility stack: `text-*` ships its own `line-height` and beats `leading-*`
    on the Play CDN, which pinned 24px type to 32px leading on the first attempt.
  - "virtuous cycle between education and neuroscience" links to Yeatman & Yablonski 2025
    (`https://doi.org/10.1111/mbe.70017`), the same DOI that paper's `PUBLICATIONS` entry
    uses, so the prose link and the publication row can't drift apart.
  - That link is underlined by default, unlike the site's other inline prose links
    (`accent-text hover:underline` at the Braindr and tractometry-cite paragraphs). Colour
    alone isn't a sufficient affordance inside a long paragraph. If you'd rather they all
    match, change these three together, not just this one.

- The **virtuous-cycle figure** beside the Lab Mission (`.cycle` in `bde.html`) is slide 2
  of Jason's deck rebuilt for the web — the same diagram the Yeatman & Yablonski 2025
  manuscript figure is built on. Photos came out of the `.pptx`:
  `assets/figures/mission/brain-tracts.png` (transparent tractography render, cropped to its
  own alpha bbox then padded to a centred square so it sits concentrically in a circular
  mask) and `classroom.jpg` (centre crop biased 28% up, because the faces sit above centre).
  - **The arrows are the slide's own vector art, not an approximation.** The shaft bezier and
    the swept arrowhead were parsed out of the EMF the `.pptx` ships (`image6.emf`: local
    space 2906x1342, pen width 53) and re-emitted as SVG paths. A stroked quarter-circle with
    a triangle `marker-end` was the first attempt and read as clunky — the real arrow is a
    much shallower arc with a concave head. Each arrow is one `<use>` of the same `<g>`,
    placed by mapping its local chord `(25,1324)->(2870,170)` onto each leg of the cycle:
    `translate(tip) rotate(chordAngle - (-22.1)) scale(chordLen/3070) translate(-25 -1324)`.
    Re-deriving those two transforms is the price of changing the layout.
  - **Everything lives in the one 400x300 viewBox** — photos as `<image>`+`clipPath`, labels as
    `<foreignObject>`. That's what lets the box be any height: `preserveAspectRatio` scales the
    whole diagram uniformly. An earlier version mixed CSS-positioned circles with an SVG arrow
    layer, which pins the figure to a fixed aspect ratio — change the height and the arrow tips
    drift off the circles.
  - From `lg` up the figure takes its height from the mission paragraph (`height:100%` in a
    stretch row), so the two columns end level. Below `lg` it's stacked and nothing sets the row
    height, so it falls back to an explicit `aspect-ratio:4/3` **plus a 560px cap**. Without the
    cap it ran the full column width — 962x722 at a 1010px viewport, which blows the photos up
    to 332px each. The cap doesn't bind at phone widths (327px at 390).
  - The brain sits on a `#F1EFE8` disc — one step darker than the card, no accent tint. It gives
    the tractography the same node identity the classroom photo's circle has, and it absorbs the
    render's slight overhang past the disc edge. A hairline ring was the alternative and was
    rejected for exactly that reason: a thin line turns the overhang into a visible mistake.
  - Label geometry was measured, not guessed: circle-to-rect clearance is computed from the
    circle's centre to the nearest rect point, because bounding boxes overlap on a circle
    long before the ink does. The centre pill overlapped both photos by 19px until the nodes
    went 50%->46% and the pill 38%->27%; it now clears both by 18px.
  - The two labels are near-square (~1.8:1 and 2.2:1) rather than wide-and-flat. A fixed
    amount of text has a roughly fixed area, so narrowing the box from 45% to 30% trades
    width for lines — which is what paid for 14px type instead of 11px.
  - Labels are **desktop-only**. Below `lg` they're hidden and hover/tap reveals the same
    words as a scrim, because there is no room for them at phone width.
  - The centre label is an outlined circle with no fill, and it's a **link** — along with the
    mission prose and the mobile scrim heading, it carries `data-pub-doi` and jumps to that
    paper's row in `#pubs-list` rather than leaving the page. See `setupPubJumpLinks` in
    `site.js`: the row is unreachable at rest (its year is collapsed, and a collapsed year
    renders nothing), so the handler clears any topic filter, opens the year, then scrolls and
    flashes the row. It measures after forcing a reflow rather than inside
    `requestAnimationFrame`, because rAF is paused in a background tab and the scroll would be
    dropped. The `href` stays `#publications` so it degrades without JS.
  - Reveal is `:hover, :focus`, **not `:focus-visible`**. A touch screen has no hover; a tap
    fires focus. `:focus-visible` would leave the labels unreachable on a phone. The
    `.pubfig-card` rules nearby keep `:focus-visible` on purpose — different job.
  - The grid track was `auto` once and the figure collapsed to 2x2px: `.cycle`'s children are
    all absolutely positioned, so its content width is 0 and `width:100%` resolved to the 2px
    of border. It's `lg:grid-cols-2` now — definite tracks only.

- The figure strip has no section of its own: it sits at the top of `#publications`,
  directly under that section's `Yeatman Lab Publications` heading, on both pages. There is no
  `#figures` id anymore, and nothing links to one.
- `renderPubFigureStrip(programTag)` builds that strip from every `PUBLICATIONS` entry
  that has a `figure` and carries the page's program tag — 49 cards on rdrp, 65 on bde,
  newest first (92 of the 136 papers have a figure). Those counts move whenever a paper's
  program tags change, so don't treat them as fixed. Card titles are parsed out of the citation string by
  `pubTitleFromCitation` (the `text` field is a full citation; there is no short-title
  field). Each card shows year + title, and reveals the full `summary` on hover/focus,
  because these summaries average ~460 characters and clamping them to two lines cut
  every one mid-clause.
- **Lab-hosted PDFs** live in `assets/papers/` — 55 of 136 publications (40%), ~138 MB. Only
  open-access papers are hosted: every one is CC BY, CC BY-NC, or CC BY-NC-ND, checked via
  the PMC open-access service before download. Do not add a paywalled publisher PDF here.
  - The two routes that used to work are now closed. PMC's `/articles/PMCxxx/pdf/` endpoint
    serves a bot interstitial ("Preparing to download..."), and NCBI has retired the bulk
    `ftp.ncbi.nlm.nih.gov/pub/pmc/oa_pdf/` and `/oa_package/` trees — both roots 404, so the
    hrefs `oa.fcgi` still hands out are stale. What does work is publisher-direct:
    `nature.com/articles/<id>.pdf`, `journals.plos.org/.../article/file?id=<doi>&type=printable`,
    `elifesciences.org/articles/<n>.pdf`, `biorxiv.org/content/<doi>v1.full.pdf`,
    `joss.theoj.org/papers/<doi>.pdf`. Frontiers, PNAS and ARVO all refuse automated fetches.
  - Nothing on the site links to `edneuro.stanford.edu/wp-content/...` any more. That domain
    now serves *this* site via Firebase, so the old WordPress upload paths 404 — nine links
    were pointing at them and all nine had a local copy already.

- Publication **topic tags** live only in `shared-data.js`; `PUBS_TAG_ORDER` in `site.js`
  controls which ones become pills and in what order. Both must be edited together — a tag
  missing from `PUBS_TAG_ORDER` silently gets no pill, and a name mismatch between the two
  files does the same. Current vocabulary, with counts, kept in descending order because
  that is how the pill row reads:
  White Matter (56) · Reading Development & Dyslexia (48) · Vision Science (23) ·
  Brain Development (22) · ROAR & Reading Assessment (17) · Visual Word Form Area (14) ·
  Brain Plasticity & Learning (14) · Clinical Populations (13) ·
  Open Source Software and Computational Methods (12) · Education, Equity & Policy (8).
  - Every paper carries at least one topic tag; the pills are the only way to narrow the
    list by subject, so an untagged paper is reachable only by year.
  - The two **program** tags (`Reading & Dyslexia Research Program`, `Brain Development &
    Education Lab`) are not topic tags. They also drive the figure strip, so adding one to
    a paper that has a `figure` adds a card to that page's strip.
  - `Brain Development` means age-related change in the brain — maturation trajectories,
    myelination rates, brain-age, lifespan change. Experience-driven change belongs under
    `Brain Plasticity & Learning`, and papers that merely recruit children get neither.

- `#pubs-years` is the "Jump to" year index above the publication list, built by
  `buildPubYearStrip`. Chips select a year and open it — they don't filter — so they
  compose with the topic pills rather than competing with them. It replaced 17 stacked
  collapsed year rows (1,037px) with one 44px line.
  - A closed year renders nothing: `#pubs-list details:not([open]){ display:none; }`.
    The chip strip is the index, so an empty header row per closed year was the very
    problem the strip exists to solve. All 18 groups and 136 entries stay in the DOM.
  - Selection is therefore exclusive — opening a year closes the others, since several
    open years would rebuild the long list the chips replace. `Expand all` is how you
    see everything at once.
  - Year counts are deliberately omitted from the chips: each year's own heading already
    shows "(12)", and dropping them is what fits all 18 chips on a single line in the
    944px column. The count is still exposed to screen readers via `aria-label`.
  - The `Expand all` / `Collapse all` toggle only acts on years the topic filter has left
    visible, and "collapse" restores `data-defaultOpen` (newest year only) rather than
    closing everything.
  - `syncPubYearChips` hides chips for years a topic filter has emptied, and hides the
    whole strip when fewer than two years remain. It's called from `applyPubsFilter`.
  - `scheduleYearSpy` highlights whichever year is currently under the strip.
  - Sticky only from `lg` up. At phone widths the 18 chips wrap to 3 rows (101px) which,
    with the 65px header, would permanently consume ~20% of the viewport; there it sits
    at the top of the list as an ordinary index. `z-index:20` keeps it below `.pub-card`
    (40) so publication hover summaries still float over it.
- `setupPubFigureStripMotion` handles the strip's motion. Cards are held at
  `opacity:0` behind the `.is-dealing` class from render, and settle into place with a
  70ms-per-card stagger the first time the strip scrolls into view, so it reads as
  populating on arrival rather than having always been there. Only the first 8 get a
  stagger delay — the rest are off-screen to the right anyway. The offset is Y-only:
  an X shift would change `scrollWidth`, and the strip clips `overflow-y`.
- `makeStripGlider` drives `scrollLeft` from a rAF loop over an easeInOutCubic curve
  instead of using `scrollBy({behavior:'smooth'})`. The native version threw a card's
  width across in ~430ms with a hard ease, and `scroll-snap` then re-settled after it
  landed, so each timed step read as two small jerks. A step is now 1150ms nominal
  (~1017ms of actual pixel movement), ramping 0.4px → 5px → 0.4px per frame, with
  `scroll-snap-type` suspended for the duration and the final position set exactly on the
  card boundary before snap is handed back. Arrows use the same glider at 760ms.
- The summary is a sheet that slides up from the bottom of the card on hover/focus. Its
  height is its own content, capped at `calc(100% - 32px)` so a slice of the figure always
  stays visible behind it — at that cap every one of the 48 and 65 summaries fits without
  scrolling (the longest, 643 chars, needed 241px of a 286px card), leaving 32px of figure
  at worst and ~92px typically.
- A slim rail under the strip (`.pubfig-rail`) carries a thumb sized to the visible
  fraction and positioned by scroll offset, so the strip reads as something you can slide.
  It replaces the thin native scrollbar, which is now hidden.
- The strip then steps one card every 3s, and yields to the reader. Because hovering a
  card reveals its summary, an `engaged` flag suppresses advancing for the entire time a
  pointer or focus rests on the strip (not just on enter), and a 9s `held` cool-down
  covers manual scrolls, swipes, keys, and arrow clicks. The timer only runs while the
  strip is on screen and the tab is visible, and restarts on `visibilitychange`.
  At the end it cross-fades back to the first card (`.is-rewinding`) rather than gliding
  ~12,000px, which would just be a blur. `prefers-reduced-motion: reduce` disables the
  deal, the auto-advance, and the rewind fade.
- Images are deliberately NOT `loading="lazy"`: in a horizontal strip every card sits
  inside the vertical viewport, so the browser would fetch all 48-65 figures at once
  (7.6 MB / 11.8 MB). An IntersectionObserver rooted on the strip loads ~6 up front and
  more as you scroll. `overflow-anchor:none` stops scroll-snap walking the start
  position forward as those images arrive.
- `assets/figures/thumbs/` holds card-sized copies, all exactly 560x373 (3:2), built by
  `tools/fit-figure-thumbs.py`. Regenerate with `python3 tools/fit-figure-thumbs.py`
  (optionally passing filenames to redo only some). It trims each figure's background
  margin, then cuts to the box ratio **at a background gutter** rather than mid-panel, so
  cards never show half a plot or a clipped axis label, and pads any small remainder in
  the figure's own background colour. Wide figures keep their left edge and tall ones
  their top, so panel "a" — conventionally the headline result — survives. Full-size
  originals stay in place and still feed the publication rows' hover cards.
- `assets/logos/`, `assets/people/`, `assets/figures/` — real logos, team headshots, and
  brain-imaging figures, all sourced from the lab's own sites or PubMed Central (open
  access), then resized/optimized locally.
- `assets/logos/source/` — original design files (.ai/.svg/.afdesign) for the lab's logo
  marks, kept for future re-editing. Not referenced by any page directly.
- `prototypes/` — earlier design explorations (Option A/B/C), kept for reference only.
  Not linked from the live pages.
- `.claude/launch.json` — lets Claude Code preview the site locally via a static server.

## Data provenance

- **People**: edneuro.stanford.edu/people + roar.stanford.edu/team, photos downloaded
  and re-optimized. Flat, alphabetical by surname — deliberately not grouped by rank.
- **Publications**: Jason's official Stanford CAP CV cross-referenced against his Google
  Scholar profile for citation counts and precise per-paper Scholar links, then backfilled
  with PubMed/PMC links via NCBI's E-utilities API for anything missing an official link.
  `citedBy` is a snapshot (dated in the file's own header comment) — it will drift and
  there's no live refresh.
- **Figures**: 11 real figures per page pulled from open-access PMC versions of lab papers,
  selected for visual range across 2012–2026, not citation count.
- **Coin-face logo marks**: `rdrp-round.svg` is hand-built — the real Stanford seal
  (cropped from the lab's own seal artwork) centered in a ring with "Reading & Dyslexia
  Research Program" on a curved `textPath`, styled after the lab's round "Yeatman Lab"
  logo (`assets/logos/source/YeatmaLab_Round.svg`). `bde-mark.png` is a resized crop of
  `lab_logo_bookstack_Stanford_web_square.png`, one of the lab's existing bookstack
  illustrations — swapped in because it reads better at coin scale than the previous
  plain book+brain crop.
- **Media**: mix of items from Jason's CV's outreach list and Stanford News / Stanford
  GSE / Stanford Medicine Children's Health coverage found via web search — not
  algorithmically complete, just what's been found and verified so far.
- **Research Focus / mentorship content**: Jason's 2021 tenure personal statement
  (`~/Research/CV/Yeatman_ResearchProgram_Tenure_20210823.pdf`) — noted as outdated by
  Jason himself, used for framing/themes rather than current specifics. Cross-checked
  current grants against the CV where they overlap.

## Images: `width`/`height` attributes need `w-auto` when CSS sets only a height

Every `<img>` carries its true intrinsic `width`/`height` so the browser can reserve
space before the file loads (no layout shift). With Tailwind there is a trap:

Preflight ships `img, video { max-width:100%; height:auto }`. That `height:auto` beats
the **height** attribute's presentational hint (specificity 0,0,1 vs 0,0,0), so the
height attribute never distorts anything. Nothing overrides the **width** hint, though.
So on an image whose only sizing utility is a height — `h-6`, `h-7 sm:h-9`, `h-12` —
adding `width="1896"` resolves to `width:1896px`, clamped by `max-width:100%` to the
container. Measured on the header lockup: 193x36 became **1232x36**, blowing the logo
across the nav links.

Fix is one class. Any image with a height utility and no width utility gets `w-auto`,
which is author-level `width:auto` and outranks the hint; width then comes from the
attribute-derived aspect ratio. 21 images needed it (header lockups, footer lockups,
affiliation logos). Images sized with `w-full`, `w-32 h-32`, or `aspect-square` were
never affected because author CSS already set a width.

`loading="lazy"` is on everything except 8 above-the-fold images — the three header
lockups, the two hero coin faces per page, and Jason's portrait — since lazy-loading
the LCP element delays it. Lazy does work inside the horizontal ROAR@Home scroller;
verified by a pixel-identical 390px screenshot diff.

When screenshot-diffing either main page, note that the figure carousel calls
`shuffled()` (site.js) on every load, so a ~266px band will always differ. That is
the carousel picking a different start slide, not a regression.

## Sitemaps and robots.txt are per-host, via Firebase rewrites

A sitemap may only list URLs on the host that serves it, and the same restriction
applies to a `Sitemap:` line in robots.txt. Both Stanford domains serve the whole repo
from one deploy, so a single shared file could not satisfy both — one host would always
point at the other's URLs, which Google skips unless both domains are verified in one
Search Console account.

Each host therefore gets its own pair, served at the canonical paths by rewrite:

| request | dyslexia.stanford.edu | edneuro.stanford.edu |
|---|---|---|
| `/sitemap.xml` | `sitemap-rdrp.xml` (3 urls) | `sitemap-bde.xml` (1 url) |
| `/robots.txt` | `robots-rdrp.txt` | `robots-bde.txt` |

Two things make this work, and both are easy to undo by accident:

1. **There must be no static `sitemap.xml` or `robots.txt` in the repo.** Firebase
   rewrites only fire when no file matches the path, so re-adding either one would
   silently shadow both rewrites and restore the cross-host problem.
2. **Each target `ignore`s the other's variants**, so
   `dyslexia.stanford.edu/sitemap-bde.xml` does not exist.

The union of the two sitemaps equals the four `<link rel="canonical">` values — keep
them in step when adding a page. GitHub Pages now serves neither `/robots.txt` nor
`/sitemap.xml`, which costs nothing: there they sat under `/rdrp-webpage/...`, and
crawlers only honour robots.txt at a domain root.

## Accessibility

**Skip link.** `.skip-link` is the first child of `<body>` on all four pages, translated
off-screen until `:focus`. Target is `<main id="main" tabindex="-1">`. yeatman.html had
no `<main>` and got one wrapping everything between `</header>` and the page footer —
note that page has *two* `<footer>` elements, the first being the blockquote's
attribution, so match the last one when touching that structure.

**Collapsed team panels must not be tabbable.** `.team-expand` was hidden with
`opacity:0` alone, which leaves its links in the tab order: a keyboard user hit 114
invisible focus targets per page before reaching the footer. It now also sets
`visibility:hidden`, and `.team-card` already carries `tabIndex = 0` (site.js:59, 97) so
the card itself is the focus target that reveals the panel.

The transition timing is load-bearing:

```
base:   transition: opacity .3s ease, transform .3s ease, visibility 0s linear .3s;
reveal: transition: opacity .3s ease, transform .3s ease, visibility 0s;
```

Reveal flips visibility instantly; hiding delays it by the fade duration so the panel
doesn't vanish abruptly. Putting a *duration* on visibility (`visibility .3s`) instead
silently breaks the reveal — measured: the panel stayed `hidden` after `.focus()`.

Verified: 373 → 259 tabbable elements collapsed, rising to 265 with one card focused
(exactly that card's 6 links), panel `hidden → visible` on focus.

**Contrast (WCAG AA, 4.5:1 for normal text).** All pairs pass except one known
exception:

- `#7F7776` was 4.37:1 on white / 4.15:1 on cream. Replaced with the palette's existing
  `#6B6560` (5.74 / 5.46), which also removes a redundant near-duplicate gray. It was
  only used 7 times, all in yeatman.html.
- **Still failing:** teal accent `#007C92` on teal `tint-8` is **4.40:1**. That is the
  `.link-chip` on bde's project cards — 11px/700, which does not qualify as large text,
  so it misses AA by 0.1. Fixing it means darkening the brand teal (≈`#00697A`), which
  is a brand decision, not a code one. Maroon has no equivalent problem (8.12:1).

## Tailwind is compiled and committed, not loaded from the CDN

`assets/tailwind.css` (~20 KB) replaces the Play CDN's 407 KB / 126 KB-compressed
JavaScript that used to compile CSS in the browser on every page load. It is committed
rather than built at deploy time, deliberately: the deploy check compares local bytes
against all three hosts, which only works if what is committed is what is served.

**Regenerate after adding or removing any Tailwind class:**

```bash
python3 tools/build-tailwind-css.py
```

That script drives the same pinned 3.4.17 Play CDN build and captures what it emits, so
the compiled file is the CSS the browser was already applying — no specificity or
emission-order drift. `tools/check-tailwind-css.py` (also run by CI, no browser needed)
fails if any used class is missing from the CSS.

Three things here are load-bearing:

1. **The `<link>` must sit at the END of `<head>`, after the inline `<style>`.** The CDN
   injected its sheet *after* the inline style, so Tailwind utilities win ties against
   the page's own CSS. Measured: `.probe-lead{font-size:19px;line-height:1.6}` loses to
   `text-2xl`, computing to 24px/32px. That is the same effect that forced
   `.section-lead` to exist as a real rule. Put the `<link>` next to where the script
   tag used to be and every such tie silently flips.

2. **The class scanner must read the whole raw file, not just `class="..."`.** site.js
   sets classes three ways, and `-mx-2` appears only in an `el.className = '...'`
   assignment (~line 292). A scanner limited to `class="..."` missed it, and the failure
   was silent: the publication list shifted 8px and the media grid collapsed from
   3 columns to 1, growing the page by 5906px. Tailwind's real extractor tokenizes
   everything and discards non-utilities; ours now does the same.

3. **Verify with element geometry, not pixels.** The figure carousel shuffles on every
   load, so pixel diffs always show a ~266px band — enough noise to hide a real
   regression. Measuring `getBoundingClientRect()` plus computed styles for a set of
   selectors across both variants caught the collapse immediately and confirmed the fix
   (all four pages: identical docHeight, identical geometry on every element).

Equivalent build if you have the standalone CLI instead of Chrome:

```bash
tailwindcss-3.4.17 -c tailwind.config.js -i tools/tailwind-src.css -o assets/tailwind.css --minify
```

## Headshot sizing — bigger than it looks

Team headshots are NOT thumbnails. `#team-grid` is `sm:grid-cols-2 lg:grid-cols-4`, so
the rendered square is:

| viewport | columns | photo | needs @2x |
|---|---|---|---|
| 390px | 1 | 326px | 704px |
| 768px | 2 | 332px | 717px |
| 1280px | 4 | 266px | 575px |

The **phone** is the largest case, because the grid collapses to one column. Hover also
scales 1.08. So the source floor is ~700px on the short side — `object-cover` +
`aspect-square` crop to a square, so the short side is what fills the box.

Originals live in `assets/people/original/` (excluded from Firebase deploys via
`firebase.json` ignore). Current files are capped at 700px short side and encoded at
JPEG q86 progressive: 1775 KB -> 1034 KB, verified as no visible change in an A/B at
326px display size, including the 66% cuts.

Note for future photo collection: **30 of 36 headshots are still under 532px on the
short side**, i.e. already soft on a 2x desktop card. The constraint here is source
material, not compression — ask for larger files when people send new photos rather
than upscaling these.

## Known gaps / deferred (ask before assuming these are wanted)

- Full individual People bios beyond Jason's page — nav/team currently only deep-links
  his card. Everyone else is name/role/one-line-bio only.
- No general About page for the lab as a whole (history, location details beyond the
  footer address).
- `PUBLICATIONS.citedBy` will go stale — no mechanism to refresh it.
- A handful of older/obscure publications (mostly pre-2015 conference abstracts, JOSS
  software notes) have no official link at all — Scholar/PubMed search links only.
- Real "Participate"/"Join the Lab" signup flows don't exist — those CTAs were
  deliberately removed rather than left as dead buttons; the sections are informational
  text only until there's a real form to point to.

## Local preview

```bash
python3 -m http.server 4321 --directory /Users/jyeatman/git/rdrp-webpage
```
Then open `http://localhost:4321/rdrp.html`. Or use Claude Code's `preview_start` with
the `site` config already in `.claude/launch.json`.
