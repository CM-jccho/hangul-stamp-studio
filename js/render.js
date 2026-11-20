/* ============================================================
   Hangul Stamp Studio — renderers (canvas + SVG)
   ============================================================ */
(function () {
  'use strict';

  const FONT = {
    serif: '"Song Myung", "Nanum Myeongjo", "Noto Serif KR", serif',
    brush: '"Nanum Brush Script", "Gowun Batang", cursive',
    black: '"Black Han Sans", "Noto Sans KR", sans-serif',
    sans: '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif'
  };

  const COLORS = {
    paper: '#F2E9D8',
    paperWarm: '#F6F0E3',
    white: '#FFFFFF',
    red: '#B0332B',
    redDeep: '#8E2A22',
    ink: '#17140F',
    navy: '#16213C'
  };

  const POSTER_BG = {
    cream: '#F3EDE1',
    ink: '#15181D',
    blush: '#EFD6CF',
    sage: '#D8E0D1',
    sun: '#EFC15C',
    sky: '#CFE0E8'
  };

  /* seeded random so the same design exports identically */
  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function luminance(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function inkOf(state) {
    if (state.style === 'poster') return luminance(POSTER_BG[state.bg] || POSTER_BG.cream) > 0.55 ? '#15181D' : '#F6F1E7';
    if (state.ink === 'black') return COLORS.ink;
    if (state.ink === 'navy') return COLORS.navy;
    return COLORS.red;
  }

  function bgOf(state) {
    if (state.style === 'poster') return POSTER_BG[state.bg] || POSTER_BG.cream;
    if (state.bg === 'white') return COLORS.white;
    if (state.bg === 'none') return null;
    if (state.bg === 'paper' || !state.bg) return state.style === 'brush' ? COLORS.paperWarm : COLORS.paper;
    return COLORS.paper;
  }

  /* ---------------- texture helpers ---------------- */
  function drawPaper(ctx, W, H, base, seed) {
    const r = rng(seed || 7);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    // soft warm variation
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, rad = (0.1 + r() * 0.35) * Math.max(W, H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() > 0.5;
      g.addColorStop(0, dark ? 'rgba(150,120,80,0.045)' : 'rgba(255,252,244,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
    // paper fibres
    ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.0011);
    for (let i = 0; i < 220; i++) {
      const x = r() * W, y = r() * H, len = (0.01 + r() * 0.06) * Math.min(W, H), a = r() * Math.PI;
      ctx.strokeStyle = r() > 0.4 ? 'rgba(120,95,60,0.055)' : 'rgba(255,255,255,0.30)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
    // speckles
    for (let i = 0; i < 700; i++) {
      const x = r() * W, y = r() * H, s = Math.min(W, H) * (0.0006 + r() * 0.0022);
      ctx.fillStyle = 'rgba(90,70,45,' + (0.03 + r() * 0.06).toFixed(3) + ')';
      ctx.fillRect(x, y, s, s);
    }
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(60,40,20,0.10)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function roughEdge(ctx, W, H, color, seed) {
    const r = rng(seed || 3);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) {
      const x = r() * W, y = r() * H, s = Math.min(W, H) * (0.002 + r() * 0.012);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.45).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function letterSpacingText(ctx, text, x, y, spacing, align) {
    const chars = text.split('');
    const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += widths[i] + spacing;
    });
    return total;
  }

  function watermark(ctx, W, H, pro) {
    if (pro) return;
    const light = isLightArea(ctx, W, H);
    const col = light ? '17,20,25' : '255,255,255';
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 7);
    ctx.font = '600 ' + Math.round(Math.min(W, H) * 0.026) + 'px ' + FONT.sans;
    ctx.fillStyle = 'rgba(' + col + ',0.075)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = Math.min(W, H) * 0.26;
    const diag = Math.sqrt(W * W + H * H);
    for (let y = -diag / 2; y < diag / 2; y += step) {
      for (let x = -diag / 2; x < diag / 2; x += step * 2.4) {
        ctx.fillText('HANGUL STAMP STUDIO · FREE', x, y);
      }
    }
    ctx.restore();

    // bottom badge
    const pad = Math.min(W, H) * 0.035;
    const fs = Math.max(14, Math.min(W, H) * 0.026);
    ctx.font = '700 ' + fs + 'px ' + FONT.sans;
    const label = 'FREE · ' + (window.CONFIG ? window.CONFIG.SITE_URL : 'hangul-stamp.studio');
    const tw = ctx.measureText(label).width;
    const bw = tw + fs * 1.6, bh = fs * 1.9;
    ctx.fillStyle = light ? 'rgba(255,255,255,0.72)' : 'rgba(15,18,22,0.45)';
    roundRect(ctx, W / 2 - bw / 2, H - pad - bh, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = light ? 'rgba(40,38,34,0.66)' : 'rgba(255,255,255,0.82)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, W / 2, H - pad - bh / 2 + 1);
  }

  function isLightArea(ctx, W, H) {
    try {
      const d = ctx.getImageData(W * 0.5, H * 0.92, 1, 1).data;
      return (0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2]) / 255 > 0.5;
    } catch (e) { return true; }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function splitChars(hangul) {
    return hangul.replace(/\s+/g, ' ').trim();
  }

  /* ---------------- 1. red seal ---------------- */
  function drawSeal(ctx, W, H, st, opts) {
    const bg = bgOf(st);
    if (bg) drawPaper(ctx, W, H, bg, st.seed);
    const s = Math.min(W, H);
    const red = st.ink === 'black' ? COLORS.ink : st.ink === 'navy' ? COLORS.navy : COLORS.red;
    const isRound = st.shape === 'round';
    const size = s * (isRound ? 0.54 : 0.51);
    const cx = W / 2, cy = H / 2 - (st.showLatin ? s * 0.03 : 0);
    const chars = splitChars(st.hangul).replace(/ /g, '').split('');
    const n = chars.length || 1;
    const cols = n <= 3 ? 1 : n <= 6 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const frameW = size * 0.05;
    const paperCol = bg || COLORS.paper;

    // draw the impression on its own layer so the ink texture can be erased
    const layer = document.createElement('canvas');
    layer.width = Math.max(1, Math.round(W));
    layer.height = Math.max(1, Math.round(H));
    const lc = layer.getContext('2d');
    lc.translate(cx, cy);
    lc.rotate(-0.01);

    if (isRound) {
      if (st.mode === 'engraved') {
        lc.fillStyle = red;
        lc.beginPath(); lc.arc(0, 0, size / 2, 0, Math.PI * 2); lc.fill();
        lc.save();
        lc.globalCompositeOperation = 'destination-out';
        lc.beginPath(); lc.arc(0, 0, size / 2 - frameW * 1.35, 0, Math.PI * 2); lc.fill();
        lc.restore();
      }
      lc.strokeStyle = red;
      lc.lineWidth = frameW;
      lc.beginPath(); lc.arc(0, 0, size / 2 - frameW / 2, 0, Math.PI * 2); lc.stroke();
      lc.lineWidth = frameW * 0.34;
      lc.beginPath(); lc.arc(0, 0, size / 2 - frameW * 1.5, 0, Math.PI * 2); lc.stroke();
    } else {
      const x0 = -size / 2, y0 = -size / 2;
      if (st.mode === 'engraved') {
        lc.fillStyle = red;
        lc.fillRect(x0, y0, size, size);
        lc.save();
        lc.globalCompositeOperation = 'destination-out';
        lc.fillRect(x0 + frameW * 1.35, y0 + frameW * 1.35, size - frameW * 2.7, size - frameW * 2.7);
        lc.restore();
      }
      lc.strokeStyle = red;
      lc.lineWidth = frameW;
      lc.strokeRect(x0 + frameW / 2, y0 + frameW / 2, size - frameW, size - frameW);
      lc.lineWidth = frameW * 0.32;
      lc.strokeRect(x0 + frameW * 1.6, y0 + frameW * 1.6, size - frameW * 3.2, size - frameW * 3.2);
    }

    const inner = size * (isRound ? 0.72 : 0.7);
    const cell = inner / Math.max(cols, rows);
    const fontSize = cell * 0.99;
    lc.font = '700 ' + fontSize + 'px ' + FONT.serif;
    lc.textAlign = 'center';
    lc.textBaseline = 'middle';
    lc.fillStyle = st.mode === 'engraved' ? paperCol : red;

    const r = rng(st.seed + 11);
    chars.forEach((ch, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const itemsInCol = Math.min(rows, n - col * rows);
      const x = (cols === 1 ? 0 : (-(cols - 1) / 2 + col) * cell);
      const y = (-(itemsInCol - 1) / 2 + row) * cell;
      lc.save();
      lc.translate(x + (r() - 0.5) * cell * 0.03, y + (r() - 0.5) * cell * 0.03);
      lc.rotate((r() - 0.5) * 0.02);
      lc.fillText(ch, 0, fontSize * 0.02);
      lc.restore();
    });

    // ink texture: where the paper did not take the ink, erase the layer
    lc.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 55; i++) {
      const x = -size / 2 + r() * size, y = -size / 2 + r() * size;
      const rad = size * (0.01 + r() * 0.05);
      const g = lc.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(0,0,0,' + (0.10 + r() * 0.35).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(x, y, rad, 0, Math.PI * 2); lc.fill();
    }
    for (let i = 0; i < 380; i++) {
      const x = -size / 2 + r() * size, y = -size / 2 + r() * size;
      lc.fillStyle = 'rgba(0,0,0,' + (0.2 + r() * 0.75).toFixed(2) + ')';
      lc.beginPath();
      lc.ellipse(x, y, size * (0.0008 + r() * 0.0032), size * (0.0008 + r() * 0.0026), r() * 3, 0, Math.PI * 2);
      lc.fill();
    }
    // worn outer edge
    lc.lineWidth = size * 0.02;
    lc.strokeStyle = 'rgba(0,0,0,0.5)';
    const edge = size / 2;
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const d = isRound ? edge - frameW * 0.5 : edge;
      const px = Math.cos(a) * d, py = Math.sin(a) * d;
      lc.beginPath();
      lc.arc(px, py, size * (0.002 + r() * 0.012), 0, Math.PI * 2);
      lc.fill();
    }

    ctx.drawImage(layer, 0, 0, W, H);

    if (st.showLatin) {
      ctx.save();
      ctx.font = '500 ' + Math.round(s * 0.034) + 'px ' + FONT.sans;
      ctx.fillStyle = 'rgba(30,26,20,0.62)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      letterSpacingText(ctx, st.name.toUpperCase(), W / 2, cy + size / 2 + s * 0.075, s * 0.006, 'center');
      ctx.restore();
    }
    watermark(ctx, W, H, opts.pro);
  }

  /* ---------------- 2. brush calligraphy ---------------- */
  function drawBrush(ctx, W, H, st, opts) {
    const bg = bgOf(st);
    if (bg) drawPaper(ctx, W, H, bg, st.seed + 5);
    const ink = st.ink === 'black' ? COLORS.ink : st.ink === 'navy' ? COLORS.navy : '#1A1712';
    const chars = splitChars(st.hangul).replace(/ /g, '').split('');
    const n = chars.length || 1;
    const s = Math.min(W, H);
    const vertical = st.dir !== 'horizontal';
    const r = rng(st.seed + 21);

    ctx.save();
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (vertical) {
      const maxH = H * (st.showLatin ? 0.62 : 0.74);
      const fs = Math.min(W * 0.5, maxH / n * 0.96);
      const startY = H / 2 - (fs * n) / 2 + fs / 2 - (st.showLatin ? H * 0.02 : 0);
      chars.forEach((ch, i) => {
        drawBrushChar(ctx, ch, W / 2 + (r() - 0.5) * fs * 0.05, startY + i * fs, fs, ink, st.seed + i);
      });
      // small red seal beside the last character
      drawMiniSeal(ctx, W / 2 + fs * 0.64, startY + (n - 1) * fs + fs * 0.2, s * 0.075, st, chars[0]);
    } else {
      const fs = Math.min(H * 0.34, (W * 0.84) / n);
      const y = H / 2 - (st.showLatin ? H * 0.02 : 0);
      chars.forEach((ch, i) => {
        const x = W / 2 - (fs * n) / 2 + fs / 2 + i * fs;
        drawBrushChar(ctx, ch, x, y + (r() - 0.5) * fs * 0.05, fs, ink, st.seed + i);
      });
      drawMiniSeal(ctx, W / 2 + (fs * n) / 2 + fs * 0.3, y + fs * 0.3, s * 0.072, st, chars[0]);
    }
    ctx.restore();

    if (st.showLatin) {
      ctx.save();
      ctx.font = '400 ' + Math.round(s * 0.032) + 'px ' + FONT.sans;
      ctx.fillStyle = 'rgba(30,26,20,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      letterSpacingText(ctx, st.name.toUpperCase(), W / 2, H * 0.875, s * 0.008, 'center');
      ctx.restore();
    }
    watermark(ctx, W, H, opts.pro);
  }

  function drawBrushChar(ctx, ch, x, y, fs, ink, seed) {
    const r = rng(seed + 7);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((r() - 0.5) * 0.09);
    ctx.font = '400 ' + fs + 'px ' + FONT.brush;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = ch;
    // soft ink bleed halo
    ctx.save();
    if (ctx.filter !== undefined) ctx.filter = 'blur(' + Math.max(1, fs * 0.035) + 'px)';
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = ink;
    ctx.fillText(glyph, 0, 0);
    ctx.restore();
    // wet edges
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) {
      const dx = (r() - 0.5) * fs * 0.05, dy = (r() - 0.5) * fs * 0.05;
      if (ctx.filter !== undefined) ctx.filter = 'blur(' + Math.max(0.5, fs * 0.012) + 'px)';
      ctx.fillText(glyph, dx, dy);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (ctx.filter !== undefined) ctx.filter = 'none';
    // core stroke
    ctx.fillStyle = ink;
    ctx.fillText(glyph, 0, 0);
    // ink speckles (세) around strokes
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d = fs * (0.34 + r() * 0.26);
      ctx.globalAlpha = 0.06 + r() * 0.13;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, fs * (0.004 + r() * 0.014), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawMiniSeal(ctx, x, y, size, st, ch) {
    ctx.save();
    const red = (st.ink === 'navy') ? COLORS.navy : COLORS.red;
    const paper = getBgFallback(st);
    ctx.translate(x, y);
    ctx.rotate(-0.04);
    ctx.fillStyle = red;
    roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.1);
    ctx.fill();
    // carved mark: a small square notch and two bars, reads as a seal at any size
    ctx.fillStyle = paper;
    ctx.fillRect(-size * 0.22, -size * 0.22, size * 0.44, size * 0.1);
    ctx.fillRect(-size * 0.22, -size * 0.02, size * 0.44, size * 0.1);
    ctx.fillRect(-size * 0.1, -size * 0.22, size * 0.1, size * 0.44);
    ctx.restore();
  }

  function getBgFallback(st) {
    const b = bgOf(st);
    return b || '#F2E9D8';
  }

  /* ---------------- 3. minimal tattoo ---------------- */
  function drawTattoo(ctx, W, H, st, opts) {
    const bg = bgOf(st);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    const s = Math.min(W, H);
    const ink = '#141414';
    const chars = splitChars(st.hangul).replace(/ /g, '').split('');
    const n = chars.length || 1;
    const vertical = st.dir !== 'horizontal';
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (vertical) {
      const fs = Math.min(W * 0.42, (H * (st.showLatin ? 0.52 : 0.66)) / n);
      const startY = H * 0.44 - (fs * n) / 2 + fs / 2;
      chars.forEach((ch, i) => drawLineChar(ctx, ch, W / 2, startY + i * fs, fs));
      const lineY = startY + (n - 1) * fs + fs * 0.64;
      ctx.lineWidth = Math.max(1, fs * 0.012);
      ctx.beginPath();
      ctx.moveTo(W / 2 - fs * 0.26, lineY);
      ctx.lineTo(W / 2 + fs * 0.26, lineY);
      ctx.stroke();
      drawMiniSeal(ctx, W / 2 + fs * 0.26, lineY + s * 0.065, s * 0.05, st, chars[0]);
    } else {
      const fs = Math.min(H * 0.26, (W * 0.72) / n);
      const y = H * 0.46;
      chars.forEach((ch, i) => drawLineChar(ctx, ch, W / 2 - (fs * n) / 2 + fs / 2 + i * fs, y, fs));
      const lineY = y + fs * 0.74;
      ctx.lineWidth = Math.max(1, fs * 0.012);
      ctx.beginPath();
      ctx.moveTo(W / 2 - fs * 0.26, lineY);
      ctx.lineTo(W / 2 + fs * 0.26, lineY);
      ctx.stroke();
      drawMiniSeal(ctx, W / 2 + fs * 0.44, y, s * 0.055, st, chars[0]);
    }
    ctx.restore();

    if (st.showLatin) {
      ctx.save();
      ctx.font = '400 ' + Math.round(s * 0.028) + 'px ' + FONT.sans;
      ctx.fillStyle = 'rgba(20,20,20,0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      letterSpacingText(ctx, st.name.toUpperCase(), W / 2, H * 0.885, s * 0.01, 'center');
      ctx.restore();
    }
    watermark(ctx, W, H, opts.pro);
  }

  function drawLineChar(ctx, ch, x, y, fs) {
    ctx.save();
    ctx.translate(x, y);
    ctx.font = '400 ' + fs + 'px ' + FONT.black;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(1.4, fs * 0.016);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#141414';
    ctx.strokeText(ch, 0, 0);
    ctx.restore();
  }

  /* ---------------- 4. modern poster ---------------- */
  function drawPoster(ctx, W, H, st, opts) {
    const bg = POSTER_BG[st.bg] || POSTER_BG.cream;
    const ink = luminance(bg) > 0.55 ? '#15181D' : '#F7F2E8';
    const s = Math.min(W, H);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const r = rng(st.seed + 31);
    for (let i = 0; i < 900; i++) {
      const x = r() * W, y = r() * H;
      ctx.fillStyle = luminance(bg) > 0.55 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, s * 0.002, s * 0.002);
    }

    const chars = splitChars(st.hangul).replace(/ /g, '').split('');
    const n = chars.length || 1;
    const pad = s * 0.075;
    const tall = H / W > 1.4;

    ctx.save();
    ctx.fillStyle = ink;

    // top label
    ctx.font = '600 ' + Math.round(s * 0.024) + 'px ' + FONT.sans;
    ctx.globalAlpha = 0.72;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    letterSpacingText(ctx, '한글 · SEOUL', pad, pad + s * 0.022, s * 0.007, 'left');
    ctx.globalAlpha = 1;

    if (tall) {
      // stacked name, left aligned
      const fs = Math.min(W * 0.42, (H * 0.54) / n);
      const startY = H * 0.44 - (fs * n) / 2 + fs / 2;
      ctx.font = '400 ' + fs + 'px ' + FONT.black;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      chars.forEach((ch, i) => ctx.fillText(ch, W / 2, startY + i * fs));
      const lineY = startY + (n - 1) * fs + fs * 0.62;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = Math.max(1, s * 0.0022);
      ctx.beginPath(); ctx.moveTo(pad, lineY); ctx.lineTo(W - pad, lineY); ctx.stroke();
      ctx.globalAlpha = 1;
      if (st.showLatin) {
        ctx.font = '500 ' + Math.round(s * 0.03) + 'px ' + FONT.sans;
        ctx.textBaseline = 'middle';
        letterSpacingText(ctx, st.name.toUpperCase(), pad, lineY + s * 0.06, s * 0.011, 'left');
      }
    } else {
      // one line of big type, bottom left
      const fs = Math.min((W - pad * 2) / n * 0.97, H * 0.26);
      const baseY = H * 0.66;
      ctx.font = '400 ' + fs + 'px ' + FONT.black;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      chars.forEach((ch, i) => ctx.fillText(ch, pad + i * fs * 0.99, baseY));
      const lineY = baseY + fs * 0.24;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = Math.max(1, s * 0.0022);
      ctx.beginPath(); ctx.moveTo(pad, lineY); ctx.lineTo(W - pad, lineY); ctx.stroke();
      ctx.globalAlpha = 1;
      if (st.showLatin) {
        ctx.font = '500 ' + Math.round(s * 0.032) + 'px ' + FONT.sans;
        ctx.textBaseline = 'middle';
        letterSpacingText(ctx, st.name.toUpperCase(), pad, lineY + s * 0.062, s * 0.012, 'left');
      }
    }

    // bottom micro type
    ctx.font = '500 ' + Math.round(s * 0.02) + 'px ' + FONT.sans;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('NAKGWAAN EDITION', pad, H - pad);
    ctx.textAlign = 'right';
    ctx.fillText('2026', W - pad, H - pad);
    ctx.globalAlpha = 1;
    ctx.restore();

    // red seal, top right
    const sealSize = s * 0.075;
    ctx.save();
    ctx.translate(W - pad - sealSize / 2, pad + sealSize * 0.4);
    ctx.fillStyle = COLORS.red;
    roundRect(ctx, -sealSize / 2, -sealSize / 2, sealSize, sealSize, sealSize * 0.1);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.font = '700 ' + sealSize * 0.6 + 'px ' + FONT.serif;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chars[0] || '印', 0, sealSize * 0.03);
    ctx.restore();

    watermark(ctx, W, H, opts.pro);
  }

  /* ---------------- dispatch ---------------- */
  function draw(canvas, st, opts) {
    opts = opts || {};
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (!st.hangul) {
      ctx.restore();
      return;
    }
    if (st.style === 'brush') drawBrush(ctx, W, H, st, opts);
    else if (st.style === 'tattoo') drawTattoo(ctx, W, H, st, opts);
    else if (st.style === 'poster') drawPoster(ctx, W, H, st, opts);
    else drawSeal(ctx, W, H, st, opts);
    ctx.restore();
  }

  /* ---------------- SVG export ---------------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let FONT_CSS_OVERRIDE = null;

  function svgDoc(W, H, body, bg) {
    const styleCss = FONT_CSS_OVERRIDE !== null
      ? FONT_CSS_OVERRIDE
      : '@import url("https://fonts.googleapis.com/css2?family=Black+Han+Sans&amp;family=Nanum+Brush+Script&amp;family=Song+Myung&amp;family=Noto+Sans+KR:wght@400;500;700&amp;display=swap");';
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">\n' +
      '<defs><style type="text/css">' + styleCss + '</style>' +
      '<filter id="rough" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      '<filter id="bleed" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="6"/></filter>' +
      '</defs>\n' +
      (bg ? '<rect width="' + W + '" height="' + H + '" fill="' + bg + '"/>\n' : '') +
      body + '\n</svg>\n';
  }

  function miniSealSvg(x, y, size, paper) {
    const c = COLORS.red;
    return '<g transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(-2)">' +
      '<rect x="' + (-size / 2).toFixed(1) + '" y="' + (-size / 2).toFixed(1) + '" width="' + size.toFixed(1) + '" height="' + size.toFixed(1) + '" rx="' + (size * 0.1).toFixed(1) + '" fill="' + c + '"/>' +
      '<rect x="' + (-size * 0.22).toFixed(1) + '" y="' + (-size * 0.22).toFixed(1) + '" width="' + (size * 0.44).toFixed(1) + '" height="' + (size * 0.1).toFixed(1) + '" fill="' + paper + '"/>' +
      '<rect x="' + (-size * 0.22).toFixed(1) + '" y="' + (-size * 0.02).toFixed(1) + '" width="' + (size * 0.44).toFixed(1) + '" height="' + (size * 0.1).toFixed(1) + '" fill="' + paper + '"/>' +
      '<rect x="' + (-size * 0.1).toFixed(1) + '" y="' + (-size * 0.22).toFixed(1) + '" width="' + (size * 0.1).toFixed(1) + '" height="' + (size * 0.44).toFixed(1) + '" fill="' + paper + '"/>' +
      '</g>';
  }

  function svg(state) {
    const st = state;
    const ratio = st.ratio || '1:1';
    const dims = RATIOS[ratio] || RATIOS['1:1'];
    const W = dims[0], H = dims[1];
    const s = Math.min(W, H);
    const chars = splitChars(st.hangul).replace(/ /g, '').split('');
    const n = chars.length || 1;
    const pro = !!(st.opts && st.opts.pro);
    let body = '';

    /* ---------- seal ---------- */
    if (st.style === 'seal') {
      const bg = bgOf(st);
      const red = st.ink === 'black' ? COLORS.ink : st.ink === 'navy' ? COLORS.navy : COLORS.red;
      const paper = bg || COLORS.paper;
      const isRound = st.shape === 'round';
      const size = s * (isRound ? 0.54 : 0.51);
      const cx = W / 2, cy = H / 2 - (st.showLatin ? s * 0.03 : 0);
      const fw = size * 0.05;
      const cols = n <= 3 ? 1 : n <= 6 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const inner = size * (isRound ? 0.72 : 0.7);
      const cell = inner / Math.max(cols, rows);
      const fs = cell * 0.99;
      let g = '<g transform="translate(' + cx.toFixed(1) + ',' + cy.toFixed(1) + ') rotate(-0.6)">';
      if (isRound) {
        if (st.mode === 'engraved') {
          g += '<circle r="' + (size / 2).toFixed(1) + '" fill="' + red + '"/>';
          g += '<circle r="' + (size / 2 - fw * 1.35).toFixed(1) + '" fill="' + paper + '"/>';
        }
        g += '<circle r="' + (size / 2 - fw / 2).toFixed(1) + '" fill="none" stroke="' + red + '" stroke-width="' + fw.toFixed(1) + '"/>';
        g += '<circle r="' + (size / 2 - fw * 1.5).toFixed(1) + '" fill="none" stroke="' + red + '" stroke-width="' + (fw * 0.34).toFixed(1) + '"/>';
      } else {
        if (st.mode === 'engraved') {
          g += '<rect x="' + (-size / 2).toFixed(1) + '" y="' + (-size / 2).toFixed(1) + '" width="' + size.toFixed(1) + '" height="' + size.toFixed(1) + '" fill="' + red + '"/>';
          g += '<rect x="' + (-size / 2 + fw * 1.35).toFixed(1) + '" y="' + (-size / 2 + fw * 1.35).toFixed(1) + '" width="' + (size - fw * 2.7).toFixed(1) + '" height="' + (size - fw * 2.7).toFixed(1) + '" fill="' + paper + '"/>';
        }
        g += '<rect x="' + (-size / 2 + fw / 2).toFixed(1) + '" y="' + (-size / 2 + fw / 2).toFixed(1) + '" width="' + (size - fw).toFixed(1) + '" height="' + (size - fw).toFixed(1) + '" fill="none" stroke="' + red + '" stroke-width="' + fw.toFixed(1) + '"/>';
        g += '<rect x="' + (-size / 2 + fw * 1.6).toFixed(1) + '" y="' + (-size / 2 + fw * 1.6).toFixed(1) + '" width="' + (size - fw * 3.2).toFixed(1) + '" height="' + (size - fw * 3.2).toFixed(1) + '" fill="none" stroke="' + red + '" stroke-width="' + (fw * 0.32).toFixed(1) + '"/>';
      }
      g += '<g font-family="Song Myung, Noto Serif KR, serif" font-weight="700" font-size="' + fs.toFixed(1) + '" fill="' + (st.mode === 'engraved' ? paper : red) + '" text-anchor="middle" dominant-baseline="central">';
      chars.forEach((ch, i) => {
        const col = Math.floor(i / rows), row = i % rows;
        const itemsInCol = Math.min(rows, n - col * rows);
        const x = (cols === 1 ? 0 : (-(cols - 1) / 2 + col) * cell);
        const y = (-(itemsInCol - 1) / 2 + row) * cell;
        g += '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '">' + esc(ch) + '</text>';
      });
      g += '</g></g>';
      body += g + '\n';
      if (st.showLatin) {
        body += '<text x="' + W / 2 + '" y="' + (cy + size / 2 + s * 0.09).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.034).toFixed(1) + '" letter-spacing="' + (s * 0.006).toFixed(2) + '" fill="#4a4034" text-anchor="middle">' + esc(st.name.toUpperCase()) + '</text>\n';
      }
      if (!pro) body += svgWatermark(W, H, luminance(paper) > 0.5);
      return svgDoc(W, H, body, bg);
    }

    /* ---------- brush ---------- */
    if (st.style === 'brush') {
      const bg = bgOf(st);
      const paper = bg || '#F6F0E3';
      const vertical = st.dir !== 'horizontal';
      const ink = st.ink === 'black' ? COLORS.ink : st.ink === 'navy' ? COLORS.navy : '#1A1712';
      body += '<g font-family="Nanum Brush Script, cursive" fill="' + ink + '" text-anchor="middle" dominant-baseline="central">';
      if (vertical) {
        const fs = Math.min(W * 0.5, (H * (st.showLatin ? 0.62 : 0.74)) / n * 0.96);
        const startY = H / 2 - (fs * n) / 2 + fs / 2;
        chars.forEach((ch, i) => {
          const y = (startY + i * fs).toFixed(1);
          body += '<text x="' + (W / 2) + '" y="' + y + '" font-size="' + fs.toFixed(1) + '" filter="url(#bleed)" opacity="0.4">' + esc(ch) + '</text>';
          body += '<text x="' + (W / 2) + '" y="' + y + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>';
        });
        body += '</g>' + miniSealSvg(W / 2 + fs * 0.64, startY + (n - 1) * fs + fs * 0.2, s * 0.075, paper) + '\n';
      } else {
        const fs = Math.min(H * 0.34, (W * 0.84) / n);
        chars.forEach((ch, i) => {
          const x = (W / 2 - (fs * n) / 2 + fs / 2 + i * fs).toFixed(1);
          body += '<text x="' + x + '" y="' + (H / 2).toFixed(1) + '" font-size="' + fs.toFixed(1) + '" filter="url(#bleed)" opacity="0.4">' + esc(ch) + '</text>';
          body += '<text x="' + x + '" y="' + (H / 2).toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>';
        });
        body += '</g>' + miniSealSvg(W / 2 + (fs * n) / 2 + fs * 0.3, H / 2 + fs * 0.3, s * 0.075, paper) + '\n';
      }
      if (st.showLatin) body += '<text x="' + W / 2 + '" y="' + (H * 0.875).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.03).toFixed(1) + '" letter-spacing="' + (s * 0.008).toFixed(2) + '" fill="#4a4034" text-anchor="middle">' + esc(st.name.toUpperCase()) + '</text>\n';
      if (!pro) body += svgWatermark(W, H, luminance(paper) > 0.5);
      return svgDoc(W, H, body, bg);
    }

    /* ---------- tattoo ---------- */
    if (st.style === 'tattoo') {
      const bg = bgOf(st);
      const paper = bg || '#FFFFFF';
      const vertical = st.dir !== 'horizontal';
      body += '<g font-family="Black Han Sans, sans-serif" fill="none" stroke="#141414" stroke-width="' + (s * 0.0065).toFixed(2) + '" text-anchor="middle" dominant-baseline="central" stroke-linejoin="round">';
      if (vertical) {
        const fs = Math.min(W * 0.42, (H * (st.showLatin ? 0.52 : 0.66)) / n);
        const startY = H * 0.44 - (fs * n) / 2 + fs / 2;
        chars.forEach((ch, i) => { body += '<text x="' + (W / 2) + '" y="' + (startY + i * fs).toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>'; });
        const lineY = startY + (n - 1) * fs + fs * 0.64;
        body += '</g><line x1="' + (W / 2 - fs * 0.26) + '" y1="' + lineY.toFixed(1) + '" x2="' + (W / 2 + fs * 0.26) + '" y2="' + lineY.toFixed(1) + '" stroke="#141414" stroke-width="' + (fs * 0.012).toFixed(2) + '"/>\n';
        body += miniSealSvg(W / 2 + fs * 0.26, lineY + s * 0.065, s * 0.05, paper) + '\n';
      } else {
        const fs = Math.min(H * 0.26, (W * 0.72) / n);
        const y = H * 0.46;
        chars.forEach((ch, i) => { body += '<text x="' + (W / 2 - (fs * n) / 2 + fs / 2 + i * fs).toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>'; });
        const lineY = y + fs * 0.74;
        body += '</g><line x1="' + (W / 2 - fs * 0.26) + '" y1="' + lineY.toFixed(1) + '" x2="' + (W / 2 + fs * 0.26) + '" y2="' + lineY.toFixed(1) + '" stroke="#141414" stroke-width="' + (fs * 0.012).toFixed(2) + '"/>\n';
        body += miniSealSvg(W / 2 + fs * 0.44, y, s * 0.055, paper) + '\n';
      }
      if (st.showLatin) body += '<text x="' + W / 2 + '" y="' + (H * 0.885).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.028).toFixed(1) + '" letter-spacing="' + (s * 0.01).toFixed(2) + '" fill="#3a3a3a" text-anchor="middle">' + esc(st.name.toUpperCase()) + '</text>\n';
      if (!pro) body += svgWatermark(W, H, luminance(paper) > 0.5);
      return svgDoc(W, H, body, bg);
    }

    /* ---------- poster ---------- */
    const bg = POSTER_BG[st.bg] || POSTER_BG.cream;
    const ink = luminance(bg) > 0.55 ? '#15181D' : '#F7F2E8';
    const pad = s * 0.075;
    const tall = H / W > 1.4;
    body += '<text x="' + pad.toFixed(1) + '" y="' + (pad + s * 0.022).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.024).toFixed(1) + '" letter-spacing="' + (s * 0.007).toFixed(2) + '" fill="' + ink + '" opacity="0.75">한글 · SEOUL</text>\n';
    if (tall) {
      const fs = Math.min(W * 0.42, (H * 0.54) / n);
      const startY = H * 0.44 - (fs * n) / 2 + fs / 2;
      body += '<g font-family="Black Han Sans, sans-serif" fill="' + ink + '" text-anchor="middle" dominant-baseline="central">';
      chars.forEach((ch, i) => { body += '<text x="' + W / 2 + '" y="' + (startY + i * fs).toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>'; });
      body += '</g>\n';
      const lineY = startY + (n - 1) * fs + fs * 0.62;
      body += '<line x1="' + pad.toFixed(1) + '" y1="' + lineY.toFixed(1) + '" x2="' + (W - pad).toFixed(1) + '" y2="' + lineY.toFixed(1) + '" stroke="' + ink + '" stroke-width="' + (s * 0.0022).toFixed(2) + '" opacity="0.3"/>\n';
      if (st.showLatin) body += '<text x="' + pad.toFixed(1) + '" y="' + (lineY + s * 0.06).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.03).toFixed(1) + '" letter-spacing="' + (s * 0.011).toFixed(2) + '" fill="' + ink + '">' + esc(st.name.toUpperCase()) + '</text>\n';
    } else {
      const fs = Math.min((W - pad * 2) / n * 0.97, H * 0.26);
      const baseY = H * 0.66;
      body += '<g font-family="Black Han Sans, sans-serif" fill="' + ink + '">';
      chars.forEach((ch, i) => { body += '<text x="' + (pad + i * fs * 0.99).toFixed(1) + '" y="' + baseY.toFixed(1) + '" font-size="' + fs.toFixed(1) + '">' + esc(ch) + '</text>'; });
      body += '</g>\n';
      const lineY = baseY + fs * 0.24;
      body += '<line x1="' + pad.toFixed(1) + '" y1="' + lineY.toFixed(1) + '" x2="' + (W - pad).toFixed(1) + '" y2="' + lineY.toFixed(1) + '" stroke="' + ink + '" stroke-width="' + (s * 0.0022).toFixed(2) + '" opacity="0.3"/>\n';
      if (st.showLatin) body += '<text x="' + pad.toFixed(1) + '" y="' + (lineY + s * 0.062).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.032).toFixed(1) + '" letter-spacing="' + (s * 0.012).toFixed(2) + '" fill="' + ink + '">' + esc(st.name.toUpperCase()) + '</text>\n';
    }
    body += '<text x="' + pad.toFixed(1) + '" y="' + (H - pad).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.02).toFixed(1) + '" fill="' + ink + '" opacity="0.6">NAKGWAAN EDITION</text>\n';
    body += '<text x="' + (W - pad).toFixed(1) + '" y="' + (H - pad).toFixed(1) + '" font-family="Noto Sans KR, sans-serif" font-size="' + (s * 0.02).toFixed(1) + '" fill="' + ink + '" opacity="0.6" text-anchor="end">2026</text>\n';
    const sealSize = s * 0.075;
    body += '<rect x="' + (W - pad - sealSize).toFixed(1) + '" y="' + (pad - sealSize * 0.1).toFixed(1) + '" width="' + sealSize.toFixed(1) + '" height="' + sealSize.toFixed(1) + '" rx="' + (sealSize * 0.1).toFixed(1) + '" fill="' + COLORS.red + '"/>\n';
    body += '<text x="' + (W - pad - sealSize / 2).toFixed(1) + '" y="' + (pad + sealSize * 0.62).toFixed(1) + '" font-family="Song Myung, serif" font-size="' + (sealSize * 0.6).toFixed(1) + '" fill="' + bg + '" text-anchor="middle">' + esc(chars[0] || '印') + '</text>\n';
    if (!pro) body += svgWatermark(W, H, luminance(bg) > 0.5);
    return svgDoc(W, H, body, bg);
  }

  function svgWatermark(W, H, light) {
    const fs = Math.min(W, H) * 0.026;
    const pad = Math.min(W, H) * 0.035;
    const col = light ? '#111419' : '#ffffff';
    let g = '<g id="watermark" font-family="Noto Sans KR, sans-serif" fill="' + col + '" opacity="0.075" text-anchor="middle">';
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 4; j++) {
        const x = W * (0.12 + i * 0.26), y = H * (0.13 + j * 0.26);
        g += '<text x="' + x.toFixed(0) + '" y="' + y.toFixed(0) + '" font-size="' + fs.toFixed(1) + '" transform="rotate(-25 ' + x.toFixed(0) + ' ' + y.toFixed(0) + ')">HANGUL STAMP STUDIO · FREE</text>';
      }
    }
    g += '</g>';
    const label = 'FREE · ' + (window.CONFIG ? window.CONFIG.SITE_URL : 'hangul-stamp.studio');
    const bw = fs * 0.55 * label.length + fs * 1.6, bh = fs * 1.9;
    g += '<g><rect x="' + (W / 2 - bw / 2).toFixed(0) + '" y="' + (H - pad - bh).toFixed(0) + '" width="' + bw.toFixed(0) + '" height="' + bh.toFixed(0) + '" rx="' + (bh / 2).toFixed(0) + '" fill="' + (light ? '#ffffff' : '#0f1216') + '" opacity="0.72"/>' +
      '<text x="' + (W / 2).toFixed(0) + '" y="' + (H - pad - bh / 2 + fs * 0.35).toFixed(0) + '" font-family="Noto Sans KR, sans-serif" font-size="' + fs.toFixed(1) + '" font-weight="700" fill="' + (light ? '#282622' : '#ffffff') + '" text-anchor="middle">' + esc(label) + '</text></g>';
    return g;
  }

  const RATIOS = {
    '1:1': [1080, 1080],
    '9:16': [1080, 1920],
    '4:5': [1080, 1350]
  };

  function renderToCanvas(state, px, opts) {
    const base = RATIOS[state.ratio] || RATIOS['1:1'];
    const scale = px / base[0];
    const c = document.createElement('canvas');
    c.width = Math.round(base[0] * scale);
    c.height = Math.round(base[1] * scale);
    const ctx = c.getContext('2d');
    const st = Object.assign({}, state, { scale: scale });
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.scale(1, 1);
    // draw in base coordinates
    drawScaled(ctx, base[0], base[1], st, opts || {});
    return c;
  }

  function drawScaled(ctx, W, H, st, opts) {
    const prev = { w: st._w, h: st._h };
    if (st.style === 'brush') drawBrush(ctx, W, H, st, opts);
    else if (st.style === 'tattoo') drawTattoo(ctx, W, H, st, opts);
    else if (st.style === 'poster') drawPoster(ctx, W, H, st, opts);
    else drawSeal(ctx, W, H, st, opts);
  }

  /* ---------- font embedding: make the SVG self-contained ---------- */
  const FONT_SPEC_URL = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Nanum+Brush+Script&family=Song+Myung&family=Noto+Sans+KR:wght@400;500;700&display=swap';

  function b64FromBuffer(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function rangeHasChar(range, code) {
    const parts = range.split(',');
    for (let i = 0; i < parts.length; i++) {
      const m = parts[i].trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
      if (!m) continue;
      const a = parseInt(m[1], 16);
      const b = m[2] ? parseInt(m[2], 16) : a;
      if (code >= a && code <= b) return true;
    }
    return false;
  }

  async function embeddedFontCss(text) {
    const codes = [];
    text.split('').forEach((ch) => { const c = ch.codePointAt(0); if (c > 127 && codes.indexOf(c) < 0) codes.push(c); });
    const families = ['Black Han Sans', 'Song Myung', 'Nanum Brush Script', 'Noto Sans KR'];
    const css = await fetch(FONT_SPEC_URL).then((r) => (r.ok ? r.text() : ''));
    if (!css) return '';
    const blocks = css.split('@font-face').slice(1);
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const fm = b.match(/font-family:\s*'([^']+)'/);
      const rm = b.match(/unicode-range:\s*([^;]+);/);
      const um = b.match(/url\((https:[^)]+)\)/);
      if (!fm || !um) continue;
      const fam = fm[1];
      if (families.indexOf(fam) < 0) continue;
      if (rm && !codes.some((c) => rangeHasChar(rm[1], c))) continue;
      try {
        const buf = await fetch(um[1]).then((r) => (r.ok ? r.arrayBuffer() : null));
        if (!buf) continue;
        out.push("@font-face{font-family:'" + fam + "';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64," + b64FromBuffer(buf) + ") format('woff2');}");
      } catch (e) { /* skip this face */ }
    }
    return out.join('\n');
  }

  async function svgAsync(state) {
    const text = (state.hangul || '') + (state.name || '') + 'HANGUL STAMP STUDIO · FREE한글 · SEOULNAKGWAAN EDITION2026';
    let css = '';
    try { css = await embeddedFontCss(text); } catch (e) { css = ''; }
    const prev = FONT_CSS_OVERRIDE;
    FONT_CSS_OVERRIDE = css || null;
    try { return svg(state); } finally { FONT_CSS_OVERRIDE = prev === undefined ? null : prev; }
  }

  window.Render = {
    draw: draw,
    svgAsync: svgAsync,
    renderToCanvas: renderToCanvas,
    svg: svg,
    RATIOS: RATIOS,
    POSTER_BG: POSTER_BG,
    COLORS: COLORS,
    FONT: FONT
  };
})();
