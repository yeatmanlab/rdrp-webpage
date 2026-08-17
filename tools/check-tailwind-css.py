#!/usr/bin/env python3
"""Fail if assets/tailwind.css is stale — i.e. a class is used that it does not define.

    python3 tools/check-tailwind-css.py

The compiled CSS is committed, so the repo is always directly deployable and the
byte-for-byte deploy verification still works. The cost of that choice is that adding a
Tailwind class without re-running tools/build-tailwind-css.py leaves the class silently
unstyled — no error, just a quietly wrong layout. This is the guard for exactly that.

It needs no browser, so CI can run it. Rather than regenerating, it checks every token
used in a REAL class context (class="...", className = '...', classList.add('...')) and
asserts each one is either defined in assets/tailwind.css or in a page's inline <style>.
That is precisely the check that would have caught `-mx-2` (set via el.className on
site.js:292), whose absence silently shifted the whole publication list.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
PAGES = ['rdrp.html', 'bde.html', 'parents.html', 'yeatman.html']
# Structural hook classes: used only as querySelector targets / grouping handles, so
# they intentionally have no CSS rule anywhere. Add to this list only after confirming
# the class really carries no styling.
HOOKS = {'resource-card', 'media-card'}
SOURCES = PAGES + ['site.js']
CSS = 'assets/tailwind.css'

def class_contexts(text):
    """Tokens that are unambiguously intended as CSS classes."""
    out = set()
    for pat in (r'class="([^"]*)"', r"class='([^']*)'",
                r'className\s*=\s*"([^"]*)"', r"className\s*=\s*'([^']*)'",
                r"classList\.(?:add|remove|toggle)\(\s*'([^']+)'",
                r'classList\.(?:add|remove|toggle)\(\s*"([^"]+)"'):
        for m in re.finditer(pat, text):
            g = m.group(1)
            # site.js builds some attributes by concatenation, e.g.
            #   '<div class="' + fallbackClasses + '" ...'
            # Those captures are JS, not a class list — the variable's own string
            # literal is picked up by the assignment pattern below instead.
            if '+' in g or "'" in g:
                continue
            out.update(t for t in g.split() if t)
    # class lists held in a variable: const fallbackClasses = 'avatar-fallback ...'
    for m in re.finditer(r"(?:const|let|var)\s+\w*[Cc]lasses\w*\s*=\s*'([^']+)'", text):
        out.update(t for t in m.group(1).split() if t)
    return out

def selector(tok):
    return '.' + ''.join(('\\' + c) if c in '.:[]#()/%,' else c for c in tok)

def main():
    if not os.path.exists(CSS):
        print('MISSING %s — run tools/build-tailwind-css.py' % CSS)
        return 1
    css = open(CSS, encoding='utf-8').read()

    inline = ''
    for p in PAGES:
        for m in re.finditer(r'<style>(.*?)</style>', open(p, encoding='utf-8').read(), re.S):
            inline += m.group(1)

    used = set()
    for f in SOURCES:
        used |= class_contexts(open(f, encoding='utf-8').read())

    missing = []
    for t in sorted(used):
        if selector(t) in css:
            continue
        # custom class defined in a page's own <style>? (bare, or with a variant suffix)
        if re.search(r'\.' + re.escape(t) + r'(?![\w-])', inline):
            continue
        if t in HOOKS:
            continue
        missing.append(t)

    print('  %d class tokens used across %d files' % (len(used), len(SOURCES)))
    if missing:
        print('\n  STALE: %d class(es) are neither in %s nor any inline <style>:' % (len(missing), CSS))
        for t in missing:
            print('    %s' % t)
        print('\n  Run: python3 tools/build-tailwind-css.py')
        return 1
    print('  OK — every used class is defined.')
    return 0

sys.exit(main())
