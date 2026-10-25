/* =========================================================================
   Run the agent: a replay of the pattern I build, lighting up a hand-drawn
   sketch of the AWS architecture as each step happens. Sample data only.
   ========================================================================= */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const H = 62;

  // two layouts of the same architecture: wide for a desk, tall for a phone
  const LAYOUTS = {
    wide: {
      view: [800, 344],
      nodes: {
        req: [8, 141, 132], api: [172, 141, 132], lambda: [336, 141, 120], core: [488, 141, 140],
        llm: [664, 20, 130], mcp: [664, 141, 130], data: [664, 262, 130], obs: [430, 262, 180],
      },
    },
    tall: {
      view: [340, 470],
      nodes: {
        req: [0, 0, 158], api: [180, 0, 158], lambda: [180, 102, 158], core: [180, 204, 158],
        llm: [0, 204, 158], mcp: [180, 306, 158], obs: [0, 306, 158], data: [180, 404, 158],
      },
    },
  };
  const LABELS = {
    req: ["Your question", "you"], api: ["API Gateway", "auth · rate limit"], lambda: ["Lambda", "session"],
    core: ["AgentCore", "agent runtime"], llm: ["Bedrock", "Claude"], mcp: ["MCP server", "ECS Fargate"],
    data: ["RDS · S3", "records · logs"], obs: ["CloudWatch", "traces · cost"],
  };
  const WIRES = [["req", "api"], ["api", "lambda"], ["lambda", "core"], ["core", "llm"], ["core", "mcp"], ["mcp", "data"], ["core", "obs"]];

  // an orthogonal wire between two boxes: straight when they share a row or column, one elbow otherwise
  function route(A, B) {
    const [ax, ay, aw] = A, [bx, by, bw] = B;
    const acx = ax + aw / 2, acy = ay + H / 2, bcx = bx + bw / 2, bcy = by + H / 2;
    if (Math.abs(acy - bcy) < 1) return acx < bcx ? [[ax + aw, acy], [bx, bcy]] : [[ax, acy], [bx + bw, bcy]];
    if (Math.abs(acx - bcx) < 1) return acy < bcy ? [[acx, ay + H], [bcx, by]] : [[acx, ay], [bcx, by + H]];
    const x = bx > ax ? Math.min(ax + aw - 24, acx + 30) : acx;
    if (by + H <= ay) return [[x, ay], [x, bcy], [bx > ax ? bx : bx + bw, bcy]];
    if (by >= ay + H) {
      const tx = Math.max(bx + 16, Math.min(bx + bw - 16, x));
      return tx === x ? [[x, ay + H], [x, by]] : [[x, ay + H], [x, by - 16], [tx, by - 16], [tx, by]];
    }
    return [[acx, ay + H], [acx, bcy], [bx + bw, bcy]];
  }

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
  const wireKey = { api: "req-api", lambda: "api-lambda", "core-llm": "core-llm", "core-mcp": "core-mcp", "mcp-data": "mcp-data", "core-obs": "core-obs" };

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const fmt = (s) => esc(s)
    .replace(/^(POST [^ ]+)/, '<span class="t-step">$1</span>')
    .replace(/^(plan|check) →/, '<span class="t-step">$1 →</span>')
    .replace(/^tool {2}([\w.]+)/, '<span class="t-tool">tool  $1</span>')
    .replace(/^(answer)/, '<span class="t-ok">$1</span>')
    .replace(/^(session|trace saved)/, '<span class="t-dim">$1</span>');

  function init() {
    const svg = $("#arch"), trace = $("#trace"), run = $("#agent-run");
    if (!svg || !trace || !run) return;
    const code = trace.querySelector("code");
    const runLabel = run.querySelector(".btn-label");
    const nodeEls = {}, wireEls = {};
    let layout = "";

    function build() {
      if (!window.rough) return;
      const want = svg.parentElement.clientWidth < 560 ? "tall" : "wide";
      if (want === layout) return;
      layout = want;
      const L = LAYOUTS[want];
      svg.setAttribute("viewBox", `-6 -6 ${L.view[0] + 12} ${L.view[1] + 12}`);
      svg.replaceChildren();
      const rc = rough.svg(svg);
      let seed = 3;
      for (const [a, b] of WIRES) {
        const pts = route(L.nodes[a], L.nodes[b]);
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", "wire");
        g.appendChild(rc.linearPath(pts, { stroke: "#1B1814", strokeWidth: 1.8, roughness: 0.9, bowing: 1, seed: seed++ }));
        // arrowhead on the last segment
        const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1];
        const ang = Math.atan2(y2 - y1, x2 - x1), k = 9;
        const head = [[x2 - k * Math.cos(ang - 0.5), y2 - k * Math.sin(ang - 0.5)], [x2, y2], [x2 - k * Math.cos(ang + 0.5), y2 - k * Math.sin(ang + 0.5)]];
        g.appendChild(rc.linearPath(head, { stroke: "#1B1814", strokeWidth: 1.8, roughness: 0.5, seed: seed++ }));
        svg.appendChild(g);
        wireEls[a + "-" + b] = g;
      }
      for (const [k, [x, y, w]] of Object.entries(L.nodes)) {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", "node");
        g.setAttribute("transform", `translate(${x} ${y})`);
        g.appendChild(rc.rectangle(0, 0, w, H, { stroke: "#1B1814", strokeWidth: 2, roughness: 1.1, fill: "#FFFEFA", fillStyle: "solid", seed: seed++ }));
        const hi = rc.rectangle(4, 4, w - 8, H - 8, { stroke: "none", fill: k === "core" || k === "llm" ? "#FF9900" : "#F6C945", fillStyle: "hachure", hachureGap: 4.5, fillWeight: 2.4, hachureAngle: -40, roughness: 1, seed: seed++ });
        hi.setAttribute("class", "n-hi");
        g.appendChild(hi);
        const t1 = document.createElementNS(NS, "text");
        t1.setAttribute("class", "n-label"); t1.setAttribute("x", 12); t1.setAttribute("y", 27);
        t1.textContent = LABELS[k][0];
        const t2 = document.createElementNS(NS, "text");
        t2.setAttribute("class", "n-sub"); t2.setAttribute("x", 12); t2.setAttribute("y", 47);
        t2.textContent = LABELS[k][1];
        g.append(t1, t2);
        svg.appendChild(g);
        nodeEls[k] = g;
      }
    }
    build();
    let rz = 0;
    window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(build, 150); });

    // the question picker is a radio group: arrows move, the choice follows focus
    const group = $(".asks");
    const buttons = [...group.querySelectorAll("[role=radio]")];
    let ask = "deploys", timer = 0, playing = false;
    const choose = (b, focus) => {
      buttons.forEach((x) => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      ask = b.dataset.ask;
      if (playing) start();
    };
    buttons.forEach((b, i) => {
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", () => choose(b, false));
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        choose(buttons[(i + d + buttons.length) % buttons.length], true);
      });
    });

    const clear = () => {
      Object.values(nodeEls).forEach((g) => g.classList.remove("is-on", "was-on"));
      Object.values(wireEls).forEach((w) => w.classList.remove("is-on"));
    };
    const lit = (nodes, wires) => {
      Object.values(nodeEls).forEach((g) => { if (g.classList.contains("is-on")) { g.classList.remove("is-on"); g.classList.add("was-on"); } });
      Object.values(wireEls).forEach((w) => w.classList.remove("is-on"));
      nodes.split(",").filter(Boolean).forEach((n) => { nodeEls[n] && (nodeEls[n].classList.remove("was-on"), nodeEls[n].classList.add("is-on")); });
      wires.split(",").filter(Boolean).forEach((w) => { const el = wireEls[wireKey[w] || w]; if (el) el.classList.add("is-on"); });
    };
    function start() {
      clearTimeout(timer);
      clear();
      const steps = ASKS[ask];
      code.innerHTML = "";
      playing = true;
      run.setAttribute("aria-busy", "true");
      runLabel.textContent = "Running…";
      let i = 0;
      const next = () => {
        if (i >= steps.length) {
          playing = false;
          run.removeAttribute("aria-busy");
          runLabel.textContent = "Run it again";
          clear();
          return;
        }
        const [nodes, wires, text] = steps[i++];
        lit(nodes, wires);
        code.innerHTML += (code.innerHTML ? "\n" : "") + fmt(text);
        trace.scrollTop = trace.scrollHeight;
        timer = setTimeout(next, reduced() ? 0 : 900 + text.length * 6);
      };
      next();
    }
    run.addEventListener("click", start);
    // the resting state is the finished trace of the first question
    code.innerHTML = ASKS.deploys.map((s) => fmt(s[2])).join("\n");
  }

  window.Agent = { init };
})();
