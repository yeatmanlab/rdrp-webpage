"""High-confidence credential formats, shared by check-secrets.py and check-deploy-set.py.

Kept deliberately narrow: every pattern here is a fixed vendor prefix or a structural
marker, so a hit is almost certainly real. A noisy scanner gets bypassed with
--no-verify; a quiet one keeps getting run. GitHub push protection (enable it on the
repo) covers ~200 more formats server-side.
"""
import re

PATTERNS = [
    ('GitHub classic PAT',        re.compile(r'\bghp_[A-Za-z0-9]{36}\b')),
    ('GitHub fine-grained PAT',   re.compile(r'\bgithub_pat_[A-Za-z0-9_]{60,}\b')),
    ('GitHub OAuth token',        re.compile(r'\bgho_[A-Za-z0-9]{36}\b')),
    ('GitHub user-to-server',     re.compile(r'\bghu_[A-Za-z0-9]{36}\b')),
    ('GitHub Actions/app token',  re.compile(r'\bghs_[A-Za-z0-9]{36}\b')),
    ('GitHub refresh token',      re.compile(r'\bghr_[A-Za-z0-9]{36}\b')),
    # what actions/checkout writes into .git/config — the format that actually leaked
    ('git auth extraheader',      re.compile(r'(?i)extraheader\s*=\s*AUTHORIZATION:\s*basic\s+[A-Za-z0-9+/=]{20,}')),
    ('Google API key',            re.compile(r'\bAIza[0-9A-Za-z_\-]{35}\b')),
    ('GCP service-account key',   re.compile(r'"type"\s*:\s*"service_account"')),
    ('private key block',         re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----')),
    ('AWS access key id',         re.compile(r'\bAKIA[0-9A-Z]{16}\b')),
    ('Slack token',               re.compile(r'\bxox[baprs]-[0-9A-Za-z\-]{10,}\b')),
    ('credentials in a URL',      re.compile(r'https?://[^/\s:@"\']+:[^/\s:@"\']{8,}@')),
]

def redact(s):
    return (s[:8] + '…' + s[-4:]) if len(s) > 14 else '…'

def scan_text(text):
    """[(kind, redacted_match)] — never returns the raw secret."""
    hits = []
    for kind, rx in PATTERNS:
        for m in rx.finditer(text):
            hits.append((kind, redact(m.group(0))))
    return hits
