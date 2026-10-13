#!/usr/bin/env python3
"""Scan for committed credentials. Never prints a secret in full.

    python3 tools/check-secrets.py             # all tracked files      (CI)
    python3 tools/check-secrets.py --staged    # what you're committing (pre-commit hook)
    python3 tools/check-secrets.py --history   # every blob ever committed, on every ref

Install the hook once per clone:   git config core.hooksPath tools/hooks
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from secret_patterns import scan_text  # noqa: E402

BINARY = ('.png','.jpg','.jpeg','.gif','.webp','.pdf','.ai','.afdesign','.emf',
          '.pptx','.woff','.woff2','.ico','.mp4','.mov')

def git(*args):
    return subprocess.run(['git', *args], capture_output=True, check=True).stdout

def targets(mode):
    if mode == '--staged':
        # the staged blob, not the working-tree file: that's what actually gets committed
        names = git('diff', '--cached', '--name-only', '--diff-filter=ACMR').decode().split('\n')
        return [(n, lambda n=n: git('show', ':' + n)) for n in names if n]
    if mode == '--history':
        seen, out = set(), []
        for line in git('rev-list', '--all', '--objects').decode().split('\n'):
            sha, _, path = line.partition(' ')
            if not path or sha in seen: continue
            seen.add(sha)
            out.append(('%s@%s' % (path, sha[:7]), lambda s=sha: git('cat-file', '-p', s)))
        return out
    names = git('ls-files').decode().split('\n')
    return [(n, lambda n=n: open(n, 'rb').read()) for n in names if n and os.path.isfile(n)]

def main():
    mode = next((a for a in sys.argv[1:] if a.startswith('--')), '--all')
    found = 0
    for label, read in targets(mode):
        if label.split('@')[0].lower().endswith(BINARY): continue
        try:
            data = read()
        except (subprocess.CalledProcessError, OSError):
            continue
        if len(data) > 5_000_000: continue
        for kind, red in scan_text(data.decode('utf-8', 'ignore')):
            print('  SECRET  %-48s %-26s %s' % (label, kind, red))
            found += 1
    if found:
        print('\n  BLOCKED: %d possible credential(s). Remove them before committing.' % found)
        print('  If one is real, REVOKE it at github.com/settings/tokens — deleting the')
        print('  file does not help once it has been pushed or deployed.')
        return 1
    print('  OK — no credentials found (%s).' % mode.lstrip('-'))
    return 0

sys.exit(main())
