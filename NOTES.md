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
  how to use it at home → parent resources, before Figures/Team/Publications/Media.
  `#media` (In the Media) is its own section on both pages, not nested under
  `#publications` — `renderMedia()` just targets `#media-list` wherever it lives.
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
- **Figures**: 8 real figures pulled from open-access PMC versions of lab papers,
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
