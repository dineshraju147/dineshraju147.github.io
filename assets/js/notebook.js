/* =========================================================================
   The notebook: arrival, reveals, hand-drawn marks (rough.js), the story
   route, the bar, the clock and the copy button.
   ========================================================================= */
(() => {
  "use strict";
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const INK = "#1B1814";

  // hidden states only exist from here on, so a failed script never hides content
  html.classList.add("motion");

  /* ---- arrival: the name first, then the stickers slap on, then the line ---- */
  const arrival = [".hero-hi", ".s1", ".s2", ".n1", ".n2", ".status", ".lede", ".hero-cta"];
  arrival.forEach((s, i) => { const el = $(s); if (el) el.style.setProperty("--d", 260 + i * 110 + "ms"); });
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add("is-loaded")));

  /* ---- hand-drawn marks ---- */
  const marks = new Map(); // host -> { svg, w, h, seed }
  let seedCounter = 7;
  function mark(host, animate) {
    if (!window.rough) return;
    const kind = host.dataset.rough;
    const rect = host.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    const prev = marks.get(host);
    if (prev && Math.abs(prev.w - w) < 3 && Math.abs(prev.h - h) < 3) return;
    if (prev) prev.svg.remove();
    const seed = prev ? prev.seed : seedCounter++;
    const color = host.dataset.roughColor || INK;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "rough");
    svg.setAttribute("aria-hidden", "true");
    const rc = rough.svg(svg);
    const base = { stroke: color, seed, roughness: 1.4, bowing: 1.6 };
    let g = [];
    if (kind === "box") {
      const p = parseInt(host.dataset.roughPad || "10", 10);
      place(svg, -p, -p, w + p * 2, h + p * 2);
      g.push(rc.rectangle(4, 4, w + p * 2 - 8, h + p * 2 - 8, { ...base, strokeWidth: 3, roughness: 1.7 }));
    } else if (kind === "underline2") {
      place(svg, -6, h - 2, w + 12, 20);
      g.push(rc.curve([[4, 6], [w * 0.5, 9], [w + 6, 5]], { ...base, strokeWidth: 2, roughness: 1 }));
      g.push(rc.curve([[w * 0.12, 15], [w * 0.55, 17], [w * 0.92, 13]], { ...base, strokeWidth: 2, roughness: 1, seed: seed + 1 }));
    } else if (kind === "wave") {
      place(svg, 0, 0, w, h);
      const pts = [];
      for (let x = -20, i = 0; x <= w + 40; x += 140, i++) pts.push([x, h / 2 + Math.sin(i * 1.3) * (h / 3)]);
      g.push(rc.curve(pts, { ...base, stroke: "rgba(27,24,20,.55)", strokeWidth: 1.6, roughness: 0.6 }));
    } else if (kind === "card") {
      place(svg, -2, -2, w + 4, h + 4);
      g.push(rc.rectangle(3, 3, w - 2, h - 2, { ...base, strokeWidth: 2.6, roughness: 1.2 }));
    }
    g.forEach((n) => svg.appendChild(n));
    svg.querySelectorAll("path").forEach((p) => p.setAttribute("pathLength", "1"));
    host.prepend(svg);
    if (animate && !reduced()) {
      svg.classList.add("is-draw");
      svg.getBoundingClientRect();
    }
    marks.set(host, { svg, w, h, seed });
    return svg;
  }
  function place(svg, x, y, w, h) {
    Object.assign(svg.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  const roughHosts = $$("[data-rough]");
  const drawIO = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const m = marks.get(e.target);
      if (m) requestAnimationFrame(() => m.svg.classList.add("is-drawn"));
      drawIO.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -15% 0px" }) : null;

  function drawAll(first) {
    roughHosts.forEach((host) => {
      const animate = first && !!drawIO;
      const svg = mark(host, animate);
      if (!svg) return;
      if (!first || !drawIO) { svg.classList.add("is-drawn"); return; }
      if (host.closest(".hero")) {
        svg.style.setProperty("--d", host.classList.contains("name") ? "350ms" : "200ms");
        setTimeout(() => svg.classList.add("is-drawn"), 30);
      } else drawIO.observe(host);
    });
  }

  /* ---- reveals: each part arrives once, in reading order ---- */
  $$("[data-reveal-list]").forEach((list) => [...list.children].forEach((c, i) => c.style.setProperty("--i", i)));
  $$(".sec-head").forEach((h) => $$("[data-reveal]", h).forEach((el, i) => el.style.setProperty("--d", i * 90 + "ms")));
  $$(".about-text [data-reveal]").forEach((el, i) => el.style.setProperty("--d", 80 + i * 110 + "ms"));
  const revealTargets = $$("[data-reveal], [data-reveal-list], [data-drop], [data-card], .plane, .folder-pic");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target); arm.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });
    // only hide what is just below the viewport: a jump by link or a fast scroll finds it already there
    const arm = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target.classList.contains("is-in")) continue;
        e.target.classList.toggle("armed", e.isIntersecting && e.boundingClientRect.top > 0);
      }
    }, { rootMargin: "0px 0px 35% 0px", threshold: 0 });
    revealTargets.forEach((el) => { arm.observe(el); io.observe(el); });
  }

  /* ---- the story route: a hand-drawn line that follows you down the cards ---- */
  const route = $("#route");
  let routeSvg = null, routeKey = "";
  function drawRoute() {
    if (!route || !window.rough) return;
    const cards = $$(".card", route);
    const R = route.getBoundingClientRect();
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const key = `${Math.round(R.width)}x${Math.round(R.height)}`;
    if (key === routeKey) return;
    routeKey = key;
    if (routeSvg) routeSvg.remove();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "route-line");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", `0 0 ${R.width} ${R.height}`);
    const rc = rough.svg(svg);
    const pts = [];
    if (narrow) {
      cards.forEach((c, i) => { const r = c.getBoundingClientRect(); pts.push([8 + (i % 2 ? 4 : -2), r.top - R.top + r.height / 2]); });
    } else {
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const left = r.left - R.left < R.width / 2 - 100;
        pts.push([left ? r.right - R.left + 46 : r.left - R.left - 46, r.top - R.top + r.height * (i % 2 ? 0.62 : 0.4)]);
      });
    }
    // lead in from just above the first card and out just below the last
    const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
    pts.unshift([fx + (narrow ? 0 : 30), Math.max(0, fy - 120)]);
    pts.push([lx + (narrow ? 0 : 30), ly + 120]);
    const line = rc.curve(pts, { stroke: "#FF7A1A", strokeWidth: 2.6, roughness: 1.2, bowing: 2, seed: 41 });
    line.classList.add("route-path");
    svg.appendChild(line);
    pts.slice(1, -1).forEach(([x, y], i) => {
      const dot = rc.circle(x, y, narrow ? 14 : 18, { stroke: INK, strokeWidth: 2, fill: "#FF9900", fillStyle: "solid", roughness: 1, seed: 60 + i });
      svg.appendChild(dot);
    });
    svg.querySelectorAll(".route-path path").forEach((p) => { p.setAttribute("pathLength", "1"); p.style.strokeDasharray = "1"; });
    route.prepend(svg);
    routeSvg = svg;
    scrubRoute();
  }
  function scrubRoute() {
    if (!routeSvg) return;
    const r = route.getBoundingClientRect();
    const p = reduced() ? 1 : Math.min(1, Math.max(0, (innerHeight * 0.72 - r.top) / r.height));
    routeSvg.querySelectorAll(".route-path path").forEach((path) => { path.style.strokeDashoffset = String(1 - p); });
  }

  /* ---- the work folders stack as you scroll, where a whole folder fits on screen ---- */
  const folders = $(".folders");
  function checkStack() {
    if (!folders) return;
    const avail = innerHeight - $("#bar").offsetHeight - 24;
    const wide = window.matchMedia("(min-width: 901px)").matches;
    folders.classList.remove("is-stack");
    const fits = wide && $$(".folder", folders).every((f) => f.offsetHeight <= avail);
    folders.classList.toggle("is-stack", fits);
  }
  checkStack();

  /* ---- the bar: which section you are in, and the menu on small screens ---- */
  const bar = $("#bar");
  const navLinks = $$(".bar-nav a");
  const spyLinks = navLinks.filter((a) => a.getAttribute("href").startsWith("#"));
  const spySections = spyLinks.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  function spy() {
    const line = innerHeight * 0.35;
    let current = null;
    for (const s of spySections) if (s.getBoundingClientRect().top <= line) current = s;
    spyLinks.forEach((a) => a.setAttribute("aria-current", String(!!current && a.getAttribute("href") === "#" + current.id)));
  }
  const menu = $(".bar-menu");
  const setMenu = (open) => { bar.classList.toggle("is-open", open); menu.setAttribute("aria-expanded", String(open)); };
  menu.addEventListener("click", () => setMenu(!bar.classList.contains("is-open")));
  navLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && bar.classList.contains("is-open")) { setMenu(false); menu.focus(); } });

  let ticking = false;
  const onScroll = () => { ticking = false; spy(); scrubRoute(); };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---- hero doodles lean toward the pointer ---- */
  const doodles = $(".hero-doodles");
  if (doodles && finePointer) {
    let raf = 0, mx = 0, my = 0;
    $(".hero").addEventListener("pointermove", (e) => {
      mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (reduced()) return; doodles.style.setProperty("--mx", mx.toFixed(3)); doodles.style.setProperty("--my", my.toFixed(3)); });
    });
  }

  /* ---- local time in Grand Rapids ---- */
  const clock = $("#clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 20000);
  }

  /* ---- copy the email address ---- */
  $$("[data-copy]").forEach((btn) => {
    const note = btn.parentElement.querySelector(".copied");
    let t = 0;
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const r = document.createRange(); r.selectNodeContents(btn.parentElement.querySelector(".mail-addr"));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      }
      note.textContent = ok ? "copied! talk soon" : "selected, press Ctrl+C";
      clearTimeout(t); t = setTimeout(() => { note.textContent = ""; }, 2600);
    });
  });

  /* ---- the agent replay ---- */
  if (window.Agent) { try { window.Agent.init(); } catch (e) { console.error(e); } }

  /* ---- marks and the route wait for the fonts, so they wrap the final text ---- */
  const start = () => {
    drawAll(true);
    drawRoute();
    checkStack();
    spy();
    let rz = 0;
    const redraw = () => { clearTimeout(rz); rz = setTimeout(() => { drawAll(false); drawRoute(); checkStack(); }, 120); };
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(redraw);
      roughHosts.forEach((h) => ro.observe(h));
      if (route) ro.observe(route);
    }
    window.addEventListener("resize", redraw);
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(start));
})();
