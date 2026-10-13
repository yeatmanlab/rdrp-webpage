#!/usr/bin/env python3
"""Fail if Firebase Hosting would publish anything sensitive.

    python3 tools/check-deploy-set.py            # audit the current directory
    python3 tools/check-deploy-set.py --list     # also print every file that would ship

firebase.json uses "public": ".", so the deploy publishes the WHOLE checkout minus its
ignore list. That is a denylist, and a denylist fails open: anything nobody thought to
exclude goes live. That is exactly what happened — "**/.*" only matches dotfiles whose
LAST path segment starts with a dot, so ".git/config" (last segment "config") slipped
through, and with it the actions/checkout token that git writes into .git/config. The
whole .git/ directory was publicly downloadable from both Stanford domains until
6c920ae added "**/.*/**".

This script re-applies Firebase's ignore globs (minimatch semantics, dot:true) to the
real directory tree — including files that only exist at deploy time, like .git/config
in a CI checkout — and fails if any surviving file is sensitive by path or content.
It runs in the deploy workflow BEFORE `firebase deploy`, and is safe to run locally
before a manual deploy.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def glob_to_regex(pat):
    """minimatch-style: '**' spans path segments, '*' and '?' stay within one, dot:true."""
    pat = pat.lstrip('/')
    out, i = '', 0
    while i < len(pat):
        if pat.startswith('**/', i):   out += '(?:.*/)?'; i += 3
        elif pat.startswith('/**', i): out += '(?:/.*)?'; i += 3
        elif pat.startswith('**', i):  out += '.*';       i += 2
        elif pat[i] == '*':            out += '[^/]*';    i += 1
        elif pat[i] == '?':            out += '[^/]';     i += 1
        else:                          out += re.escape(pat[i]); i += 1
    return re.compile('^' + out + '$')

# A path is sensitive if any segment is a dot-name, or its name looks like a credential.
SENSITIVE_NAME = re.compile(
    r'(^|/)\.[^/]+(/|$)'                                   # any dot-segment: .git, .github, .env…
    r'|\.(pem|key|p12|pfx|keystore|jks)$'
    r'|(^|/)(gha-creds-[^/]*|[^/]*service[-_]?account[^/]*\.json|[^/]*credentials[^/]*\.json)$',
    re.I)
# Content checks reuse the high-confidence token formats from check-secrets.py.
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from secret_patterns import scan_text  # noqa: E402

def deploy_set(target):
    pats = [glob_to_regex(p) for p in target.get('ignore', [])]
    public = target.get('public', '.')
    files = []
    for dirpath, dirnames, filenames in os.walk(public):
        for name in filenames:
            rel = os.path.relpath(os.path.join(dirpath, name), public).replace(os.sep, '/')
            if not any(p.match(rel) for p in pats):
                files.append(rel)
    return sorted(files)

def main():
    show = '--list' in sys.argv
    cfg = json.load(open('firebase.json'))
    targets = cfg['hosting'] if isinstance(cfg['hosting'], list) else [cfg['hosting']]
    bad = 0
    for t in targets:
        files = deploy_set(t)
        name = t.get('target', 'hosting')
        flagged = []
        for f in files:
            if SENSITIVE_NAME.search(f):
                flagged.append((f, 'sensitive path'))
                continue
            if os.path.getsize(f) < 2_000_000 and not f.endswith(('.png','.jpg','.jpeg','.pdf','.gif','.webp')):
                try:
                    hits = scan_text(open(f, encoding='utf-8', errors='ignore').read())
                except OSError:
                    hits = []
                for kind, red in hits:
                    flagged.append((f, '%s %s' % (kind, red)))
        print('  [%s] %d files would be published' % (name, len(files)))
        if show:
            for f in files: print('      ' + f)
        for f, why in flagged:
            print('      BLOCKED  %-44s %s' % (f, why))
        bad += len(flagged)
    if bad:
        print('\n  FAIL: %d sensitive file(s) would be published. Fix firebase.json "ignore".' % bad)
        return 1
    print('  OK — nothing sensitive in the deploy set.')
    return 0

sys.exit(main())
