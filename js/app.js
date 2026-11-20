/* ============================================================
   Hangul Stamp Studio — app logic
   ============================================================ */
(function () {
  'use strict';

  const CONFIG = window.CONFIG || {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    lang: 'es',
    style: 'seal',
    name: 'Sofía',
    hangul: '소피아',
    ratio: '1:1',
    bg: 'paper',
    ink: 'red',
    shape: 'square',
    mode: 'relief',
    dir: 'vertical',
    showLatin: true,
    seed: 20261120,
    pro: false,
    edited: false
  };

  const PRO_KEY = 'hss_pro_v1';

  /* ---------------- i18n ---------------- */
  function t(key) {
    const dict = window.I18N[state.lang] || window.I18N.es;
    return dict[key] !== undefined ? dict[key] : (window.I18N.es[key] !== undefined ? window.I18N.es[key] : key);
  }

  function applyLang(lang) {
    state.lang = lang;
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach((el) => { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
    $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    $$('[data-i18n-title]').forEach((el) => { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    $$('.lang-switch button').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));
    const priceEl = $('[data-price]');
    if (priceEl) priceEl.textContent = (CONFIG.PRO_PRICE_LOCAL && CONFIG.PRO_PRICE_LOCAL[lang]) || CONFIG.PRO_PRICE || '$4.90';
    updateGuide();
    try { localStorage.setItem('hss_lang', lang); } catch (e) {}
  }

  /* ---------------- name / guide ---------------- */
  function convert(force) {
    const raw = $('#nameInput').value;
    state.name = raw.trim();
    if (!raw.trim()) {
      state.hangul = '';
      state.result = null;
      $('#hangulInput').value = '';
      updateGuide();
      render();
      return;
    }
    const res = window.Translit.convert(raw, state.lang);
    if (res.hangul) {
      state.hangul = res.hangul;
      state.result = res;
      state.edited = false;
      $('#hangulInput').value = res.hangul;
    }
    updateGuide();
    render();
  }

  function updateGuide() {
    const res = state.result && state.result.hangul === state.hangul ? state.result : null;
    const isEmpty = !state.hangul || !state.hangul.trim();
    $('#guideEmpty').hidden = !isEmpty;
    $('.guide-hangul').hidden = isEmpty;
    $('.guide-grid').hidden = isEmpty;
    $('#guideTip').hidden = isEmpty;
    if (isEmpty) {
      $('#guideOrigin').textContent = '';
      $('#guideTip').textContent = '';
      return;
    }
    $('#guideHangul').textContent = state.hangul;
    const lang = (res && res.lang) || 'generic';
    $('#guideOrigin').textContent = t('guide.origin.' + (lang === 'generic' ? 'generic' : lang));
    $('#guideRoman').textContent = res ? res.roman : window.Translit.romanize(state.hangul);
    $('#guideSay').textContent = res ? (res.say || window.Translit.convert(state.hangul, state.lang).say) : state.hangul;
    const tipLang = (lang === 'pt' || lang === 'en') ? lang : 'es';
    $('#guideTip').textContent = state.edited ? t('guide.edit') : t('guide.tip.' + tipLang);
    $$('#exampleChips .chip').forEach((c) => c.classList.toggle('is-active', (c.dataset.name || '').toLowerCase() === ($('#nameInput').value || '').toLowerCase()));
  }

  /* ---------------- render ---------------- */
  let renderScheduled = false;
  function render() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      const canvas = $('#preview');
      const dims = window.Render.RATIOS[state.ratio] || window.Render.RATIOS['1:1'];
      if (canvas.width !== dims[0] || canvas.height !== dims[1]) {
        canvas.width = dims[0];
        canvas.height = dims[1];
      }
      const st = Object.assign({}, state, { pro: state.pro });
      window.Render.draw(canvas, st, { pro: state.pro });
      $('#previewSize').textContent = dims[0] + ' × ' + dims[1];
      document.body.classList.toggle('is-pro', state.pro);
      $('#proFlag').hidden = !state.pro;
    });
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  /* ---------------- downloads ---------------- */
  function slug() {
    const s = (state.name || 'hangul').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    return s || 'hangul';
  }

  function fileName(kind, ratio) {
    return 'hangul-' + slug() + '-' + state.style + '-' + (ratio || state.ratio).replace(':', 'x') + '.' + kind;
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function needName() {
    if (!state.hangul || !state.hangul.trim()) {
      toast(window.I18N[state.lang]['toast.needName']);
      $('#nameInput').focus();
      return true;
    }
    return false;
  }

  function longEdgePx(px, ratio) {
    // px is the long edge; convert it to the canvas width for this format
    const base = window.Render.RATIOS[ratio] || window.Render.RATIOS['1:1'];
    const long = Math.max(base[0], base[1]);
    return Math.round(px * base[0] / long);
  }

  function exportPng(px, pro, ratio) {
    const st = Object.assign({}, state, { ratio: ratio || state.ratio, pro: pro });
    const canvas = window.Render.renderToCanvas(st, px, { pro: pro });
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        saveBlob(blob, fileName('png', ratio));
        resolve(blob);
      }, 'image/png');
    });
  }

  async function exportSvg(ratio) {
    const st = Object.assign({}, state, { ratio: ratio || state.ratio, opts: { pro: true } });
    const svg = await window.Render.svgAsync(st);
    saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), fileName('svg', ratio));
  }

  function downloadFree() {
    if (needName()) return;
    exportPng(CONFIG.FREE_PNG_SIZE || 1080, false).then(() => toast(t('toast.downloaded') + ' · PNG'));
  }

  function downloadPro() {
    if (needName()) return;
    if (!state.pro) { toast(t('toast.hiresPro')); focusPro(); return; }
    exportPng(longEdgePx(CONFIG.PRO_PNG_SIZE || 3000, state.ratio), true).then(() => toast(t('toast.downloaded') + ' · PNG'));
  }

  async function downloadSvg() {
    if (needName()) return;
    if (!state.pro) { toast(t('toast.svgPro')); focusPro(); return; }
    await exportSvg();
    toast(t('toast.downloaded') + ' · SVG');
  }

  async function downloadBatch() {
    if (needName()) return;
    if (!state.pro) { toast(t('toast.batchPro')); focusPro(); return; }
    const ratios = ['1:1', '9:16', '4:5'];
    for (let i = 0; i < ratios.length; i++) {
      await exportPng(longEdgePx(CONFIG.PRO_PNG_SIZE || 3000, ratios[i]), true, ratios[i]);
      await new Promise((r) => setTimeout(r, 450));
      await exportSvg(ratios[i]);
      await new Promise((r) => setTimeout(r, 450));
    }
    toast(t('toast.downloaded') + ' · 6 files');
  }

  function focusPro() {
    const card = $('#proCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { const c = $('#proCode'); if (c) c.focus(); }, 420);
  }

  /* ---------------- pro ---------------- */
  function setPro(on) {
    state.pro = on;
    try { localStorage.setItem(PRO_KEY, on ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('is-pro', on);
    $('#proFlag').hidden = !on;
    const active = $('#proActive');
    if (active) active.hidden = !on;
    render();
  }

  function tryUnlock() {
    const val = ($('#proCode').value || '').trim().toUpperCase();
    if (val && val === String(CONFIG.PRO_CODE || '').toUpperCase()) {
      setPro(true);
      toast(t('toast.proOn'));
      $('#proCode').value = '';
    } else {
      toast(t('toast.badCode'));
    }
  }

  /* ---------------- options ---------------- */
  function setStyle(style) {
    state.style = style;
    $$('.style-card').forEach((c) => {
      const on = c.dataset.style === style;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    // sensible defaults per style
    if (style === 'poster') { state.bg = 'cream'; state.ink = 'red'; state.dir = 'horizontal'; }
    else if (style === 'tattoo') { state.bg = 'white'; state.dir = 'vertical'; }
    else if (style === 'brush') { state.bg = 'paper'; state.ink = 'black'; state.dir = 'vertical'; }
    else { state.bg = 'paper'; state.ink = 'red'; state.shape = 'square'; }
    syncOptionUI();
    updateVisibility();
    render();
  }

  function updateVisibility() {
    $$('.opt[data-show]').forEach((el) => {
      const list = el.getAttribute('data-show').split(/\s+/);
      el.hidden = list.indexOf(state.style) < 0;
    });
  }

  function syncOptionUI() {
    $$('.segmented').forEach((seg) => {
      const key = seg.dataset.key;
      $$('button', seg).forEach((b) => b.classList.toggle('is-active', state[key] === b.dataset.value));
    });
    $$('.swatches').forEach((grp) => {
      const key = grp.dataset.key;
      $$('.swatch', grp).forEach((b) => b.classList.toggle('is-active', state[key] === b.dataset.value));
    });
    $('#latinToggle').checked = !!state.showLatin;
  }

  /* ---------------- boot ---------------- */
  async function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return;
    const specs = [
      '400 40px "Song Myung"', '700 40px "Song Myung"',
      '400 40px "Nanum Brush Script"', '400 40px "Black Han Sans"',
      '400 16px "Noto Sans KR"', '700 16px "Noto Sans KR"'
    ];
    try {
      await Promise.all(specs.map((s) => document.fonts.load(s, '한글이름가나다')));
      await document.fonts.ready;
    } catch (e) { /* keep fallbacks */ }
  }

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem('hss_lang'); } catch (e) {}
    if (saved && window.I18N[saved]) return saved;
    const n = (navigator.language || 'es').toLowerCase();
    if (n.indexOf('pt') === 0) return 'pt';
    if (n.indexOf('ko') === 0) return 'ko';
    if (n.indexOf('es') === 0) return 'es';
    if (n.indexOf('en') === 0) return 'en';
    return 'es';
  }

  function wire() {
    $$('.lang-switch button').forEach((b) => b.addEventListener('click', () => {
      applyLang(b.dataset.lang);
      if (!state.edited) convert(false);
      syncOptionUI();
    }));

    let debounce = null;
    $('#nameInput').addEventListener('input', () => {
      state.edited = false;
      clearTimeout(debounce);
      debounce = setTimeout(() => convert(), 120);
    });

    $('#hangulInput').addEventListener('input', (e) => {
      state.hangul = e.target.value.slice(0, 24);
      state.edited = true;
      state.result = null;
      updateGuide();
      render();
    });

    $('#copyHangul').addEventListener('click', async () => {
      if (!state.hangul) return;
      try {
        await navigator.clipboard.writeText(state.hangul);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = state.hangul; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
      }
      toast(t('toast.copied'));
    });

    $('#exampleChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $('#nameInput').value = chip.dataset.name;
      state.edited = false;
      convert();
    });

    $$('.style-card').forEach((c) => c.addEventListener('click', () => setStyle(c.dataset.style)));

    $$('.segmented').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-value]');
        if (!b) return;
        state[seg.dataset.key] = b.dataset.value;
        syncOptionUI();
        render();
      });
    });

    $$('.swatches').forEach((grp) => {
      grp.addEventListener('click', (e) => {
        const b = e.target.closest('.swatch');
        if (!b) return;
        state[grp.dataset.key] = b.dataset.value;
        syncOptionUI();
        render();
      });
    });

    $('#latinToggle').addEventListener('change', (e) => {
      state.showLatin = e.target.checked;
      render();
    });

    $('#freeDownload').addEventListener('click', downloadFree);
    $('#proPng').addEventListener('click', downloadPro);
    $('#proSvg').addEventListener('click', downloadSvg);
    $('#proBatch').addEventListener('click', downloadBatch);
    $('#unlockBtn').addEventListener('click', tryUnlock);
    $('#proCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });

    const buy = $('#buyBtn');
    if (CONFIG.PRO_BUY_URL) {
      buy.setAttribute('href', CONFIG.PRO_BUY_URL);
      buy.setAttribute('target', '_blank');
      buy.setAttribute('rel', 'noopener');
      $('#payNote').hidden = true;
    } else {
      buy.addEventListener('click', (e) => {
        e.preventDefault();
        focusPro();
      });
    }

    // keyboard shortcuts for power users
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); downloadFree(); }
    });
  }

  async function boot() {
    state.lang = detectLang();
    try { state.pro = localStorage.getItem(PRO_KEY) === '1'; } catch (e) {}
    $('#nameInput').value = state.name;
    applyLang(state.lang);
    convert(false);
    syncOptionUI();
    updateVisibility();
    wire();
    setPro(state.pro);
    await ensureFonts();
    render();
    window.HSS.ready = true;
    document.body.classList.add('is-ready');
  }

  window.HSS = {
    state: state,
    t: t,
    convert: convert,
    render: render,
    setStyle: setStyle,
    applyLang: applyLang,
    setPro: setPro,
    downloadFree: downloadFree,
    downloadPng: exportPng,
    downloadSvg: exportSvg,
    toast: toast,
    ready: false
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
