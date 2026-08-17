#!/usr/bin/env python3
"""Render the 1200x630 Open Graph share cards in assets/social/.

The cards are generated, not hand-drawn, so this file is the source of truth for
their text. Edit CARDS below and re-run; requires Google Chrome.

    python3 tools/build-social-cards.py

Cards use the same official lockups as the page headers (rdrp-seal.png,
bde-banner.png) — deliberately NOT rdrp-mark.png, which is the bare Stanford
seal and appears nowhere on the site. Keep the `url` line matching the page's
<link rel="canonical">: the two main pages canonicalize to their bare domain
roots so no internal acronym is ever public-facing.
"""
import os, shutil, subprocess, sys, tempfile, time

CARDS = [
 dict(out='rdrp', accent='#8C1515', lock='assets/logos/rdrp-seal.png', lockh=78,
      title='How children learn to read —<br>and why some struggle',
      sub='Research on reading development and dyslexia, translated into ROAR: '
          'an online assessment platform connecting research and practice in thousands of schools.',
      url='dyslexia.stanford.edu', photo=''),
 dict(out='bde', accent='#007C92', lock='assets/logos/bde-banner.png', lockh=86,
      title='Neuroscience and education,<br>in a virtuous cycle',
      sub='We use education to understand how experience shapes the developing brain, '
          'and neuroscience to understand learning differences.',
      url='edneuro.stanford.edu', photo=''),
 dict(out='parents', accent='#8C1515', lock='assets/logos/rdrp-seal.png', lockh=78,
      title='Resources for Parents',
      sub='Guides, advocacy groups, evaluation services, and intervention programs '
          'for families navigating a dyslexia diagnosis.',
      url='dyslexia.stanford.edu/parents', photo=''),
 dict(out='yeatman', accent='#8C1515', lock='assets/logos/rdrp-seal.png', lockh=78,
      title='Jason D. Yeatman, Ph.D.',
      sub='Director, Yeatman Lab. Associate Professor of Developmental &amp; Behavioral '
          'Pediatrics, Education, and Psychology at Stanford.',
      url='dyslexia.stanford.edu/yeatman', photo='assets/people/jason-yeatman.jpg'),
]

TPL = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Source+Sans+3:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
 *{{margin:0;padding:0;box-sizing:border-box}}
 body{{width:1200px;height:630px;background:#FAF9F6;font-family:'Source Sans 3',sans-serif;overflow:hidden}}
 .bar{{height:14px;background:{accent}}}
 .body{{height:616px;display:flex;align-items:center;gap:60px;padding:0 76px}}
 .txt{{flex:1;min-width:0;display:flex;flex-direction:column}}
 .lock{{height:{lockh}px;width:auto;object-fit:contain;align-self:flex-start;margin-bottom:42px}}
 h1{{font-family:'Source Serif 4',serif;font-weight:700;font-size:{h1}px;line-height:1.1;color:#2E2D29;
   letter-spacing:-.015em}}
 .sub{{font-size:27px;line-height:1.45;color:#4D4F53;margin-top:24px;max-width:{subw}ch}}
 .rule{{width:64px;height:5px;background:{accent};border-radius:3px;margin-top:34px}}
 .url{{font-size:24px;font-weight:700;color:{accent};margin-top:20px;letter-spacing:.01em}}
 .photo{{flex:none;width:270px;height:270px;border-radius:50%;object-fit:cover;
   box-shadow:0 8px 30px rgba(0,0,0,.18)}}
</style></head><body>
 <div class="bar"></div>
 <div class="body">
   <div class="txt">
     <img class="lock" src="{lock}" alt="">
     <h1>{title}</h1>
     <div class="sub">{sub}</div>
     <div class="rule"></div>
     <div class="url">{url}</div>
   </div>
   {photoimg}
 </div>
</body></html>'''

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
os.makedirs('assets/social', exist_ok=True)
only = sys.argv[1:]

for c in CARDS:
    if only and c['out'] not in only:
        continue
    photo = '<img class="photo" src="%s" alt="">' % c['photo'] if c['photo'] else ''
    html = TPL.format(photoimg=photo, h1=58 if c['photo'] else 62,
                      subw=38 if c['photo'] else 52, **c)
    stage = '_og_%s.html' % c['out']
    out = 'assets/social/%s.png' % c['out']
    open(stage, 'w', encoding='utf-8').write(html)
    if os.path.exists(out):
        os.remove(out)
    prof = tempfile.mkdtemp()
    p = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--hide-scrollbars', '--force-device-scale-factor=1', '--virtual-time-budget=8000',
        '--user-data-dir=' + prof, '--window-size=1200,630',
        '--screenshot=' + out, 'file://%s/%s' % (root, stage)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(25):
        if os.path.exists(out) and os.path.getsize(out):
            time.sleep(1)
            break
        time.sleep(1)
    p.kill()
    os.remove(stage)
    shutil.rmtree(prof, ignore_errors=True)
    print('  %-32s %.0f KB' % (out, os.path.getsize(out) / 1024))
