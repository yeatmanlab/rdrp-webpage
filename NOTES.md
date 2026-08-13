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
- `shared-data.js` — the single source of truth for `PEOPLE`, `PUBLICATIONS`, `MEDIA`,
  and `FIGURES`. Both homepages render Team/Publications/Media from this file via
  `site.js`, so they never drift out of sync with each other.
- `site.js` — rendering logic (`renderTeam`, `renderPublications`, `renderMedia`,
  `renderFigures`) plus the coin-flip-then-navigate behavior and the mobile nav
  dropdown (`setupMobileNav`, toggled below the `lg` breakpoint on both pages).
- Section order on `rdrp.html` deliberately introduces ROAR (`#roar`) before ROAR@Home
  (`#research`) before Parents (`#parents`), so the story reads mission → what ROAR is →
  how to use it at home → parent resources, before Team/Publications/Media.
  `#media` (In the Media) is its own section on both pages, not nested under
  `#publications` — `renderMedia()` just targets `#media-list` wherever it lives.
- The figure strip has no section of its own: it sits at the top of `#publications`,
  directly under that section's `Publications` heading, on both pages. There is no
  `#figures` id anymore, and nothing links to one.
- `renderPubFigureStrip(programTag)` builds that strip from every `PUBLICATIONS` entry
  that has a `figure` and carries the page's program tag — 48 cards on rdrp, 65 on bde,
  newest first. Card titles are parsed out of the citation string by
  `pubTitleFromCitation` (the `text` field is a full citation; there is no short-title
  field). Each card shows year + title, and reveals the full `summary` on hover/focus,
  because these summaries average ~460 characters and clamping them to two lines cut
  every one mid-clause.
- `#pubs-years` is the "Jump to" year index above the publication list, built by
  `buildPubYearStrip`. Chips select a year and open it — they don't filter — so they
  compose with the topic pills rather than competing with them. It replaced 17 stacked
  collapsed year rows (1,037px) with one 44px line.
  - A closed year renders nothing: `#pubs-list details:not([open]){ display:none; }`.
    The chip strip is the index, so an empty header row per closed year was the very
    problem the strip exists to solve. All 18 groups and 136 entries stay in the DOM.
  - Selection is therefore exclusive — opening a year closes the others, since several
    open years would rebuild the long list the chips replace. `Expand all` is how you
    see everything at once. Year counts are deliberately omitted
  from the chips: each year's own heading already shows "(12)", and dropping them is what
  fits all 18 chips on a single line in the 944px column.
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
