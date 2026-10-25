/* =========================================================================
   Page behaviour: load sequence, reveals, the bar that takes each chapter's
   colour, the exploded-view scene, the hero loop and the local clock.
   ========================================================================= */
(() => {
  "use strict";
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const phone = () => window.matchMedia("(max-width: 767px)").matches;

  // hidden states only exist from here on, so a failed script never hides content
  html.classList.add("motion");

  /* ---- load sequence: everything readable on the first frame, arrival done by ~1.2s ---- */
  const heroTitle = $(".hero-title");
  $$(".hero-title [data-line]").forEach((l, i) => l.parentElement.style.setProperty("--i", i));
  $$(".hero [data-rise]").forEach((el, i) => el.style.setProperty("--d", 420 + i * 110 + "ms"));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    html.classList.add("is-loaded");
    heroTitle && heroTitle.classList.add("is-in");
    $$(".hero [data-rise]").forEach((el) => el.classList.add("is-in"));
  }));

  /* ---- reveals: each part of a section arrives once, in reading order ---- */
  $$("[data-rise-list]").forEach((list) => [...list.children].forEach((c, i) => c.style.setProperty("--i", i)));
  $$(".poster li").forEach((li, i) => li.style.setProperty("--i", i));
  $$(".ch-text").forEach((t) => $$("[data-rise], [data-rise-list]", t).forEach((el, i) => el.style.setProperty("--d", 120 + i * 90 + "ms")));
  $$(".about-right [data-rise]").forEach((el, i) => el.style.setProperty("--d", 150 + i * 110 + "ms"));

  const revealTargets = $$(".ch-head, [data-rise]:not(.hero [data-rise]), [data-rise-list], [data-open], .ui-frame, .poster, .rows");
  // a target whose own box starts fully clipped (the portrait's circle) is watched through its parent
  const watchOf = (el) => (el.classList.contains("about-photo") ? el.closest(".about-panel") : el);
  // Content is only hidden while it is about to scroll into view ("armed"), never far down the page:
  // a jump by link, a fast scroll or a crawler reading the page all find it already there.
  if ("IntersectionObserver" in window) {
    const waiting = new Map();
    const done = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (waiting.get(e.target) || []).forEach((t) => t.classList.add("is-in"));
        done.add(e.target);
        io.unobserve(e.target); arm.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
    const arm = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (done.has(e.target)) continue;
        // arm only from below: an element the visitor has already passed is simply shown
        const below = e.boundingClientRect.top > 0;
        (waiting.get(e.target) || []).forEach((t) => t.classList.toggle("armed", e.isIntersecting && below));
      }
    }, { rootMargin: "0px 0px 30% 0px", threshold: 0 });
    revealTargets.forEach((el) => {
      const w = watchOf(el);
      if (!waiting.has(w)) waiting.set(w, []);
      waiting.get(w).push(el);
    });
    waiting.forEach((_, w) => { arm.observe(w); io.observe(w); });
  }

  /* ---- the bar: shown after the hero, coloured by the field beneath it ---- */
  const bar = $("#bar");
  const hero = $(".hero");
  const fields = $$("main > section[data-field], footer[data-field]");
  const navLinks = $$(".bar-nav a");
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = bar.offsetHeight / 2;
    bar.classList.toggle("is-shown", hero.getBoundingClientRect().bottom < bar.offsetHeight);
    let current = null;
    for (const f of fields) {
      const r = f.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { current = f; break; }
    }
    if (current) {
      const field = current.dataset.field;
      if (bar.dataset.field !== field) bar.dataset.field = field;
      const id = current.id;
      const chapter = ["interface", "data", "models", "attention", "agents"].includes(id) ? "story" : id;
      navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + chapter)));
    }
  };
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  onScroll();

  /* ---- hero: the sky loop (desktop, motion allowed, not on save-data) ---- */
  const video = $(".hero-video");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduced && !saveData && !phone()) {
    window.addEventListener("load", () => {
      video.src = video.dataset.src;
      video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
      video.play().catch(() => {});
    });
    document.addEventListener("visibilitychange", () => { if (document.hidden) video.pause(); else if (video.src) video.play().catch(() => {}); });
  }

  /* ---- local time in Grand Rapids ---- */
  const clock = $("#clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 15000);
  }

  /* ---- work: the hovered or focused project fills the preview ---- */
  const preview = $("#work-preview-img"), caption = $("#work-preview-cap");
  const workLinks = $$(".work-names a[data-cap]");
  if (preview && workLinks.length) {
    let swap = 0;
    const show = (a) => {
      workLinks.forEach((x) => x.classList.toggle("is-current", x === a));
      const src = a.querySelector("img").getAttribute("src");
      caption.textContent = a.dataset.cap;
      if (preview.getAttribute("src") === src) return;
      clearTimeout(swap);
      preview.classList.add("is-swapping");
      swap = setTimeout(() => { preview.src = src; preview.classList.remove("is-swapping"); }, 160);
    };
    workLinks.forEach((a) => { a.addEventListener("mouseenter", () => show(a)); a.addEventListener("focus", () => show(a)); });
    workLinks[0].classList.add("is-current");
  }

  /* ---- demos ---- */
  if (window.Demos) window.Demos.init();

  /* ---- the exploded view: a frame sequence scrubbed by the scroll ---- */
  const stack = $("#story");
  const art = $("#stack-art");
  function stackScene() {
    if (!window.Stage || !stack || !art) return;
    const count = parseInt(art.dataset.frames || "0", 10);
    const base = art.dataset.path;
    const beats = $$(".stack-beat", stack);
    const legend = $$(".stack-legend li", stack);
    let frames = [], canvas = null, ctx = null, current = -1, want = 0;

    const setupCanvas = () => {
      if (canvas || !count) return;
      canvas = document.createElement("canvas");
      canvas.width = parseInt(art.dataset.w, 10); canvas.height = parseInt(art.dataset.h, 10);
      canvas.setAttribute("aria-hidden", "true");
      ctx = canvas.getContext("2d");
      frames = Array.from({ length: count }, (_, i) => {
        const img = new Image();
        img.decoding = "async";
        img.src = `${base}${String(i + 1).padStart(3, "0")}.webp`;
        img.onload = () => { if (i === want || current < 0) draw(want); };
        return img;
      });
      art.appendChild(canvas);
      art.classList.add("has-canvas");
    };
    const draw = (i) => {
      want = i;
      if (!ctx) return;
      // nearest loaded frame at or below the wanted one, so scrubbing never shows a blank
      let k = i;
      while (k > 0 && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k--;
      const img = frames[k];
      if (!img || !img.complete || !img.naturalWidth || k === current) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      current = k;
    };
    const setBeat = (p) => {
      const b = p < 0.34 ? 0 : 1;
      beats.forEach((el, i) => el.classList.toggle("is-on", i === b));
      // layers light up as they come apart: top layer first
      const lit = p < 0.2 ? 0 : Math.min(legend.length, Math.ceil((p - 0.2) / 0.62 * legend.length));
      legend.forEach((li, i) => li.classList.toggle("is-on", i < lit));
    };

    Stage.scene(stack, {
      hold: 2,
      scrub: true,
      build(tl) {
        setupCanvas();
        const state = { f: 0 };
        tl.to(state, {
          f: Math.max(0, count - 1), duration: 0.82, ease: "none",
          onUpdate: () => draw(Math.round(state.f)),
        }, 0.06);
        tl.eventCallback("onUpdate", () => setBeat(tl.progress()));
        setBeat(0);
      },
      phone: "same",
      rest() {
        beats.forEach((el) => el.classList.add("is-on"));
        legend.forEach((li) => li.classList.add("is-on"));
      },
    });
  }

  function start() {
    stackScene();
    if (window.Stage) { Stage.smooth(); }
  }
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
