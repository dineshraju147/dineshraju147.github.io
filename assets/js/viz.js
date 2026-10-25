/* =========================================================================
   Small chart helpers shared by the two dashboards: SVG elements, clean
   ticks, rounded bar ends, number formats, one tooltip, a data table.
   ========================================================================= */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";

  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const text = (parent, x, y, str, attrs = {}) => {
    const t = svgEl("text", { x, y, ...attrs }, parent);
    t.textContent = str;
    return t;
  };
  // an svg sized to its box in real pixels, so text never stretches
  const canvas = (host, h, fixedW) => {
    host.replaceChildren();
    const w = fixedW || Math.max(240, Math.floor(host.clientWidth));
    const s = svgEl("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, class: "viz-svg" }, host);
    return { s, w, h };
  };

  // round, readable ticks: 0, 50, 100 rather than 0, 47.3, 94.6
  function ticks(max, count = 4) {
    if (max <= 0) return [0, 1];
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = [];
    for (let v = 0; v <= max + step * 0.001; v += step) out.push(+v.toFixed(10));
    if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toFixed(10));
    return out;
  }

  // bars: 4px rounded at the data end, square at the baseline
  const hbar = (x0, x1, y, h, r = 4) => {
    const rr = Math.min(r, Math.abs(x1 - x0), h / 2);
    if (x1 >= x0) return `M${x0} ${y}H${x1 - rr}Q${x1} ${y} ${x1} ${y + rr}V${y + h - rr}Q${x1} ${y + h} ${x1 - rr} ${y + h}H${x0}Z`;
    return `M${x0} ${y}H${x1 + rr}Q${x1} ${y} ${x1} ${y + rr}V${y + h - rr}Q${x1} ${y + h} ${x1 + rr} ${y + h}H${x0}Z`;
  };
  const vbar = (x, w, y0, y1, r = 4) => {
    const rr = Math.min(r, Math.abs(y0 - y1), w / 2);
    if (y1 <= y0) return `M${x} ${y0}V${y1 + rr}Q${x} ${y1} ${x + rr} ${y1}H${x + w - rr}Q${x + w} ${y1} ${x + w} ${y1 + rr}V${y0}Z`;
    return `M${x} ${y0}V${y1 - rr}Q${x} ${y1} ${x + rr} ${y1}H${x + w - rr}Q${x + w} ${y1} ${x + w} ${y1 - rr}V${y0}Z`;
  };

  const money = (m) => (m >= 1000 ? "$" + (m / 1000).toFixed(2) + "B" : m >= 100 ? "$" + Math.round(m) + "M" : "$" + m.toFixed(1) + "M");
  const compact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));
  const pct = (x, d = 1) => (x * 100).toFixed(d) + "%";
  const signed = (x, d = 1, unit = "%") => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d) + unit;

  // one tooltip per dashboard: rows of [key colour or null, value, label]
  function tooltip(root) {
    const tip = document.createElement("div");
    tip.className = "viz-tip";
    tip.setAttribute("role", "status");
    tip.hidden = true;
    root.appendChild(tip);
    return {
      show(x, y, title, rows) {
        tip.replaceChildren();
        const h = document.createElement("p");
        h.className = "viz-tip-title";
        h.textContent = title;
        tip.appendChild(h);
        for (const [key, value, label] of rows) {
          const r = document.createElement("p");
          r.className = "viz-tip-row";
          if (key) { const k = document.createElement("i"); k.style.background = key; r.appendChild(k); }
          const b = document.createElement("b"); b.textContent = value; r.appendChild(b);
          if (label) { const s = document.createElement("span"); s.textContent = label; r.appendChild(s); }
          tip.appendChild(r);
        }
        tip.hidden = false;
        const R = root.getBoundingClientRect();
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let left = x - R.left + 14, top = y - R.top - th - 10;
        if (left + tw > R.width - 6) left = x - R.left - tw - 14;
        if (top < 4) top = y - R.top + 16;
        tip.style.left = Math.max(4, left) + "px";
        tip.style.top = top + "px";
      },
      hide() { tip.hidden = true; },
    };
  }

  // every chart keeps its numbers one click away
  function table(host, caption, head, rows) {
    let d = host.querySelector(":scope > details.viz-table");
    const open = d ? d.open : false;
    if (d) d.remove();
    d = document.createElement("details");
    d.className = "viz-table";
    d.open = open;
    const s = document.createElement("summary");
    s.textContent = "Show the numbers";
    const t = document.createElement("table");
    const c = document.createElement("caption"); c.className = "sr-only"; c.textContent = caption; t.appendChild(c);
    const thead = t.createTHead().insertRow();
    head.forEach((h) => { const th = document.createElement("th"); th.textContent = h; thead.appendChild(th); });
    const tb = t.createTBody();
    rows.forEach((r) => { const tr = tb.insertRow(); r.forEach((v) => { tr.insertCell().textContent = v; }); });
    d.append(s, t);
    host.appendChild(d);
  }

  // a tiny seeded random generator, so the sample data is the same for everyone
  function rng(seed) {
    let a = seed >>> 0;
    const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return r;
  }

  window.Viz = { svgEl, text, canvas, ticks, hbar, vbar, money, compact, pct, signed, tooltip, table, rng };
})();
