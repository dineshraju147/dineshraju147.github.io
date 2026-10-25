/* =========================================================================
   Sales 360: the shape of my Business 360 Power BI board, in the browser.
   Sample data for AtliQ Hardware, the fictional company in the Codebasics
   challenge. Filters scope everything; a click on a market filters the rest.
   ========================================================================= */
(() => {
  "use strict";
  const V = () => window.Viz;
  const C = { series: "#2a78d6", last: "#a8a59c", muted: "#d9d6cd", good: "#0ca30c", bad: "#d03b3b", grid: "#e7e4dc", ink: "#1B1814", ink2: "#5b564d" };

  const MARKETS = [
    ["India", "APAC", 21], ["South Korea", "APAC", 8], ["Philippines", "APAC", 6], ["Indonesia", "APAC", 5], ["Japan", "APAC", 4], ["Australia", "APAC", 4], ["New Zealand", "APAC", 1.2],
    ["USA", "NA", 14], ["Canada", "NA", 5],
    ["United Kingdom", "EU", 5], ["France", "EU", 5], ["Germany", "EU", 4], ["Italy", "EU", 3], ["Spain", "EU", 2], ["Netherlands", "EU", 1.6],
    ["Mexico", "LATAM", 1.6], ["Brazil", "LATAM", 1.3], ["Chile", "LATAM", 0.6],
  ];
  const REGIONS = { all: "All regions", APAC: "Asia Pacific", EU: "Europe", NA: "North America", LATAM: "Latin America" };
  const CHANNELS = [["Retailer", 0.73, 0], ["Direct", 0.15, 0.06], ["Distributor", 0.12, -0.03]];
  const SEGMENTS = [["Notebook", 0.27, 0.31, 820], ["Peripherals", 0.22, 0.37, 45], ["Accessories", 0.18, 0.43, 18], ["Desktop", 0.12, 0.28, 650], ["Storage", 0.11, 0.35, 120], ["Networking", 0.1, 0.4, 90]];
  const PRODUCTS = {
    Notebook: ["AQ Smash 2", "AQ Velocity", "AQ Digit"], Peripherals: ["AQ Gamers Ms", "AQ Maxima Ms", "AQ Qwerty"], Accessories: ["AQ Pen Drive 2 IN 1", "AQ Wi Power Dx3", "AQ Clx1"],
    Desktop: ["AQ Home Allin1 Gen 2", "AQ Electron 3"], Storage: ["AQ Zion Saga", "AQ WereWolf NAS"], Networking: ["AQ Mforce Gen X", "AQ Wi Power Dx1"],
  };
  const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const SEASON = [0.072, 0.078, 0.104, 0.11, 0.074, 0.07, 0.08, 0.081, 0.083, 0.08, 0.082, 0.085];
  const TOTAL = { 2021: 300, 2022: 620, 2023: 900, 2024: 1170 }; // $M
  const FYS = [2022, 2023, 2024];

  // the fact table: fiscal year × market × channel × segment × month
  let FACT = null;
  function build() {
    const r = V().rng(360);
    const mix = MARKETS.map(([, , w]) => w);
    const sum = mix.reduce((a, b) => a + b, 0);
    const growth = MARKETS.map(() => 1 + r.gauss() * 0.12);
    const acc = MARKETS.map(() => 0.08 + r() * 0.2); // how far off each market's forecast tends to be
    const gmAdj = MARKETS.map(() => (r() - 0.5) * 0.04);
    const prodShare = {};
    for (const seg of Object.keys(PRODUCTS)) {
      const n = PRODUCTS[seg].length;
      prodShare[seg] = MARKETS.map(() => { const raw = PRODUCTS[seg].map((_, i) => (n - i) + r() * 0.8); const t = raw.reduce((a, b) => a + b, 0); return raw.map((x) => x / t); });
    }
    const rows = [];
    for (const fy of [2021, ...FYS]) {
      const drift = fy === 2024 ? -0.012 : fy === 2023 ? -0.004 : 0;
      MARKETS.forEach(([m, reg], mi) => {
        const share = (mix[mi] / sum) * Math.pow(growth[mi], fy - 2021);
        CHANNELS.forEach(([ch, chs, chg]) => {
          SEGMENTS.forEach(([seg, ss, sgm, price]) => {
            MONTHS.forEach((_, k) => {
              const ns = TOTAL[fy] * share * chs * ss * SEASON[k] * (0.9 + r() * 0.2);
              const gm = sgm + chg + gmAdj[mi] + drift + (r() - 0.5) * 0.03;
              const fc = ns * (1 + (r() - 0.5) * 2 * acc[mi]);
              rows.push({ fy, m, mi, reg, ch, seg, k, ns, gp: ns * gm, fc, units: (ns * 1e6) / price });
            });
          });
        });
      });
    }
    FACT = { rows, prodShare };
  }

  const state = { fy: 2024, region: "all", channel: "all", market: null };
  const inScope = (d, fy, useMarket = true) => d.fy === fy && (state.region === "all" || d.reg === state.region) && (state.channel === "all" || d.ch === state.channel) && (!useMarket || !state.market || d.m === state.market);

  function aggregate() {
    const cur = { ns: 0, gp: 0, err: 0, units: 0, month: Array(12).fill(0) }, ly = { ns: 0, gp: 0, err: 0, units: 0, month: Array(12).fill(0) };
    const markets = {}, marketsLy = {}, segs = {}, segsLy = {}, prods = {};
    for (const d of FACT.rows) {
      if (inScope(d, state.fy, false)) markets[d.m] = (markets[d.m] || 0) + d.ns;
      if (inScope(d, state.fy - 1, false)) marketsLy[d.m] = (marketsLy[d.m] || 0) + d.ns;
      const isCur = inScope(d, state.fy), isLy = inScope(d, state.fy - 1);
      if (!isCur && !isLy) continue;
      const t = isCur ? cur : ly;
      t.ns += d.ns; t.gp += d.gp; t.err += Math.abs(d.ns - d.fc); t.units += d.units; t.month[d.k] += d.ns;
      const sg = isCur ? segs : segsLy;
      sg[d.seg] = sg[d.seg] || { ns: 0, gp: 0 };
      sg[d.seg].ns += d.ns; sg[d.seg].gp += d.gp;
      if (isCur) {
        PRODUCTS[d.seg].forEach((p, i) => {
          const sh = FACT.prodShare[d.seg][d.mi][i];
          prods[p] = prods[p] || { ns: 0, gp: 0, seg: d.seg };
          prods[p].ns += d.ns * sh; prods[p].gp += d.gp * sh;
        });
      }
    }
    return { cur, ly, markets, marketsLy, segs, segsLy, prods };
  }

  function init() {
    const root = document.getElementById("bi");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";
    build();
    const tip = V().tooltip(root);
    const $ = (s) => root.querySelector(s);

    // filters: one row above everything they scope
    const fySeg = $("#bi-fy");
    FYS.forEach((fy) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "radio"); b.dataset.fy = fy; b.textContent = "FY " + fy;
      b.addEventListener("click", () => { state.fy = fy; render(); });
      fySeg.appendChild(b);
    });
    fySeg.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const i = (FYS.indexOf(state.fy) + d + FYS.length) % FYS.length;
      state.fy = FYS[i]; render(); fySeg.querySelector(`[data-fy="${state.fy}"]`).focus();
    });
    $("#bi-region").addEventListener("change", (e) => { state.region = e.target.value; state.market = null; render(); });
    $("#bi-channel").addEventListener("change", (e) => { state.channel = e.target.value; render(); });
    $("#bi-clear").addEventListener("click", () => { state.market = null; render(); });

    function render() {
      if (!root.offsetWidth) return;
      const A = aggregate();
      fySeg.querySelectorAll("button").forEach((b) => { const on = +b.dataset.fy === state.fy; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      const clr = $("#bi-clear");
      clr.hidden = !state.market;
      clr.querySelector("b").textContent = state.market || "";
      kpis(A);
      marketsChart(A);
      trendChart(A);
      segmentsChart(A);
      productsTable(A);
      insight(A);
    }

    /* ---- stat tiles: net sales leads; each has a delta vs last year ---- */
    function kpis(A) {
      const host = $("#bi-kpis");
      host.replaceChildren();
      const gm = A.cur.gp / A.cur.ns, gmLy = A.ly.gp / A.ly.ns;
      const fa = 1 - A.cur.err / A.cur.ns, faLy = 1 - A.ly.err / A.ly.ns;
      const tiles = [
        ["Net sales", V().money(A.cur.ns), ((A.cur.ns / A.ly.ns) - 1) * 100, "%", true, A.cur.month],
        ["Gross margin", V().pct(gm), (gm - gmLy) * 100, " pts", false],
        ["Forecast accuracy", V().pct(fa), (fa - faLy) * 100, " pts", false],
        ["Units sold", V().compact(A.cur.units), ((A.cur.units / A.ly.units) - 1) * 100, "%", false],
      ];
      for (const [label, value, delta, unit, hero, spark] of tiles) {
        const t = document.createElement("div");
        t.className = "kpi" + (hero ? " kpi-hero" : "");
        const l = document.createElement("p"); l.className = "kpi-label"; l.textContent = label;
        const v = document.createElement("p"); v.className = "kpi-value"; v.textContent = value;
        const dl = document.createElement("p"); dl.className = "kpi-delta";
        const up = delta >= 0;
        const ic = document.createElement("i"); ic.textContent = up ? "▲" : "▼"; ic.style.color = up ? C.good : C.bad; ic.setAttribute("aria-hidden", "true");
        const dt = document.createElement("span"); dt.textContent = `${V().signed(delta, 1, unit)} vs FY ${state.fy - 1}`;
        dl.append(ic, dt);
        t.append(l, v, dl);
        if (spark) {
          const box = document.createElement("div"); box.className = "kpi-spark"; t.appendChild(box);
          const max = Math.max(...spark), w = 120, h = 34;
          const s = V().svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true" }, box);
          const pts = spark.map((v, i) => [2 + (i * (w - 8)) / 11, h - 3 - (v / max) * (h - 8)]);
          V().svgEl("path", { d: "M" + pts.map((p) => p.join(" ")).join("L"), fill: "none", stroke: C.series, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
          const [ex, ey] = pts[pts.length - 1];
          V().svgEl("circle", { cx: ex, cy: ey, r: 4, fill: C.series, stroke: "#fff", "stroke-width": 2 }, s);
        }
        host.appendChild(t);
      }
    }

    /* ---- net sales by market: the bars are the filter ---- */
    function marketsChart(A) {
      const host = $("#bi-markets");
      let list = Object.entries(A.markets).sort((a, b) => b[1] - a[1]);
      if (list.length > 10) {
        const rest = list.slice(9).reduce((a, [, v]) => a + v, 0);
        list = [...list.slice(0, 9), ["Other markets", rest]];
      }
      const rowH = 30, top = 4;
      const { s, w } = V().canvas(host, list.length * rowH + top + 22);
      const labelW = Math.min(132, w * 0.34), right = 64;
      const max = Math.max(...list.map((d) => d[1]));
      const tk = V().ticks(max, w < 420 ? 2 : 4), xmax = tk[tk.length - 1];
      const x = (v) => labelW + (v / xmax) * (w - labelW - right);
      tk.forEach((t) => {
        V().svgEl("line", { x1: x(t), x2: x(t), y1: top, y2: list.length * rowH + top, stroke: C.grid, "stroke-width": 1 }, s);
        V().text(s, x(t), list.length * rowH + top + 16, t >= 1000 ? (t / 1000) + "B" : t, { class: "viz-tick", "text-anchor": "middle" });
      });
      list.forEach(([m, v], i) => {
        const y = top + i * rowH, bh = 18;
        const other = m === "Other markets";
        const sel = state.market === m, dim = state.market && !sel;
        const g = V().svgEl("g", { class: "viz-hit" + (other ? "" : " is-pick"), tabindex: other ? -1 : 0, role: other ? "img" : "button", "aria-pressed": other ? null : String(sel), "aria-label": `${m}: ${V().money(v)}` }, s);
        if (other) g.removeAttribute("aria-pressed");
        V().svgEl("rect", { x: 0, y, width: w, height: rowH, fill: "transparent" }, g);
        V().text(g, labelW - 10, y + rowH / 2 + 4, m, { class: "viz-cat" + (sel ? " is-sel" : ""), "text-anchor": "end" });
        V().svgEl("path", { d: V().hbar(x(0), x(v), y + (rowH - bh) / 2, bh), fill: dim || other ? C.muted : C.series, class: "viz-bar" }, g);
        V().text(g, x(v) + 6, y + rowH / 2 + 4, V().money(v), { class: "viz-val" });
        const lyv = A.marketsLy[m];
        const show = (e) => {
          const b = (e.currentTarget || g).getBoundingClientRect();
          const total = Object.values(A.markets).reduce((a, c) => a + c, 0);
          tip.show(e.clientX || b.left + b.width / 2, e.clientY || b.top, m, [
            [C.series, V().money(v), `net sales, FY ${state.fy}`],
            [null, V().pct(v / total), "of the selection"],
            ...(lyv ? [[null, V().signed((v / lyv - 1) * 100), `vs FY ${state.fy - 1}`]] : []),
          ]);
        };
        g.addEventListener("pointermove", show);
        g.addEventListener("pointerleave", () => tip.hide());
        g.addEventListener("focus", show);
        g.addEventListener("blur", () => tip.hide());
        if (!other) {
          const pick = () => { state.market = state.market === m ? null : m; tip.hide(); render(); const again = host.querySelector(`[aria-label^="${CSS.escape(m)}:"]`); if (again) again.focus({ preventScroll: true }); };
          g.addEventListener("click", pick);
          g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
        }
      });
      V().table(host.parentElement, "Net sales by market", ["Market", `FY ${state.fy}`, `FY ${state.fy - 1}`], list.map(([m, v]) => [m, V().money(v), A.marketsLy[m] ? V().money(A.marketsLy[m]) : "–"]));
    }

    /* ---- net sales by month, this year against last, with a crosshair ---- */
    function trendChart(A) {
      const host = $("#bi-trend");
      const { s, w, h } = V().canvas(host, 236);
      const L = 44, R = 64, T = 12, B = 26;
      const max = Math.max(...A.cur.month, ...A.ly.month);
      const tk = V().ticks(max, 4), ymax = tk[tk.length - 1];
      const x = (i) => L + (i * (w - L - R)) / 11, y = (v) => T + (1 - v / ymax) * (h - T - B);
      tk.forEach((t) => {
        V().svgEl("line", { x1: L, x2: w - R, y1: y(t), y2: y(t), stroke: C.grid, "stroke-width": 1 }, s);
        V().text(s, L - 8, y(t) + 4, t, { class: "viz-tick", "text-anchor": "end" });
      });
      MONTHS.forEach((mo, i) => { if (w > 460 || i % 2 === 0) V().text(s, x(i), h - 8, mo, { class: "viz-tick", "text-anchor": "middle" }); });
      const line = (arr) => "M" + arr.map((v, i) => `${x(i)} ${y(v)}`).join("L");
      V().svgEl("path", { d: line(A.cur.month) + `L${x(11)} ${y(0)}L${x(0)} ${y(0)}Z`, fill: C.series, opacity: 0.1 }, s);
      V().svgEl("path", { d: line(A.ly.month), fill: "none", stroke: C.last, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
      V().svgEl("path", { d: line(A.cur.month), fill: "none", stroke: C.series, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
      // end labels, only where the two lines end apart
      const ec = y(A.cur.month[11]), el = y(A.ly.month[11]);
      V().svgEl("circle", { cx: x(11), cy: ec, r: 4, fill: C.series, stroke: "#fff", "stroke-width": 2 }, s);
      V().text(s, x(11) + 8, ec + 4, V().money(A.cur.month[11]), { class: "viz-val" });
      if (Math.abs(ec - el) > 16) V().text(s, x(11) + 8, el + 4, V().money(A.ly.month[11]), { class: "viz-val viz-muted" });
      const cross = V().svgEl("line", { y1: T, y2: h - B, stroke: C.ink2, "stroke-width": 1, opacity: 0 }, s);
      const hit = V().svgEl("rect", { x: L, y: T, width: w - L - R, height: h - T - B, fill: "transparent", tabindex: 0, role: "img", "aria-label": "Monthly net sales; use the arrow keys to read each month" }, s);
      let focusI = 11;
      const at = (i, cx, cy) => {
        cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("opacity", 1);
        tip.show(cx, cy, `${MONTHS[i]}, FY ${state.fy}`, [[C.series, V().money(A.cur.month[i]), `FY ${state.fy}`], [C.last, V().money(A.ly.month[i]), `FY ${state.fy - 1}`]]);
      };
      hit.addEventListener("pointermove", (e) => {
        const b = s.getBoundingClientRect();
        const i = Math.max(0, Math.min(11, Math.round(((e.clientX - b.left - L) / (w - L - R)) * 11)));
        at(i, e.clientX, e.clientY);
      });
      const off = () => { cross.setAttribute("opacity", 0); tip.hide(); };
      hit.addEventListener("pointerleave", off);
      hit.addEventListener("blur", off);
      hit.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        focusI = Math.max(0, Math.min(11, focusI + d));
        const b = s.getBoundingClientRect();
        at(focusI, b.left + x(focusI), b.top + y(A.cur.month[focusI]));
      });
      hit.addEventListener("focus", () => { const b = s.getBoundingClientRect(); at(focusI, b.left + x(focusI), b.top + y(A.cur.month[focusI])); });
      V().table(host.parentElement, "Monthly net sales", ["Month", `FY ${state.fy}`, `FY ${state.fy - 1}`], MONTHS.map((mo, i) => [mo, V().money(A.cur.month[i]), V().money(A.ly.month[i])]));
    }

    /* ---- gross margin by segment ---- */
    function segmentsChart(A) {
      const host = $("#bi-segments");
      const list = SEGMENTS.map(([seg]) => [seg, A.segs[seg] ? A.segs[seg].gp / A.segs[seg].ns : 0, A.segsLy[seg] ? A.segsLy[seg].gp / A.segsLy[seg].ns : 0]).sort((a, b) => b[1] - a[1]);
      const rowH = 30;
      const { s, w } = V().canvas(host, list.length * rowH + 26);
      const labelW = Math.min(110, w * 0.3), right = 54;
      const tk = V().ticks(Math.max(...list.map((d) => d[1])) * 100, w < 420 ? 2 : 4), xmax = tk[tk.length - 1];
      const x = (v) => labelW + ((v * 100) / xmax) * (w - labelW - right);
      tk.forEach((t) => {
        V().svgEl("line", { x1: x(t / 100), x2: x(t / 100), y1: 4, y2: list.length * rowH + 4, stroke: C.grid, "stroke-width": 1 }, s);
        V().text(s, x(t / 100), list.length * rowH + 20, t + "%", { class: "viz-tick", "text-anchor": "middle" });
      });
      list.forEach(([seg, v, lyv], i) => {
        const y = 4 + i * rowH;
        const g = V().svgEl("g", { class: "viz-hit", tabindex: 0, role: "img", "aria-label": `${seg}: ${V().pct(v)} gross margin` }, s);
        V().svgEl("rect", { x: 0, y, width: w, height: rowH, fill: "transparent" }, g);
        V().text(g, labelW - 10, y + rowH / 2 + 4, seg, { class: "viz-cat", "text-anchor": "end" });
        V().svgEl("path", { d: V().hbar(x(0), x(v), y + 6, 18), fill: C.series, class: "viz-bar" }, g);
        V().text(g, x(v) + 6, y + rowH / 2 + 4, V().pct(v), { class: "viz-val" });
        const show = (e) => { const b = g.getBoundingClientRect(); tip.show(e.clientX || b.left + b.width / 2, e.clientY || b.top, seg, [[C.series, V().pct(v), `gross margin, FY ${state.fy}`], [null, V().signed((v - lyv) * 100, 1, " pts"), `vs FY ${state.fy - 1}`]]); };
        g.addEventListener("pointermove", show); g.addEventListener("focus", show);
        g.addEventListener("pointerleave", () => tip.hide()); g.addEventListener("blur", () => tip.hide());
      });
      V().table(host.parentElement, "Gross margin by segment", ["Segment", `FY ${state.fy}`, `FY ${state.fy - 1}`], list.map(([sg, v, lyv]) => [sg, V().pct(v), V().pct(lyv)]));
    }

    /* ---- top products ---- */
    function productsTable(A) {
      const host = $("#bi-products");
      const list = Object.entries(A.prods).sort((a, b) => b[1].ns - a[1].ns).slice(0, 6);
      const max = list[0] ? list[0][1].ns : 1;
      const t = document.createElement("table");
      t.className = "viz-grid";
      const cap = document.createElement("caption"); cap.className = "sr-only"; cap.textContent = "Top products by net sales"; t.appendChild(cap);
      const hr = t.createTHead().insertRow();
      ["Product", "Net sales", "Margin"].forEach((h) => { const th = document.createElement("th"); th.textContent = h; hr.appendChild(th); });
      const tb = t.createTBody();
      list.forEach(([p, d]) => {
        const tr = tb.insertRow();
        const c1 = tr.insertCell();
        const nm = document.createElement("b"); nm.textContent = p;
        const sg = document.createElement("span"); sg.textContent = d.seg;
        c1.append(nm, sg);
        const c2 = tr.insertCell();
        const bar = document.createElement("i"); bar.className = "mini-bar"; bar.style.width = Math.max(4, (d.ns / max) * 100) + "%";
        const val = document.createElement("span"); val.textContent = V().money(d.ns);
        c2.append(val, bar);
        tr.insertCell().textContent = V().pct(d.gp / d.ns);
      });
      host.replaceChildren(t);
    }

    /* ---- the one-line read-out a manager would ask for ---- */
    function insight(A) {
      const list = Object.entries(A.markets).sort((a, b) => b[1] - a[1]);
      const total = list.reduce((a, [, v]) => a + v, 0);
      const growth = (A.cur.ns / A.ly.ns - 1) * 100;
      const segs = Object.entries(A.segs).map(([k, d]) => [k, d.gp / d.ns]).sort((a, b) => b[1] - a[1]);
      const slow = A.cur.month.indexOf(Math.min(...A.cur.month));
      const scope = state.market || REGIONS[state.region].replace("All regions", "all markets");
      const first = state.market ? `${state.market} made ${V().money(A.cur.ns)} in FY ${state.fy}` : `${list[0][0]} brings in ${V().pct(list[0][1] / total, 0)} of net sales across ${scope}`;
      $("#bi-insight").textContent = `${first}, ${growth >= 0 ? "up" : "down"} ${Math.abs(growth).toFixed(0)}% on last year. ${segs[0][0]} earns the best margin (${V().pct(segs[0][1])}); ${MONTHS[slow]} was the quietest month.`;
    }

    render();
    let rz = 0, lastW = root.clientWidth;
    // redraw at the new width; height changes from our own render are ignored
    const ro = new ResizeObserver(() => { if (root.clientWidth === lastW) return; lastW = root.clientWidth; clearTimeout(rz); rz = setTimeout(render, 120); });
    ro.observe(root);
    document.addEventListener("lab:shown", (e) => { if (e.detail === "bi") render(); });
  }

  window.BI = { init };
})();
