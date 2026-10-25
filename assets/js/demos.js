/* =========================================================================
   The live proofs: one per chapter. Plain JavaScript, no libraries.
   Each demo is self-contained and starts from Demos.init(); every one keeps
   working from the keyboard and degrades to readable content without script.
   ========================================================================= */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  // small seeded PRNG so every visitor sees the same "random" data
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // radio groups made of buttons: arrows move, click selects
  function radioGroup(group, onPick) {
    const btns = $$('[role="radio"]', group);
    const pick = (b) => {
      btns.forEach((x) => { x.setAttribute("aria-checked", String(x === b)); x.tabIndex = x === b ? 0 : -1; });
      onPick(b);
    };
    btns.forEach((b, i) => {
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", () => pick(b));
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = btns[(i + d + btns.length) % btns.length];
        n.focus(); pick(n);
      });
    });
  }

  /* -----------------------------------------------------------------------
     1. INTERFACE: one card, two skins
     --------------------------------------------------------------------- */
  function initSkin() {
    const demo = $("#skin-demo");
    const group = $(".proof-interface .toggle");
    if (!demo || !group) return;
    radioGroup(group, (b) => {
      const skin = b.dataset.skin;
      if (demo.dataset.skin === skin) return;
      if (reduced()) { demo.dataset.skin = skin; return; }
      demo.classList.add("is-swapping");
      setTimeout(() => { demo.dataset.skin = skin; demo.classList.remove("is-swapping"); }, 220);
    });
    $$(".runcard button", demo).forEach((b) => b.addEventListener("click", () => {
      b.textContent = b.classList.contains("primary") ? "Approved" : "Sent to Slack";
    }));
  }

  /* -----------------------------------------------------------------------
     2. DATA: a Business 360-style board (sample figures, AtliQ Hardware)
     --------------------------------------------------------------------- */
  const MARKETS = {
    APAC: { India: 210.7, "South Korea": 49.0, Japan: 23.4, Australia: 22.6, Indonesia: 19.1, Philippines: 14.2 },
    EU: { France: 21.4, UK: 20.3, Germany: 15.9, Italy: 10.1, Netherlands: 8.4, Spain: 6.2 },
    NA: { USA: 125.3, Canada: 45.7 },
    LATAM: { Brazil: 5.5, Mexico: 4.9, Chile: 1.9, Colombia: 1.4 },
  };
  const GROWTH = { APAC: 1.62, EU: 1.44, NA: 1.71, LATAM: 1.28 };       // FY23 / FY22
  const MARGIN = { APAC: [36.1, 37.4], EU: [39.2, 38.6], NA: [37.8, 39.9], LATAM: [33.0, 34.1] };
  const ACCURACY = { APAC: [78.3, 82.9], EU: [71.5, 69.8], NA: [80.4, 84.6], LATAM: [64.0, 67.2] };
  const SEASON = [0.071, 0.074, 0.088, 0.112, 0.081, 0.069, 0.072, 0.075, 0.080, 0.086, 0.092, 0.100]; // Sep → Aug, sums to 1
  const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

  function boardData(fy, region) {
    const regions = region === "all" ? Object.keys(MARKETS) : [region];
    const markets = [];
    let sales = 0, salesPrev = 0, gm = 0, gmPrev = 0, fa = 0, faPrev = 0;
    for (const r of regions) {
      const f = fy === "2023" ? 1 : 1 / GROWTH[r];
      const fp = fy === "2023" ? 1 / GROWTH[r] : 1 / (GROWTH[r] * 1.18);
      let rs = 0, rp = 0;
      for (const [m, v] of Object.entries(MARKETS[r])) { markets.push([m, v * f]); rs += v * f; rp += v * fp; }
      const idx = fy === "2023" ? 1 : 0;
      gm += MARGIN[r][idx] * rs; gmPrev += (MARGIN[r][idx] - (idx ? MARGIN[r][1] - MARGIN[r][0] : 0.9)) * rp;
      fa += ACCURACY[r][idx] * rs; faPrev += (ACCURACY[r][idx] - (idx ? ACCURACY[r][1] - ACCURACY[r][0] : 2.1)) * rp;
      sales += rs; salesPrev += rp;
    }
    markets.sort((a, b) => b[1] - a[1]);
    const months = SEASON.map((s) => s * sales);
    const monthsPrev = SEASON.map((s, i) => s * salesPrev * (1 + (i % 3 - 1) * 0.015));
    return { markets: markets.slice(0, 6), sales, salesPrev, gm: gm / sales, gmPrev: gmPrev / salesPrev, fa: fa / sales, faPrev: faPrev / salesPrev, months, monthsPrev };
  }

  function initBoard() {
    const board = $("#board");
    if (!board) return;
    const bars = $("#board-bars"), line = $("#board-line"), sel = $("#board-region");
    let fy = "2023";
    const fmtM = (v) => "$" + (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + "M";
    const delta = (el, now, prev, unit) => {
      const d = unit === "%" ? now - prev : ((now - prev) / prev) * 100;
      el.textContent = (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + (unit === "%" ? " pts" : "%") + " vs prior year";
      el.className = d >= 0 ? "up" : "down";
    };
    const count = (el, to, fmt) => {
      const from = parseFloat(el.dataset.v || "0");
      el.dataset.v = to;
      if (reduced()) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 700;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // charts are drawn at their real pixel width, so their text stays at text size
    const rows = [];
    let W = 0;
    const layoutBars = () => {
      W = Math.max(280, Math.round(bars.getBoundingClientRect().width || 320));
      bars.setAttribute("viewBox", `0 0 ${W} 180`);
      bars.replaceChildren(); rows.length = 0;
      const rowH = 26, labelW = 96, valW = 64;
      for (let i = 0; i < 6; i++) {
        const g = svgEl("g", { transform: `translate(0 ${i * (rowH + 4) + 2})` }, bars);
        const label = svgEl("text", { x: labelW - 10, y: rowH / 2 + 5, "text-anchor": "end" }, g);
        svgEl("rect", { x: labelW, y: 3, width: W - labelW - valW, height: rowH - 6, rx: 3, fill: "#2C2C2A" }, g);
        const bar = svgEl("rect", { x: labelW, y: 3, width: W - labelW - valW, height: rowH - 6, rx: 3, fill: "#F3B705" }, g);
        bar.style.transformBox = "fill-box"; bar.style.transformOrigin = "left center";
        bar.style.transition = "transform 700ms cubic-bezier(.16,1,.3,1)";
        bar.style.transform = "scaleX(0.02)";
        const val = svgEl("text", { x: W - valW + 10, y: rowH / 2 + 5, class: "val" }, g);
        rows.push({ g, label, bar, val });
      }
    };

    const drawLine = (d) => {
      const LW = Math.max(280, Math.round(line.getBoundingClientRect().width || 320));
      line.setAttribute("viewBox", `0 0 ${LW} 180`);
      line.replaceChildren();
      const max = Math.max(...d.months, ...d.monthsPrev) * 1.12;
      const x = (i) => 10 + (i * (LW - 20)) / 11, y = (v) => 150 - (v / max) * 136;
      for (const i of [0, 3, 6, 9, 11]) svgEl("text", { x: x(i), y: 174, "text-anchor": i === 0 ? "start" : i === 11 ? "end" : "middle" }, line).textContent = MONTHS[i];
      const path = (arr) => arr.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
      svgEl("path", { d: path(d.monthsPrev), fill: "none", stroke: "#6B6A65", "stroke-width": 2 }, line);
      const p = svgEl("path", { d: path(d.months), fill: "none", stroke: "#F3B705", "stroke-width": 3, "stroke-linejoin": "round" }, line);
      const last = d.months.length - 1;
      svgEl("circle", { cx: x(last), cy: y(d.months[last]), r: 4.5, fill: "#F3B705" }, line);
      svgEl("text", { x: x(last) - 4, y: y(d.months[last]) - 12, "text-anchor": "end", class: "val" }, line).textContent = fmtM(d.months[last]);
      if (!reduced()) {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = "stroke-dashoffset 1100ms cubic-bezier(.16,1,.3,1)";
        p.style.strokeDashoffset = 0;
      }
    };

    const render = () => {
      const d = boardData(fy, sel.value);
      count($("#kpi-sales"), d.sales, fmtM);
      count($("#kpi-gm"), d.gm, (v) => v.toFixed(1) + "%");
      count($("#kpi-fa"), d.fa, (v) => v.toFixed(1) + "%");
      delta($("#kpi-sales-d"), d.sales, d.salesPrev, "$");
      delta($("#kpi-gm-d"), d.gm, d.gmPrev, "%");
      delta($("#kpi-fa-d"), d.fa, d.faPrev, "%");
      const max = d.markets[0][1];
      rows.forEach((r, i) => {
        const m = d.markets[i];
        r.g.style.opacity = m ? 1 : 0;
        if (!m) return;
        r.label.textContent = m[0];
        r.val.textContent = fmtM(m[1]);
        r.bar.style.transform = `scaleX(${Math.max(0.02, m[1] / max)})`;
        r.bar.setAttribute("fill", i === 0 ? "#F3B705" : "#C9A23A");
      });
      drawLine(d);
    };
    radioGroup($(".seg", board), (b) => { fy = b.dataset.fy; render(); });
    sel.addEventListener("change", render);
    let lastW = 0, rz = 0;
    const relayout = () => { const w = Math.round(bars.getBoundingClientRect().width); if (w && w !== lastW) { lastW = w; layoutBars(); render(); } };
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(relayout, 150); });
    layoutBars(); lastW = Math.round(bars.getBoundingClientRect().width);
    render();
  }

  /* -----------------------------------------------------------------------
     3. MODELS: a 2-16-1 network trained with Adam, in the browser
     --------------------------------------------------------------------- */
  function initTrainer() {
    const canvas = $("#train-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const H = 16;
    let pts = [], net, opt, epoch = 0, losses = [], running = false, seed = 7;

    const makeData = () => {
      const r = rng(seed); pts = [];
      for (let i = 0; i < 200; i++) {
        const c = i % 2, t = Math.PI * r();
        let x = c ? 1 - Math.cos(t) : Math.cos(t), y = c ? 0.5 - Math.sin(t) : Math.sin(t);
        x += gauss(r) * 0.12; y += gauss(r) * 0.12;
        pts.push([(x - 0.5) / 1.3, (y - 0.25) / 1.3, c]);
      }
    };
    const init = () => {
      const r = rng(seed * 31 + 1);
      net = { W1: Array.from({ length: H }, () => [gauss(r) * 1.1, gauss(r) * 1.1]), b1: Array(H).fill(0).map(() => gauss(r) * 0.1), W2: Array.from({ length: H }, () => gauss(r) * 0.5), b2: 0 };
      const z = () => ({ W1: Array.from({ length: H }, () => [0, 0]), b1: Array(H).fill(0), W2: Array(H).fill(0), b2: 0 });
      opt = { m: z(), v: z(), t: 0 };
      epoch = 0; losses = [];
    };
    const forward = (x, y) => {
      const h = new Array(H);
      let o = net.b2;
      for (let j = 0; j < H; j++) { h[j] = Math.tanh(net.W1[j][0] * x + net.W1[j][1] * y + net.b1[j]); o += net.W2[j] * h[j]; }
      return { h, p: 1 / (1 + Math.exp(-o)) };
    };
    const stepEpoch = () => {
      const g = { W1: Array.from({ length: H }, () => [0, 0]), b1: Array(H).fill(0), W2: Array(H).fill(0), b2: 0 };
      let loss = 0, correct = 0;
      for (const [x, y, c] of pts) {
        const { h, p } = forward(x, y);
        loss += -(c * Math.log(p + 1e-9) + (1 - c) * Math.log(1 - p + 1e-9));
        if ((p > 0.5 ? 1 : 0) === c) correct++;
        const dO = p - c;
        g.b2 += dO;
        for (let j = 0; j < H; j++) {
          g.W2[j] += dO * h[j];
          const dh = dO * net.W2[j] * (1 - h[j] * h[j]);
          g.W1[j][0] += dh * x; g.W1[j][1] += dh * y; g.b1[j] += dh;
        }
      }
      const n = pts.length, lr = 0.03, b1 = 0.9, b2 = 0.999;
      opt.t++;
      const upd = (obj, key, gv, mo, vo) => {
        mo[key] = b1 * mo[key] + (1 - b1) * gv; vo[key] = b2 * vo[key] + (1 - b2) * gv * gv;
        const mh = mo[key] / (1 - Math.pow(b1, opt.t)), vh = vo[key] / (1 - Math.pow(b2, opt.t));
        obj[key] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
      };
      for (let j = 0; j < H; j++) {
        upd(net.W1[j], 0, g.W1[j][0] / n, opt.m.W1[j], opt.v.W1[j]);
        upd(net.W1[j], 1, g.W1[j][1] / n, opt.m.W1[j], opt.v.W1[j]);
        upd(net.b1, j, g.b1[j] / n, opt.m.b1, opt.v.b1);
        upd(net.W2, j, g.W2[j] / n, opt.m.W2, opt.v.W2);
      }
      upd(net, "b2", g.b2 / n, opt.m, opt.v);
      epoch++;
      losses.push(loss / n);
      return { loss: loss / n, acc: correct / n };
    };

    // the decision field is computed on a small grid and scaled up smoothly, so no seams
    const G = 60, field = document.createElement("canvas");
    field.width = field.height = G;
    const fctx = field.getContext("2d"), fimg = fctx.createImageData(G, G);
    const BG = [31, 59, 39], A = [244, 243, 238], B = [243, 183, 5];
    const draw = (stats) => {
      const S = canvas.width;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const x = (i + 0.5) / G * 2.4 - 1.2, y = 1.2 - (j + 0.5) / G * 2.4;
        const p = forward(x, y).p;
        const c = p > 0.5 ? B : A, k = p > 0.5 ? 0.14 + Math.abs(p - 0.5) * 0.8 : 0.06 + Math.abs(p - 0.5) * 0.5;
        const o = (j * G + i) * 4;
        fimg.data[o] = BG[0] + (c[0] - BG[0]) * k; fimg.data[o + 1] = BG[1] + (c[1] - BG[1]) * k; fimg.data[o + 2] = BG[2] + (c[2] - BG[2]) * k; fimg.data[o + 3] = 255;
      }
      fctx.putImageData(fimg, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(field, 0, 0, S, S);
      for (const [x, y, c] of pts) {
        const px = ((x + 1.2) / 2.4) * S, py = ((1.2 - y) / 2.4) * S;
        ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = c ? "#F3B705" : "#F4F3EE"; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#1A3322"; ctx.stroke();
      }
      $("#train-epoch").textContent = epoch;
      if (stats) { $("#train-loss").textContent = stats.loss.toFixed(3); $("#train-acc").textContent = Math.round(stats.acc * 100) + "%"; }
      const curve = $("#train-curve");
      curve.replaceChildren();
      if (losses.length > 1) {
        const max = Math.max(0.75, losses[0]);
        const d = losses.map((l, i) => (i ? "L" : "M") + (8 + (i / Math.max(400, losses.length)) * 224).toFixed(1) + " " + (110 - (l / max) * 100).toFixed(1)).join(" ");
        svgEl("path", { d, fill: "none", stroke: "#F3B705", "stroke-width": 2.5, "stroke-linejoin": "round" }, curve);
      }
    };

    const evalStats = () => {
      let loss = 0, correct = 0;
      for (const [x, y, c] of pts) { const p = forward(x, y).p; loss += -(c * Math.log(p + 1e-9) + (1 - c) * Math.log(1 - p + 1e-9)); if ((p > 0.5 ? 1 : 0) === c) correct++; }
      return { loss: loss / pts.length, acc: correct / pts.length };
    };
    const train = () => {
      if (running) return;
      running = true;
      $("#train-go").textContent = "Training…";
      const target = epoch + 400;
      const tick = () => {
        let s;
        const per = reduced() ? 400 : 6;
        for (let k = 0; k < per && epoch < target; k++) s = stepEpoch();
        draw(s);
        if (epoch < target) requestAnimationFrame(tick);
        else { running = false; $("#train-go").textContent = "Train 400 more"; }
      };
      requestAnimationFrame(tick);
    };
    $("#train-go").addEventListener("click", train);
    $("#train-new").addEventListener("click", () => { if (running) return; seed = (seed * 7 + 3) % 997; makeData(); init(); draw(evalStats()); $("#train-go").textContent = "Train"; });
    makeData(); init(); draw(evalStats());
    // train once by itself the first time it is seen
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(train, 500); } }, { threshold: 0.5 });
    io.observe(canvas);
  }

  /* -----------------------------------------------------------------------
     4. ATTENTION: scaled dot-product self-attention over the visitor's words
     --------------------------------------------------------------------- */
  function initAttention() {
    const input = $("#attn-text"), grid = $("#attn-grid"), mask = $("#attn-mask"), read = $("#attn-read");
    if (!input || !grid) return;
    const D = 32;
    const r = rng(2025);
    const proj = () => Array.from({ length: D }, (_, i) => Array.from({ length: D }, (_, j) => (i === j ? 1 : 0) + gauss(r) * 0.35));
    const Wq = proj(), Wk = proj();
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const embed = (tok, pos) => {
      const v = new Float32Array(D), w = "^" + tok + "$";
      for (let i = 0; i < w.length - 2; i++) { const h = hash(w.slice(i, i + 3)); v[h % D] += (h & 1 ? 1 : -1); }
      v[hash(tok) % D] += 2;
      let n = Math.hypot(...v) || 1;
      for (let i = 0; i < D; i++) v[i] = v[i] / n + 0.35 * (i % 2 ? Math.cos(pos / Math.pow(100, (i - 1) / D)) : Math.sin(pos / Math.pow(100, i / D)));
      return v;
    };
    const mul = (v, W) => { const o = new Float32Array(D); for (let j = 0; j < D; j++) { let s = 0; for (let i = 0; i < D; i++) s += v[i] * W[i][j]; o[j] = s; } return o; };
    let hot = -1, weights = [], toks = [];

    const compute = () => {
      toks = input.value.toLowerCase().replace(/[^a-z0-9'\s-]/g, " ").split(/\s+/).filter(Boolean).slice(0, 14);
      const X = toks.map((t, i) => embed(t, i)), Q = X.map((x) => mul(x, Wq)), K = X.map((x) => mul(x, Wk));
      const causal = mask.checked;
      weights = Q.map((q, i) => {
        const s = K.map((k, j) => (causal && j > i ? -Infinity : q.reduce((a, qv, d) => a + qv * k[d], 0) / Math.sqrt(D) * 3));
        const m = Math.max(...s.filter(Number.isFinite));
        const e = s.map((v) => (Number.isFinite(v) ? Math.exp(v - m) : 0));
        const z = e.reduce((a, b) => a + b, 0);
        return e.map((v) => v / z);
      });
    };
    const describe = (i) => {
      if (i < 0 || !toks.length) { read.textContent = toks.length ? "Hover or focus a row to read it." : "Type a few words."; return; }
      const row = weights[i];
      let best = -1, bw = -1;
      row.forEach((w, j) => { if (j !== i && w > bw) { bw = w; best = j; } });
      read.textContent = best < 0
        ? `“${toks[i]}” is the first token, so with the mask on it can only attend to itself.`
        : `“${toks[i]}” puts ${Math.round(row[i] * 100)}% on itself and attends most to “${toks[best]}” (${Math.round(bw * 100)}%).`;
    };
    const render = () => {
      compute();
      const n = toks.length;
      grid.style.setProperty("--n", n);
      const labelW = Math.min(110, 18 + Math.max(4, ...toks.map((t) => t.length)) * 8);
      grid.style.setProperty("--label-w", labelW + "px");
      const frag = document.createDocumentFragment();
      const head = document.createElement("div"); head.className = "attn-head"; head.setAttribute("aria-hidden", "true");
      head.appendChild(document.createElement("span")).textContent = "";
      toks.forEach((t) => { head.appendChild(document.createElement("span")).textContent = t; });
      frag.appendChild(head);
      weights.forEach((row, i) => {
        const rowEl = document.createElement("div");
        rowEl.className = "attn-row" + (i === hot ? " is-hot" : "");
        rowEl.tabIndex = 0;
        const top = row.map((w, j) => [w, j]).sort((a, b) => b[0] - a[0])[0];
        rowEl.setAttribute("aria-label", `${toks[i]}: attends most to ${toks[top[1]]}, ${Math.round(top[0] * 100)} percent`);
        const lab = document.createElement("span"); lab.className = "tok"; lab.textContent = toks[i]; lab.setAttribute("aria-hidden", "true");
        rowEl.appendChild(lab);
        row.forEach((w, j) => {
          const c = document.createElement("span");
          c.className = "attn-cell" + (mask.checked && j > i ? " is-masked" : "");
          c.style.setProperty("--w", Math.pow(w, 0.8).toFixed(3));
          c.setAttribute("aria-hidden", "true");
          rowEl.appendChild(c);
        });
        const on = () => { hot = i; $$(".attn-row", grid).forEach((x, k) => x.classList.toggle("is-hot", k === i)); describe(i); };
        rowEl.addEventListener("mouseenter", on);
        rowEl.addEventListener("focus", on);
        frag.appendChild(rowEl);
      });
      grid.replaceChildren(frag);
      describe(hot < n ? hot : -1);
    };
    let tmr;
    input.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(render, 120); });
    mask.addEventListener("change", render);
    hot = 6;
    render();
  }

  /* -----------------------------------------------------------------------
     5. AGENTS ON AWS: a replay of the pattern, lighting the architecture
     --------------------------------------------------------------------- */
  // two layouts of the same architecture: wide for desktop, tall for a phone
  const LAYOUTS = {
    wide: {
      view: "0 0 640 284", w: 0,
      nodes: {
        req: [8, 112, 104], api: [128, 112, 112], lambda: [256, 112, 100], core: [372, 112, 116],
        llm: [512, 16, 120], mcp: [512, 112, 120], data: [512, 208, 120], obs: [256, 208, 232],
      },
    },
    tall: {
      view: "0 0 340 444", w: 0,
      nodes: {
        req: [0, 0, 160], api: [180, 0, 160], lambda: [180, 96, 160], core: [180, 192, 160],
        llm: [0, 192, 160], mcp: [180, 288, 160], obs: [0, 288, 160], data: [180, 384, 160],
      },
    },
  };
  const LABELS = {
    req: ["Request", "you"], api: ["API Gateway", "auth, rate limit"], lambda: ["Lambda", "session"],
    core: ["AgentCore", "agent runtime"], llm: ["Bedrock", "Claude"], mcp: ["MCP server", "on ECS Fargate"],
    data: ["RDS · S3", "records, logs"], obs: ["CloudWatch", "traces, cost, latency"],
  };
  const WIRES = [["req", "api"], ["api", "lambda"], ["lambda", "core"], ["core", "llm"], ["core", "mcp"], ["mcp", "data"], ["core", "obs"]];
  // an orthogonal wire between two boxes: straight when they share a row or column, one elbow otherwise
  const route = (A, B) => {
    const [ax, ay, aw] = A, [bx, by, bw] = B, h = 60;
    const acx = ax + aw / 2, acy = ay + h / 2, bcx = bx + bw / 2, bcy = by + h / 2;
    if (Math.abs(acy - bcy) < 1) return acx < bcx ? `M${ax + aw} ${acy} H${bx}` : `M${ax} ${acy} H${bx + bw}`;
    if (Math.abs(acx - bcx) < 1) return acy < bcy ? `M${acx} ${ay + h} V${by}` : `M${acx} ${ay} V${by + h}`;
    // vertical first out of A, then across into B's side
    const x = bx > ax ? Math.min(ax + aw - 24, acx + 30) : acx;
    if (by + h <= ay) return `M${x} ${ay} V${bcy} H${bx > ax ? bx : bx + bw}`;
    if (by >= ay + h) return `M${x} ${ay + h} V${by}`;
    return `M${acx} ${ay + h} V${bcy} H${bx + bw}`;
  };

  const ASKS = {
    deploys: [
      ["req,api", "api", "POST /v1/agent  “Why did last week’s deploys fail?”"],
      ["lambda", "lambda", "session s-81f2 opened · user verified · budget 60 s"],
      ["core,llm", "core-llm", "plan → 1) list failed deploys  2) read their logs  3) find a shared cause"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  deploys.list_failed(since=\"7d\")\n      → 3 runs: web-412, api-388, web-415"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  logs.search(runs=[…], level=\"error\")\n      → 2 of 3: SecretNotFound staging/db-password"],
      ["core,llm", "core-llm", "check → evidence agrees across both runs; third failure is a flaky test"],
      ["core,obs", "core-obs", "trace saved · 6 tool calls · 41 s · $0.04"],
      ["req", "", "answer  Two of the three failures share one cause: the staging\n        database secret expired on Tuesday. Rotate it and re-run.\n        The third was a flaky checkout test."],
    ],
    churn: [
      ["req,api", "api", "POST /v1/agent  “Which customers left after the price change?”"],
      ["lambda", "lambda", "session s-27aa opened · read-only data scope"],
      ["core,llm", "core-llm", "plan → 1) find the change date  2) compare churn before and after  3) segment it"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  billing.price_changes(plan=\"team\")\n      → effective 2026-03-01"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  sql.query(\"churn by segment, 60 days either side\")\n      → small teams: 2.1% → 4.8%  ·  enterprise: flat"],
      ["core,llm", "core-llm", "check → seasonality ruled out against the same window last year"],
      ["core,obs", "core-obs", "trace saved · 5 tool calls · 33 s · $0.03"],
      ["req", "", "answer  Churn more than doubled for teams under 10 seats;\n        larger accounts didn’t move. 214 accounts, list attached."],
    ],
    docs: [
      ["req,api", "api", "POST /v1/agent  “Is our refund policy the same in the EU?”"],
      ["lambda", "lambda", "session s-90c1 opened · documents scope"],
      ["core,llm", "core-llm", "plan → 1) find both policies  2) compare clause by clause  3) cite sources"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  docs.search(\"refund policy\", region=[\"US\",\"EU\"])\n      → policy-us.md (v12), policy-eu.md (v9)"],
      ["core,mcp,data", "core-mcp,mcp-data", "tool  docs.diff(\"policy-us.md\", \"policy-eu.md\")\n      → 2 clauses differ: window, digital goods"],
      ["core,llm", "core-llm", "check → EU 14-day window is required by law, not a mistake"],
      ["core,obs", "core-obs", "trace saved · 4 tool calls · 19 s · $0.02"],
      ["req", "", "answer  Not quite: the EU allows 14 days instead of 30 for\n        digital goods, as required by EU consumer law. Sources cited."],
    ],
  };

  function initAgent() {
    const svg = $("#arch"), trace = $("#trace"), run = $("#agent-run");
    if (!svg || !trace || !run) return;
    const wireEls = {}, nodeEls = {};
    let layout = "";
    const build = () => {
      const want = svg.parentElement.clientWidth < 540 ? "tall" : "wide";
      if (want === layout) return;
      layout = want;
      const L = LAYOUTS[want];
      svg.setAttribute("viewBox", L.view);
      svg.replaceChildren();
      for (const [a, b] of WIRES) wireEls[a + "-" + b] = svgEl("path", { d: route(L.nodes[a], L.nodes[b]), class: "wire" }, svg);
      for (const [k, [x, y, w]] of Object.entries(L.nodes)) {
        const g = svgEl("g", { class: "node", transform: `translate(${x} ${y})` }, svg);
        svgEl("rect", { width: w, height: 60, rx: 8 }, g);
        svgEl("text", { x: 12, y: 26 }, g).textContent = LABELS[k][0];
        svgEl("text", { x: 12, y: 46, class: "sub-t" }, g).textContent = LABELS[k][1];
        nodeEls[k] = g;
      }
    };
    build();
    let rz = 0;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(build, 150); });
    // the short names used by the scripts
    const wireKey = { api: "req-api", lambda: "api-lambda", "core-llm": "core-llm", "core-mcp": "core-mcp", "mcp-data": "mcp-data", "core-obs": "core-obs" };
    let ask = "deploys", timer = 0, playing = false;
    radioGroup($(".asks"), (b) => { ask = b.dataset.ask; if (playing) start(); });

    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const fmt = (s) => {
      let h = esc(s);
      h = h.replace(/^(POST [^ ]+)/, '<span class="t-step">$1</span>')
        .replace(/^(plan|check) →/, '<span class="t-step">$1 →</span>')
        .replace(/^tool {2}([\w.]+)/, '<span class="t-tool">tool  $1</span>')
        .replace(/^(answer)/, '<span class="t-ok">$1</span>')
        .replace(/^(session|trace saved)/, '<span class="t-dim">$1</span>');
      return h;
    };
    const lit = (nodes, wires) => {
      Object.values(nodeEls).forEach((g) => { if (g.classList.contains("is-on")) { g.classList.remove("is-on"); g.classList.add("was-on"); } });
      Object.values(wireEls).forEach((w) => w.classList.remove("is-on"));
      nodes.split(",").filter(Boolean).forEach((n) => { nodeEls[n].classList.remove("was-on"); nodeEls[n].classList.add("is-on"); });
      wires.split(",").filter(Boolean).forEach((w) => { const el = wireEls[wireKey[w] || w]; if (el) el.classList.add("is-on"); });
    };
    const start = () => {
      clearTimeout(timer);
      Object.values(nodeEls).forEach((g) => g.classList.remove("is-on", "was-on"));
      const steps = ASKS[ask];
      trace.innerHTML = "<code></code>";
      const code = trace.firstChild;
      playing = true;
      run.textContent = "Running…";
      let i = 0;
      const next = () => {
        if (i >= steps.length) {
          playing = false; run.textContent = "Run it again";
          Object.values(nodeEls).forEach((g) => g.classList.remove("is-on"));
          Object.values(wireEls).forEach((w) => w.classList.remove("is-on"));
          return;
        }
        const [nodes, wires, text] = steps[i++];
        lit(nodes, wires);
        code.innerHTML += (code.innerHTML ? "\n" : "") + fmt(text);
        trace.scrollTop = trace.scrollHeight;
        timer = setTimeout(next, reduced() ? 0 : 900 + text.length * 6);
      };
      next();
    };
    run.addEventListener("click", start);
    // show the finished trace of the first request as the resting state
    const steps = ASKS.deploys;
    trace.innerHTML = "<code>" + steps.map((s) => fmt(s[2])).join("\n") + "</code>";
  }

  window.Demos = {
    init() {
      for (const f of [initSkin, initBoard, initTrainer, initAttention, initAgent]) {
        try { f(); } catch (e) { console.error(e); }
      }
    },
  };
})();
