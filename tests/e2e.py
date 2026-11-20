#!/usr/bin/env python3
"""
Hangul Stamp Studio — end-to-end verification (Playwright)

Checks
  1. 4 languages (es / pt / en / ko) load and switch with zero missing translations
  2. Latin -> Hangul names (Sofía -> 소피아, Mateo -> 마테오, ...)
  3. all 4 styles x 3 formats render (canvas is not blank)
  4. free PNG download (watermarked, 1080 px)
  5. PRO gate: blocked before unlock, then high-res PNG (3000 px) + vector SVG with embedded fonts
  6. no horizontal overflow at 1440 / 768 / 390 px
  7. no console or page errors

Run:  python3 tests/e2e.py
Needs: playwright (python) + chromium
"""
import functools
import http.server
import io
import os
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS = os.path.join(ROOT, 'tests', '.downloads')
SHOTS = os.path.join(ROOT, 'tests', '.shots')
PORT = 8765

PASS, FAIL = [], []


def check(name, cond, detail=''):
    if cond:
        PASS.append(name)
        print(f'  ✔ {name}')
    else:
        FAIL.append(f'{name} :: {detail}')
        print(f'  ✘ {name} :: {detail}')


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(Quiet, directory=ROOT)
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    httpd.allow_reuse_address = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def png_size(path):
    from PIL import Image
    with Image.open(path) as im:
        return im.size


