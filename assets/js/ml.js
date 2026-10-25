/* =========================================================================
   Credit-risk model: where to draw the line. 2,000 sample applicants are
   generated and scored in the browser by a model shaped like my credit-risk
   project. Move the threshold, read the trade-off, explain one decision.
   ========================================================================= */
(() => {
  "use strict";
  const V = () => window.Viz;
  const C = { repaid: "#2a78d6", defaulted: "#eb6834", up: "#e34948", down: "#2a78d6", good: "#0ca30c", bad: "#d03b3b", grid: "#e7e4dc", ink2: "#5b564d", ref: "#c9c6bd" };
  const COST_MISS = 5; // a missed default costs five times a turned-away good customer

  // the model: a logistic score over six features, centred on a typical applicant
  const FEATURES = [
    { k: "util", name: "Card utilisation", w: 3.2, c: 0.32, fmt: (v) => Math.round(v * 100) + "%" },
    { k: "dti", name: "Debt-to-income", w: 2.6, c: 0.3, fmt: (v) => Math.round(v * 100) + "%" },
    { k: "delinq", name: "Late payments, 2 yrs", w: 0.75, c: 0, fmt: (v) => String(v) },
    { k: "age", name: "Credit history", w: -0.09, c: 8, fmt: (v) => v.toFixed(0) + " yrs" },
    { k: "lti", name: "Loan-to-income", w: 0.9, c: 0.9, fmt: (v) => v.toFixed(1) + "×" },
    { k: "inq", name: "Credit checks, 6 mo", w: 0.28, c: 1, fmt: (v) => String(v) },
  ];
  const B0 = -1.55, SLOPE = 1.6;
  const sig = (z) => 1 / (1 + Math.exp(-z));

  let D = null;
  function build() {
    const r = V().rng(147);
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const rows = [];
    for (let i = 0; i < 2000; i++) {
      const x = {
        util: clamp(0.32 + 0.22 * r.gauss(), 0, 1), dti: clamp(0.3 + 0.12 * r.gauss(), 0.02, 0.8),
        delinq: Math.min(6, Math.floor(-Math.log(r()) * 0.55)), age: clamp(8 + 5 * r.gauss(), 0.5, 30),
        lti: clamp(0.9 + 0.45 * r.gauss(), 0.1, 3), inq: Math.min(8, Math.floor(-Math.log(r()) * 1.2)),
      };
      const z = B0 + FEATURES.reduce((a, f) => a + f.w * (x[f.k] - f.c), 0);
      const y = r() < sig(5 * (z + 0.2 * r.gauss())) ? 1 : 0;
      rows.push({ x, z, s: sig(SLOPE * z), y });
    }
    const means = {};
    FEATURES.forEach((f) => { means[f.k] = rows.reduce((a, d) => a + d.x[f.k], 0) / rows.length; });
    const baseZ = SLOPE * (B0 + FEATURES.reduce((a, f) => a + f.w * (means[f.k] - f.c), 0));
    // AUC: the chance a random defaulter scores above a random repayer
    const pos = rows.filter((d) => d.y).map((d) => d.s), neg = rows.filter((d) => !d.y).map((d) => d.s).sort((a, b) => a - b);
    let wins = 0;
    for (const p of pos) { let lo = 0, hi = neg.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (neg[mid] < p) lo = mid + 1; else hi = mid; } wins += lo; }
    const auc = wins / (pos.length * neg.length);
    const roc = [];
    for (let t = 1; t >= -0.0001; t -= 0.01) { const m = metrics(rows, t); roc.push([m.fp / (m.fp + m.tn), m.tp / (m.tp + m.fn)]); }
    // the pool of applicants to explain: a mix of clear, borderline and risky
    const sorted = rows.map((d, i) => [d.s, i]).sort((a, b) => a[0] - b[0]);
    const pick = [0.35, 0.93, 0.6, 0.985, 0.8, 0.15, 0.9, 0.995, 0.7, 0.5].map((q) => sorted[Math.floor(q * (sorted.length - 1))][1]);
    D = { rows, means, baseZ, auc, roc, pick, pos: pos.length };
  }
  function metrics(rows, t) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const d of rows) {
      const flag = d.s >= t;
      if (flag && d.y) tp++; else if (flag) fp++; else if (d.y) fn++; else tn++;
    }
    const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
    return { tp, fp, tn, fn, precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0, approve: (tn + fn) / rows.length, cost: fn * COST_MISS + fp };
  }

  function init() {
    const root = document.getElementById("ml");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";
    build();
    const tip = V().tooltip(root);
    const $ = (s) => root.querySelector(s);
    const slider = $("#ml-t"), out = $("#ml-t-out");
    let t = 0.5, who = 0;

    // the two presets: best balance, and cheapest once a miss costs 5×
    const scan = (fn) => { let best = 0.5, bv = -Infinity; for (let x = 0.02; x <= 0.98; x += 0.01) { const v = fn(metrics(D.rows, x)); if (v > bv) { bv = v; best = x; } } return +best.toFixed(2); };
    const presets = { f1: scan((m) => m.f1), cost: scan((m) => -m.cost) };
    root.querySelectorAll("[data-best]").forEach((b) => b.addEventListener("click", () => set(presets[b.dataset.best])));
    slider.addEventListener("input", () => set(+slider.value));
    $("#ml-next").addEventListener("click", () => { who = (who + 1) % D.pick.length; explain(); });

    function set(v) {
      t = Math.max(0.02, Math.min(0.98, +v.toFixed(2)));
      slider.value = t;
      out.textContent = t.toFixed(2);
      root.querySelectorAll("[data-best]").forEach((b) => b.setAttribute("aria-pressed", String(presets[b.dataset.best] === t)));
      render();
    }
    function render() {
      if (!root.offsetWidth) return;
      const m = metrics(D.rows, t);
      kpis(m); hist(); rocChart(m); matrix(m); explain();
    }

    function kpis(m) {
      const best = metrics(D.rows, presets.cost).cost;
      const tiles = [
        ["Defaults caught", V().pct(m.recall, 0), `${m.tp} of ${D.pos} applicants who later defaulted`],
        ["Approval rate", V().pct(m.approve, 0), `${m.tn + m.fn} of ${D.rows.length} applicants approved`],
        ["Right when it says no", V().pct(m.precision, 0), "of rejected applicants would really have defaulted"],
        ["Cost of mistakes", String(m.cost), m.cost === best ? "the lowest possible, given a miss costs 5×" : `${Math.round((m.cost / best - 1) * 100)}% above the cheapest threshold`],
      ];
      const host = $("#ml-kpis");
      host.replaceChildren();
      tiles.forEach(([label, value, note], i) => {
        const d = document.createElement("div"); d.className = "kpi" + (i === 0 ? " kpi-hero" : "");
        const l = document.createElement("p"); l.className = "kpi-label"; l.textContent = label;
        const v = document.createElement("p"); v.className = "kpi-value"; v.textContent = value;
        const n = document.createElement("p"); n.className = "kpi-note"; n.textContent = note;
        d.append(l, v, n); host.appendChild(d);
      });
    }

    /* ---- the two groups' scores, mirrored, with a threshold you can drag ---- */
    function hist() {
      const host = $("#ml-hist");
      const bins = 25, rep = Array(bins).fill(0), def = Array(bins).fill(0);
      let nRep = 0, nDef = 0;
      for (const d of D.rows) { const b = Math.min(bins - 1, Math.floor(d.s * bins)); if (d.y) { def[b]++; nDef++; } else { rep[b]++; nRep++; } }
      const rs = rep.map((c) => c / nRep), ds = def.map((c) => c / nDef);
      const { s, w, h } = V().canvas(host, 250);
      const L = 40, R = 12, T = 22, B = 30, mid = T + (h - T - B) / 2;
      const max = Math.max(...rs, ...ds);
      const tk = V().ticks(max * 100, 2), ymax = tk[tk.length - 1] / 100;
      const x = (v) => L + v * (w - L - R), half = (h - T - B) / 2;
      const yUp = (v) => mid - (v / ymax) * half, yDn = (v) => mid + (v / ymax) * half;
      V().svgEl("rect", { x: x(t), y: T, width: x(1) - x(t), height: h - T - B, fill: "#f3efe4" }, s);
      tk.forEach((tv) => {
        const v = tv / 100;
        [yUp(v), yDn(v)].forEach((yy) => V().svgEl("line", { x1: L, x2: w - R, y1: yy, y2: yy, stroke: C.grid, "stroke-width": 1 }, s));
        if (tv) { V().text(s, L - 6, yUp(v) + 4, tv + "%", { class: "viz-tick", "text-anchor": "end" }); V().text(s, L - 6, yDn(v) + 4, tv + "%", { class: "viz-tick", "text-anchor": "end" }); }
      });
      const bw = (w - L - R) / bins, barW = Math.max(2, Math.min(24, bw - 2));
      for (let i = 0; i < bins; i++) {
        const bx = x(i / bins) + (bw - barW) / 2;
        if (rs[i]) V().svgEl("path", { d: V().vbar(bx, barW, mid - 1, yUp(rs[i]) - 1, 3), fill: C.repaid }, s);
        if (ds[i]) V().svgEl("path", { d: V().vbar(bx, barW, mid + 1, yDn(ds[i]) + 1, 3), fill: C.defaulted }, s);
      }
      V().svgEl("line", { x1: L, x2: w - R, y1: mid, y2: mid, stroke: C.ink2, "stroke-width": 1 }, s);
      [0, 0.25, 0.5, 0.75, 1].forEach((v) => V().text(s, x(v), h - 10, v.toFixed(2), { class: "viz-tick", "text-anchor": "middle" }));
      V().text(s, x(t) + 8, T + 12, "rejected →", { class: "viz-note" });
      V().text(s, x(t) - 8, T + 12, "← approved", { class: "viz-note", "text-anchor": "end" });
      // the threshold line and its handle
      const g = V().svgEl("g", { class: "ml-handle" }, s);
      V().svgEl("line", { x1: x(t), x2: x(t), y1: T - 6, y2: h - B + 4, stroke: "#1B1814", "stroke-width": 2 }, g);
      V().svgEl("rect", { x: x(t) - 7, y: mid - 14, width: 14, height: 28, rx: 4, fill: "#1B1814" }, g);
      const hit = V().svgEl("rect", { x: L, y: T - 8, width: w - L - R, height: h - T - B + 12, fill: "transparent", class: "ml-drag" }, s);
      let drag = false;
      const move = (e) => { const b = s.getBoundingClientRect(); set((e.clientX - b.left - L) / (w - L - R)); };
      hit.addEventListener("pointerdown", (e) => { drag = true; hit.setPointerCapture(e.pointerId); move(e); });
      hit.addEventListener("pointermove", (e) => {
        if (drag) return move(e);
        const b = s.getBoundingClientRect();
        const i = Math.max(0, Math.min(bins - 1, Math.floor(((e.clientX - b.left - L) / (w - L - R)) * bins)));
        tip.show(e.clientX, e.clientY, `Risk score ${(i / bins).toFixed(2)}–${((i + 1) / bins).toFixed(2)}`, [[C.repaid, V().pct(rs[i]), "of people who repaid"], [C.defaulted, V().pct(ds[i]), "of people who defaulted"]]);
      });
      hit.addEventListener("pointerup", () => { drag = false; });
      hit.addEventListener("pointerleave", () => tip.hide());
      V().table(host.parentElement, "Risk score distribution", ["Score band", "Repaid", "Defaulted"], rs.map((v, i) => [`${(i / bins).toFixed(2)}–${((i + 1) / bins).toFixed(2)}`, V().pct(v), V().pct(ds[i])]));
    }

    /* ---- ROC: every threshold at once, and where yours sits ---- */
    function rocChart(m) {
      const host = $("#ml-roc");
      const size = Math.min(host.clientWidth, 360);
      const { s, w, h } = V().canvas(host, size, size);
      const L = 40, B = 30, T = 8, R = 10, pw = Math.min(w - L - R, h - T - B);
      const x = (v) => L + v * pw, y = (v) => T + (1 - v) * pw;
      [0, 0.5, 1].forEach((v) => {
        V().svgEl("line", { x1: x(0), x2: x(1), y1: y(v), y2: y(v), stroke: C.grid, "stroke-width": 1 }, s);
        V().svgEl("line", { x1: x(v), x2: x(v), y1: y(0), y2: y(1), stroke: C.grid, "stroke-width": 1 }, s);
        V().text(s, L - 6, y(v) + 4, v * 100 + "%", { class: "viz-tick", "text-anchor": "end" });
        V().text(s, x(v), y(0) + 16, v * 100 + "%", { class: "viz-tick", "text-anchor": "middle" });
      });
      V().svgEl("line", { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: C.ref, "stroke-width": 1 }, s);
      V().text(s, x(0.62), y(0.5), "coin flip", { class: "viz-note", transform: `rotate(-45 ${x(0.62)} ${y(0.5)})` });
      V().svgEl("path", { d: "M" + D.roc.map(([fx, ty]) => `${x(fx)} ${y(ty)}`).join("L"), fill: "none", stroke: C.repaid, "stroke-width": 2, "stroke-linejoin": "round" }, s);
      const fpr = m.fp / (m.fp + m.tn);
      V().svgEl("circle", { cx: x(fpr), cy: y(m.recall), r: 6, fill: "#1B1814", stroke: "#fff", "stroke-width": 2 }, s);
      V().text(s, x(fpr) + 10, y(m.recall) + 16, "your threshold", { class: "viz-note" });
      V().text(s, x(1), y(0) + 28, "good customers turned away →", { class: "viz-tick", "text-anchor": "end" });
      $("#ml-auc").textContent = `AUC ${D.auc.toFixed(3)} · caught (up) against wrongly rejected (across)`;
    }

    /* ---- the four outcomes at this threshold ---- */
    function matrix(m) {
      const cells = [
        ["Defaulted", "rejected", m.tp, true, "defaults caught"], ["Defaulted", "approved", m.fn, false, "defaults missed: the costly kind"],
        ["Repaid", "rejected", m.fp, false, "good customers turned away"], ["Repaid", "approved", m.tn, true, "approved and repaid"],
      ];
      const host = $("#ml-cm");
      host.replaceChildren();
      const head = document.createElement("div"); head.className = "cm-head";
      ["", "Model rejected", "Model approved"].forEach((h) => { const p = document.createElement("span"); p.textContent = h; head.appendChild(p); });
      host.appendChild(head);
      for (let r = 0; r < 2; r++) {
        const row = document.createElement("div"); row.className = "cm-row";
        const lab = document.createElement("span"); lab.className = "cm-lab"; lab.textContent = r ? "Really repaid" : "Really defaulted";
        row.appendChild(lab);
        cells.slice(r * 2, r * 2 + 2).forEach(([, , n, ok, text]) => {
          const c = document.createElement("p"); c.className = "cm-cell " + (ok ? "is-ok" : "is-err");
          const ic = document.createElement("i"); ic.textContent = ok ? "✓" : "✗"; ic.setAttribute("aria-hidden", "true");
          const b = document.createElement("b"); b.textContent = n;
          const sp = document.createElement("span"); sp.textContent = text;
          c.append(ic, b, sp); row.appendChild(c);
        });
        host.appendChild(row);
      }
    }

    /* ---- one applicant, explained: how much each feature pushes the risk ---- */
    function explain() {
      const d = D.rows[D.pick[who]];
      const contrib = FEATURES.map((f) => ({ f, v: d.x[f.k], c: SLOPE * f.w * (d.x[f.k] - D.means[f.k]) })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c));
      const rejected = d.s >= t;
      const card = $("#ml-app");
      card.replaceChildren();
      const top = document.createElement("p"); top.className = "app-top";
      const id = document.createElement("b"); id.textContent = `Applicant #${1000 + D.pick[who]}`;
      const verdict = document.createElement("span"); verdict.className = "app-verdict " + (rejected ? "is-no" : "is-yes");
      verdict.textContent = (rejected ? "✗ rejected" : "✓ approved") + ` at ${t.toFixed(2)}`;
      top.append(id, verdict);
      const line = document.createElement("p"); line.className = "app-line";
      line.textContent = `Risk ${V().pct(d.s)} against ${V().pct(sig(D.baseZ))} for an average applicant. ${d.y ? "In the sample data, this person defaulted." : "In the sample data, this person repaid."}`;
      card.append(top, line);

      const host = $("#ml-shap");
      const rowH = 30;
      const { s, w } = V().canvas(host, contrib.length * rowH + 30);
      const labelW = Math.min(190, w * 0.42), pad = 46;
      const max = Math.max(0.5, ...contrib.map((c) => Math.abs(c.c)));
      const zero = labelW + (w - labelW) / 2, span = (w - labelW) / 2 - pad;
      const x = (v) => zero + (v / max) * span;
      V().svgEl("line", { x1: zero, x2: zero, y1: 2, y2: contrib.length * rowH + 4, stroke: C.ink2, "stroke-width": 1 }, s);
      V().text(s, zero - 8, contrib.length * rowH + 22, "← lowers risk", { class: "viz-note", "text-anchor": "end" });
      V().text(s, zero + 8, contrib.length * rowH + 22, "raises risk →", { class: "viz-note" });
      contrib.forEach(({ f, v, c }, i) => {
        const y = 4 + i * rowH;
        const g = V().svgEl("g", { class: "viz-hit", tabindex: 0, role: "img", "aria-label": `${f.name} ${f.fmt(v)}: ${c >= 0 ? "raises" : "lowers"} risk by ${Math.abs(c).toFixed(2)}` }, s);
        V().svgEl("rect", { x: 0, y, width: w, height: rowH, fill: "transparent" }, g);
        V().text(g, labelW - 10, y + rowH / 2 + 4, `${f.name}  ${f.fmt(v)}`, { class: "viz-cat", "text-anchor": "end" });
        V().svgEl("path", { d: V().hbar(zero, x(c), y + 6, 18), fill: c >= 0 ? C.up : C.down }, g);
        V().text(g, c >= 0 ? x(c) + 6 : x(c) - 6, y + rowH / 2 + 4, (c >= 0 ? "+" : "−") + Math.abs(c).toFixed(2), { class: "viz-val", "text-anchor": c >= 0 ? "start" : "end" });
        const show = (e) => { const b = g.getBoundingClientRect(); tip.show(e.clientX || b.left + b.width / 2, e.clientY || b.top, f.name, [[c >= 0 ? C.up : C.down, (c >= 0 ? "+" : "−") + Math.abs(c).toFixed(2), c >= 0 ? "pushes risk up (log-odds)" : "pushes risk down (log-odds)"], [null, f.fmt(v), `this applicant · average ${f.fmt(D.means[f.k])}`]]); };
        g.addEventListener("pointermove", show); g.addEventListener("focus", show);
        g.addEventListener("pointerleave", () => tip.hide()); g.addEventListener("blur", () => tip.hide());
      });
      V().table(host.parentElement, "Feature contributions for this applicant", ["Feature", "Value", "Push on risk (log-odds)"], contrib.map(({ f, v, c }) => [f.name, f.fmt(v), (c >= 0 ? "+" : "−") + Math.abs(c).toFixed(2)]));
    }

    set(presets.f1);
    let rz = 0, lastW = root.clientWidth;
    const ro = new ResizeObserver(() => { if (root.clientWidth === lastW) return; lastW = root.clientWidth; clearTimeout(rz); rz = setTimeout(render, 120); });
    ro.observe(root);
    document.addEventListener("lab:shown", (e) => { if (e.detail === "ml") render(); });
  }

  window.ML = { init };
})();