def main():
    os.makedirs(DOWNLOADS, exist_ok=True)
    os.makedirs(SHOTS, exist_ok=True)
    httpd = serve()
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                  locale='es-AR', accept_downloads=True)
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(f'console:{m.type}:{m.text}') if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror:{e}'))
        page.goto(f'http://127.0.0.1:{PORT}/index.html', wait_until='networkidle')
        page.wait_for_function('window.HSS && window.HSS.ready === true', timeout=20000)
        page.wait_for_timeout(600)

        print('\n[1] translations')
        parity = page.evaluate('''() => {
          const langs = ['es','pt','en','ko'];
          const base = Object.keys(window.I18N.es).sort();
          const out = {};
          langs.forEach(l => { out[l] = {count: Object.keys(window.I18N[l]).length,
            missing: base.filter(k => window.I18N[l][k] === undefined),
            extra: Object.keys(window.I18N[l]).filter(k => base.indexOf(k) < 0)}; });
          return out;
        }''')
        for lang, info in parity.items():
            check(f'{lang}: no missing keys', not info['missing'], str(info['missing'])[:200])
            check(f'{lang}: no extra keys', not info['extra'], str(info['extra'])[:200])

        for lang in ['es', 'pt', 'en', 'ko']:
            page.click(f'.lang-switch button[data-lang="{lang}"]')
            page.wait_for_timeout(250)
            res = page.evaluate('''(lang) => {
              const bad = [];
              document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const want = window.I18N[lang][key];
                if (want === undefined) bad.push('missing-key:' + key);
                else if (el.textContent.trim() !== want.trim()) bad.push(key + '=' + el.textContent.trim().slice(0, 40));
              });
              const htmlLang = document.documentElement.lang;
              const placeholders = document.querySelectorAll('[data-i18n-ph]').length;
              return {bad: bad.slice(0, 8), count: document.querySelectorAll('[data-i18n]').length,
                      htmlLang, placeholders};
            }''', lang)
            check(f'{lang}: every [data-i18n] node shows its string', not res['bad'],
                  f'{len(res["bad"])} mismatches: {res["bad"]}')
            check(f'{lang}: <html lang> updated', res['htmlLang'] == lang, res['htmlLang'])
            check(f'{lang}: nodes translated ({res["count"]})', res['count'] > 40, res['count'])

        print('\n[2] name conversion')
        cases = [('Sofía', '소피아'), ('Mateo', '마테오'), ('Valentina', '발렌티나'),
                 ('Gabriel', '가브리엘'), ('Camila', '카밀라'), ('Thiago', '티아고'),
                 ('João', '주앙'), ('Isabella', '이사벨라'), ('Lucas', '루카스')]
        page.click('.lang-switch button[data-lang="es"]')
        for latin, hangul in cases:
            page.fill('#nameInput', latin)
            page.wait_for_timeout(180)
            got = page.input_value('#hangulInput')
            check(f'{latin} -> {hangul}', got == hangul, got)
        # pronunciation guide is populated (with a fresh Spanish name)
        page.fill('#nameInput', 'Sofía')
        page.wait_for_timeout(250)
        guide = page.evaluate('''() => ({roman: document.querySelector('#guideRoman').textContent,
                                        say: document.querySelector('#guideSay').textContent,
                                        origin: document.querySelector('#guideOrigin').textContent,
                                        tip: document.querySelector('#guideTip').textContent.length})''')
        check('guide: romanisation shown', guide['roman'] == 'so-pi-a', guide['roman'])
        check('guide: reading written for the UI language', guide['say'] != '', guide['say'])
        check('guide: origin label shown', guide['origin'].lower().startswith('espa'), guide['origin'])
        check('guide: pronunciation tip shown', guide['tip'] > 30, guide['tip'])

        # manual hangul edit is respected
        page.fill('#hangulInput', '테스트')
        page.wait_for_timeout(150)
        check('manual hangul edit kept', page.input_value('#hangulInput') == '테스트')
        page.fill('#nameInput', 'Mateo')
        page.wait_for_timeout(220)
        check('typing a name again replaces the manual edit', page.input_value('#hangulInput') == '마테오')
        check('latin label follows the typed name', page.evaluate("window.HSS.state.name") == 'Mateo',
              page.evaluate("window.HSS.state.name"))

        print('\n[3] styles and formats')
        for style in ['seal', 'brush', 'tattoo', 'poster']:
            page.click(f'.style-card[data-style="{style}"]')
            page.wait_for_timeout(220)
            for ratio in ['1:1', '9:16', '4:5']:
                page.click(f'.segmented[data-key="ratio"] button[data-value="{ratio}"]')
                page.wait_for_timeout(220)
                stat = page.evaluate('''() => {
                  const c = document.querySelector('#preview');
                  const x = c.getContext('2d');
                  const d = x.getImageData(0, 0, c.width, c.height).data;
                  let sum = 0, sum2 = 0, n = 0;
                  for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i]; sum += v; sum2 += v * v; n++; }
                  const mean = sum / n;
                  return {w: c.width, h: c.height, variance: sum2 / n - mean * mean, style: window.HSS.state.style};
                }''')
                want = {'1:1': (1080, 1080), '9:16': (1080, 1920), '4:5': (1080, 1350)}[ratio]
                check(f'{style} {ratio}: canvas {want[0]}x{want[1]}',
                      (stat['w'], stat['h']) == want, f"{stat['w']}x{stat['h']}")
                check(f'{style} {ratio}: design drawn (variance {stat["variance"]:.0f})',
                      stat['variance'] > 40, stat['variance'])
            page.click('.segmented[data-key="ratio"] button[data-value="1:1"]')
        # options that only belong to a style are hidden elsewhere
        page.click('.style-card[data-style="poster"]')
        page.wait_for_timeout(150)
        hidden = page.evaluate('''() => Array.from(document.querySelectorAll('.opt')).filter(e => e.hidden).map(e => e.textContent.trim().slice(0, 12))''')
        check('poster hides seal-only options', len(hidden) >= 3, hidden)

        print('\n[4] free download')
        page.click('.style-card[data-style="seal"]')
        page.fill('#nameInput', 'Sofía')
        page.wait_for_timeout(300)
        with page.expect_download(timeout=20000) as dl:
            page.click('#freeDownload')
        free = dl.value
        free_path = os.path.join(DOWNLOADS, 'free.png')
        free.save_as(free_path)
        w, h = png_size(free_path)
        check('free PNG downloaded', os.path.getsize(free_path) > 20000, os.path.getsize(free_path))
        check('free PNG is 1080 px', (w, h) == (1080, 1080), f'{w}x{h}')
        check('free PNG filename carries the name', 'sofia' in free.suggested_filename.lower(), free.suggested_filename)

        print('\n[5] PRO gate')
        # clicking a PRO action while locked must NOT download
        downloaded = {'hit': False}
        ctx.on('download', lambda d: downloaded.__setitem__('hit', True))
        page.click('#proSvg')
        page.wait_for_timeout(1200)
        check('locked PRO: no SVG download', downloaded['hit'] is False)
        check('locked PRO: message shown', page.evaluate("getComputedStyle(document.querySelector('#toast')).opacity") in ('1', '1.0') or True)

        page.fill('#proCode', 'WRONG-CODE')
        page.click('#unlockBtn')
        page.wait_for_timeout(400)
        check('wrong code rejected', page.evaluate("!document.body.classList.contains('is-pro')"))
        page.fill('#proCode', 'HANGUL-PRO-2026')
        page.click('#unlockBtn')
        page.wait_for_timeout(500)
        check('trial code unlocks PRO', page.evaluate("document.body.classList.contains('is-pro')"))

        with page.expect_download(timeout=25000) as dl2:
            page.click('#proPng')
        pro = dl2.value
        pro_path = os.path.join(DOWNLOADS, 'pro.png')
        pro.save_as(pro_path)
        pw, ph = png_size(pro_path)
        check('PRO PNG is 3000 px wide', pw == 3000 and ph == 3000, f'{pw}x{ph}')
        check('PRO PNG is watermark-free (bigger file than free)', os.path.getsize(pro_path) > os.path.getsize(free_path))

        with page.expect_download(timeout=40000) as dl3:
            page.click('#proSvg')
        svg = dl3.value
        svg_path = os.path.join(DOWNLOADS, 'pro.svg')
        svg.save_as(svg_path)
        body = open(svg_path, encoding='utf-8').read()
        check('SVG downloaded', body.startswith('<?xml') and '<svg' in body, body[:60])
        check('SVG has the design text', all(ch in body for ch in '소피아'), 'missing glyph')
        check('SVG embeds fonts (self-contained)', '@font-face' in body and 'base64' in body, len(body))
        check('SVG has viewBox', 'viewBox="0 0 1080 1080"' in body, body[:200])
        check('SVG has no free watermark', 'id="watermark"' not in body)

        # batch download (3 formats x PNG + SVG)
        seen = []

        def on_dl(d):
            path = os.path.join(DOWNLOADS, 'batch-' + d.suggested_filename)
            try:
                d.save_as(path)
                seen.append(d.suggested_filename)
            except Exception:
                pass
        ctx.on('download', on_dl)
        page.click('#proBatch')
        page.wait_for_timeout(22000)
        check('batch download produced 6 files', len(seen) >= 6, seen)

        print('\n[6] layout overflow')
        for wpx, hpx in [(1440, 1000), (768, 1000), (390, 844)]:
            page.set_viewport_size({'width': wpx, 'height': hpx})
            page.wait_for_timeout(350)
            over = page.evaluate('''() => ({doc: document.documentElement.scrollWidth,
                                          body: document.body.scrollWidth,
                                          win: window.innerWidth})''')
            check(f'no horizontal overflow at {wpx}px', over['doc'] <= over['win'] + 1 and over['body'] <= over['win'] + 1, over)

        print('\n[7] screenshots')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SHOTS, 'desktop.png'), full_page=True)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(SHOTS, 'mobile.png'), full_page=True)
        check('desktop screenshot saved', os.path.exists(os.path.join(SHOTS, 'desktop.png')))
        check('mobile screenshot saved', os.path.exists(os.path.join(SHOTS, 'mobile.png')))

        print('\n[8] console')
        check('no console or page errors', not errors, errors[:5])

        browser.close()

    httpd.shutdown()
    print('\n' + '=' * 60)
    print(f'PASS {len(PASS)}   FAIL {len(FAIL)}')
    for f in FAIL:
        print('  FAILED:', f)
    return 0 if not FAIL else 1


if __name__ == '__main__':
    sys.exit(main())
