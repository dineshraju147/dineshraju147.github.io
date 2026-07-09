/* =========================================================================
   dinesh@brain — the engine
   A fake terminal that is also a real one. The persona at the prompt is my
   second brain: it speaks as me, aware it is momentarily wearing a terminal.
   Three files, no build step, no dependencies.
   ========================================================================= */
(() => {
  "use strict";

  /* ---- DOM handles ----------------------------------------------------- */
  const bootEl   = document.getElementById("boot");
  const termEl   = document.getElementById("term");
  const outputEl = document.getElementById("output");
  const promptEl = document.getElementById("promptline");
  const typedEl  = document.getElementById("typed");
  const ghostEl  = document.getElementById("ghost");
  const input    = document.getElementById("hidden-input");
  const screenEl = document.getElementById("screen");
  const rain     = document.getElementById("rain");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Facts about me (single source of truth) ------------------------- */
  const ME = {
    name: "Dinesh Kumar Raju Kattunga",
    role: "Cloud AI Engineer",
    company: "Alakai",
    location: "Grand Rapids, Michigan",
    email: "kattungadineshraju@gmail.com",
    email2: "kattungadinesh147@gmail.com",
    links: {
      github:     "https://github.com/dineshraju147",
      linkedin:   "https://www.linkedin.com/in/dineshkumarraju0223/",
      medium:     "https://medium.com/@kattungadinesh147",
      hackerrank: "https://www.hackerrank.com/profile/Kattungadinesh11",
      resume:     "https://drive.google.com/file/d/1onQ4SWcswgyV61R8-dHIEMPYjuhJVk3d/view",
    },
  };

  /* ---- ASCII wordmark (ANSI Shadow, grid-aligned in IBM Plex Mono) ------ */
  const BANNER = [
    "██████╗ ██╗███╗   ██╗███████╗███████╗██╗  ██╗",
    "██╔══██╗██║████╗  ██║██╔════╝██╔════╝██║  ██║",
    "██║  ██║██║██╔██╗ ██║█████╗  ███████╗███████║",
    "██║  ██║██║██║╚██╗██║██╔══╝  ╚════██║██╔══██║",
    "██████╔╝██║██║ ╚████║███████╗███████║██║  ██║",
    "╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝",
  ].join("\n");

  const CHIP = [
    "    ┌───────────────┐",
    "  ══┥  ▓▒ D-OS ▒▓   ┝══",
    "  ══┥  .-\"\"\"\"\"-.    ┝══",
    "  ══┥ /  ^   ^  \\   ┝══",
    "  ══┥ |  (o o)  |   ┝══",
    "  ══┥  \\  \\_/  /    ┝══",
    "  ══┥   '-...-'     ┝══",
    "  ══┥ second brain  ┝══",
    "    └───────────────┘",
  ].join("\n");

  /* ---- utils ----------------------------------------------------------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const esc  = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el   = (id) => document.getElementById(id);

  function print(html) {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = html;
    outputEl.appendChild(div);
    scrollDown();
  }
  function scrollDown() { termEl.scrollTop = termEl.scrollHeight; }

  /* ---- state ----------------------------------------------------------- */
  let busy = false;
  let buffer = "";
  const history = [];
  let histIdx = 0;
  let matrixOn = false;
  let matrixOpenedAt = 0;

  /* =======================================================================
     TYPEWRITER — output types itself, line by line
     ===================================================================== */
  function typeLines(lines, { speed = 7, done } = {}) {
    return new Promise((resolve) => {
      busy = true;
      promptEl.hidden = true;
      let i = 0;
      const step = () => {
        if (i >= lines.length) {
          busy = false;
          showPrompt();
          if (done) done();
          resolve();
          return;
        }
        const item = lines[i++];
        if (item === "" || item == null) { print("&nbsp;"); }
        else { print(typeof item === "string" ? item : (item.html ?? "")); }
        setTimeout(step, reduced ? 0 : (item && item.pause ? item.pause : speed));
      };
      step();
    });
  }

  /* =======================================================================
     THE PROMPT — typed text, ghost completion, block caret on one line
     ===================================================================== */
  function showPrompt() {
    promptEl.hidden = false;
    renderInput();
    scrollDown();
  }
  function renderInput() {
    typedEl.textContent = buffer;
    ghostEl.classList.remove("hint");
    ghostEl.textContent = ghostFor(buffer);
    armIdleHint();
  }

  /* Idle nudge: after a few seconds with an empty prompt, invite a keystroke.
     Cycles through friendly suggestions so first-time visitors know it's live. */
  const IDLE_HINTS = [
    "type help and press enter",
    "try:  about",
    "try:  ask what are you good at",
    "try:  projects",
    "try:  neofetch",
  ];
  let idleTimer = 0, idleStep = 0;
  function armIdleHint() {
    clearTimeout(idleTimer);
    if (busy || matrixOn) return;
    idleTimer = setTimeout(showIdleHint, 6000);
  }
  function showIdleHint() {
    if (buffer || busy || matrixOn || promptEl.hidden) return;
    ghostEl.classList.add("hint");
    ghostEl.textContent = "  " + IDLE_HINTS[idleStep % IDLE_HINTS.length] + "  ↵";
    idleStep++;
    idleTimer = setTimeout(showIdleHint, 4200);
  }
  function ghostFor(buf) {
    if (!buf) return "";
    const head = buf.split(/\s+/)[0];
    if (buf.includes(" ")) return "";
    const hit = COMMAND_NAMES.find((c) => c.startsWith(head) && c !== head);
    return hit ? hit.slice(head.length) : "";
  }

  function echoCommand(raw) {
    print(
      `<span class="ps1"><span class="user">dinesh</span><span class="at">@</span>` +
      `<span class="host">brain</span><span class="path">:~$</span></span> ` +
      `<span class="hi">${esc(raw)}</span>`
    );
  }

  /* =======================================================================
     COMMAND DISPATCH — split, echo, history, Levenshtein "did you mean"
     ===================================================================== */
  function run(raw) {
    const line = raw.trim();
    echoCommand(raw);
    if (line) { history.push(line); histIdx = history.length; }
    if (!line) { showPrompt(); return; }

    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    const fn = COMMANDS[key];

    if (!fn) {
      const guess = nearest(key);
      const lines = [`<span class="warnc">command not found:</span> ${esc(name)}`];
      if (guess) lines.push(`did you mean <span class="cmd">${guess}</span>? &nbsp;<span class="dim">(or type <span class="cmd">help</span>)</span>`);
      else lines.push(`type <span class="cmd">help</span> for the list of commands.`);
      typeLines(lines);
      return;
    }
    const out = fn(args);
    if (out === null || out === undefined) return; // command runs its own flow
    typeLines(out);
  }

  function nearest(word) {
    let best = null, bd = 99;
    for (const c of COMMAND_NAMES) {
      const d = lev(word, c);
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= 3 ? best : null;
  }
  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return d[m][n];
  }

  /* =======================================================================
     CONTENT — every command's copy, written in my voice
     ===================================================================== */
  const link = (url, label) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(label || url)}</a>`;

  function bar(pct) {
    const w = 18, fill = Math.round((pct / 100) * w);
    return `<span class="bar-track">[<span class="bar-fill">${"█".repeat(fill)}</span>${"░".repeat(w - fill)}]</span>`;
  }

  const HELP = () => ([
    `<span class="dim">Available commands — type one and hit enter.</span>`,
    "",
    `  <span class="cmd">about</span>        who I am, the short version`,
    `  <span class="cmd">whoami</span>       ...and who you are`,
    `  <span class="cmd">experience</span>   where I've worked  <span class="dim">(alias: work)</span>`,
    `  <span class="cmd">projects</span>     things I've built  <span class="dim">(then: open &lt;name&gt;)</span>`,
    `  <span class="cmd">skills</span>       the stack, with honest signal bars`,
    `  <span class="cmd">education</span>    degrees and where`,
    `  <span class="cmd">certs</span>        certifications & writing`,
    `  <span class="cmd">ask</span> &lt;q&gt;      ask my second brain a question`,
    `  <span class="cmd">contact</span>      how to reach me  <span class="dim">(alias: social)</span>`,
    `  <span class="cmd">resume</span>       grab the PDF`,
    `  <span class="cmd">neofetch</span>     system card + ASCII me`,
    `  <span class="cmd">theme</span> &lt;name&gt; green · amber · ice`,
    `  <span class="cmd">clear</span>        wipe the screen`,
    `  <span class="cmd">matrix</span>       …you'll see`,
    "",
    `<span class="dim">↑/↓ history · Tab completes · Esc clears the line</span>`,
  ]);

  const ABOUT = () => ([
    `<span class="hi">${ME.name}</span> — <span class="acc">${ME.role} @ ${ME.company}</span>`,
    `<span class="dim">${ME.location}</span>`,
    "",
    `Hi. I build machine-learning systems and the cloud that runs them.`,
    `Right now I'm a Cloud AI Engineer at ${ME.company}, wiring large language`,
    `models to the real world through the <span class="hi">Model Context Protocol</span> and`,
    `architecting the AWS platform underneath it.`,
    "",
    `Before this I spent two years on my <span class="hi">M.S. in Applied Computer Science</span>`,
    `at Grand Valley State University — research on explainable AI for`,
    `precision agriculture, plus a run of ML projects from transformers`,
    `built from scratch to credit-risk models in production.`,
    "",
    `<span class="dim">How I work:</span> keep the code simple, write docs someone else can read,`,
    `ship a demo fast, measure it, explain the trade-offs, iterate.`,
    "",
    `<span class="dim">Try:</span> <span class="cmd">experience</span> · <span class="cmd">projects</span> · <span class="cmd">skills</span> · <span class="cmd">ask what are you good at</span>`,
  ]);

  const WHOAMI = () => ([
    `<span class="acc">you</span> — a curious visitor at my terminal.`,
    "",
    `Also: whoever you are, thanks for typing instead of scrolling.`,
    `If you're hiring, collaborating, or just poking around — same welcome.`,
    "",
    `<span class="dim">Me, on the other hand:</span> run <span class="cmd">about</span>.`,
  ]);

  const EXPERIENCE = () => ([
    `<span class="hi">experience</span> <span class="dim">// most recent first</span>`,
    "",
    `<span class="acc">▸ Cloud AI Engineer</span> — ${ME.company}`,
    `  <span class="dim">Feb 2026 – present · Grand Rapids, MI</span>`,
    `  · Design & ship <span class="hi">MCP</span> server integrations connecting LLMs to`,
    `    external data sources, securely and efficiently.`,
    `  · Build and maintain MCP tools, resources, and prompts.`,
    `  · Architect scalable <span class="hi">AWS</span> infrastructure for the platform.`,
    `  · Own CI/CD, monitoring, and security controls across environments.`,
    "",
    `<span class="acc">▸ Research Assistant</span> — Grand Valley State University`,
    `  <span class="dim">Jan 2025 – Dec 2025 · Explainable AI, precision agriculture</span>`,
    `  · Applied <span class="hi">Grad-CAM++, SHAP, LIME</span> across three CNN architectures`,
    `    for model interpretability.`,
    `  · Forecast soil moisture with ~99% accuracy (R² &gt; 0.99) using`,
    `    Voting & Random Forest regressors for water-efficient irrigation.`,
    "",
    `<span class="acc">▸ Data Analyst Intern</span> — AtliQ Technologies`,
    `  <span class="dim">Sep 2024 – Dec 2024</span>`,
    `  · Mined 100K+ records with SQL & Python for business decisions.`,
    `  · Built Power BI dashboards, +30% reporting efficiency.`,
    `  · Automated data prep in Python, −25% manual processing time.`,
    "",
    `<span class="acc">▸ Campus Operations Assistant</span> — GVSU`,
    `  <span class="dim">Jan 2024 – Dec 2025 · workflow optimization</span>`,
    `  · Task-tracking systems that lifted workflow efficiency ~15%.`,
  ]);

  /* projects: an in-terminal filesystem you can `open` */
  const PROJECTS = {
    transformer: {
      title: "Decoder-only Transformer",
      repo: "https://github.com/dineshraju147/Decoder_only_Transformer",
      body: [
        `A decoder-only Transformer built from the ground up in <span class="hi">PyTorch</span> —`,
        `attention, positional encoding, the training loop, all of it, no`,
        `high-level shortcuts. The point was to understand every tensor.`,
        `<span class="dim">stack:</span> PyTorch, self-attention, causal masking`,
      ],
    },
    makemore: {
      title: "make_more",
      repo: "https://github.com/dineshraju147/make_more",
      body: [
        `A modular, WaveNet-inspired <span class="hi">character-level language model</span> built`,
        `from scratch. Clean, hackable layers you can reason about.`,
        `<span class="dim">stack:</span> PyTorch, WaveNet-style dilated stacks`,
      ],
    },
    damage: {
      title: "Vehicle Damage Detection",
      repo: "https://github.com/dineshraju147/vehicle-damage-detection",
      body: [
        `Classifies car damage with deep learning, powered by <span class="hi">ResNet50</span>`,
        `transfer learning. ~80% validation accuracy on a messy real dataset.`,
        `<span class="dim">stack:</span> PyTorch, ResNet50, transfer learning, Streamlit`,
      ],
    },
    credit: {
      title: "Credit Risk Model",
      repo: "https://github.com/dineshraju147/ml-project-credit-risk-model",
      body: [
        `A credit-risk scorer with <span class="hi">XGBoost</span>, tuned with Optuna and deployed`,
        `for real-time scoring. AUC ≈ 0.98.`,
        `<span class="dim">stack:</span> XGBoost, Optuna, scikit-learn, Streamlit`,
      ],
    },
    insurance: {
      title: "Health Insurance Premium Prediction",
      repo: "https://github.com/dineshraju147/health-insurance-premium-prediction",
      body: [
        `An ML app estimating premium costs for "Shield Insurance" at ~97%`,
        `accuracy, wrapped in a usable front end.`,
        `<span class="dim">stack:</span> scikit-learn, regression, Streamlit`,
      ],
    },
    business360: {
      title: "Business-360",
      repo: "https://github.com/dineshraju147/Business-360",
      body: [
        `An interactive <span class="hi">Power BI</span> dashboard for AtliQ Hardware — finance,`,
        `sales, marketing, and supply-chain views that speed up decisions.`,
        `<span class="dim">stack:</span> Power BI, DAX, SQL, data modeling`,
      ],
    },
  };
  const PROJ_ORDER = ["transformer", "makemore", "damage", "credit", "insurance", "business360"];

  const PROJECTS_LIST = () => {
    const rows = PROJ_ORDER.map((k) => {
      const p = PROJECTS[k];
      return `  <span class="cmd">${k.padEnd(12)}</span> ${p.title}`;
    });
    return [
      `<span class="hi">projects/</span> <span class="dim">// ${PROJ_ORDER.length} selected builds</span>`,
      "",
      ...rows,
      "",
      `<span class="dim">open one:</span> <span class="cmd">open transformer</span>  ·  <span class="dim">all repos:</span> <span class="cmd">contact</span>`,
    ];
  };

  const SKILLS = () => ([
    `<span class="hi">skills</span> <span class="dim">// signal bars = how much I reach for it, not ego</span>`,
    "",
    `  Python           ${bar(95)} <span class="dim">95</span>`,
    `  PyTorch / DL     ${bar(88)} <span class="dim">88</span>`,
    `  MCP / LLM tools  ${bar(88)} <span class="dim">88</span>`,
    `  AWS              ${bar(85)} <span class="dim">85</span>`,
    `  SQL / data eng   ${bar(85)} <span class="dim">85</span>`,
    `  GCP              ${bar(78)} <span class="dim">78</span>`,
    `  Power BI / viz   ${bar(82)} <span class="dim">82</span>`,
    `  Docker / CI-CD   ${bar(75)} <span class="dim">75</span>`,
    "",
    `<span class="dim">also in the toolbox:</span>`,
    `<span class="chip">TensorFlow</span><span class="chip">Transformers</span><span class="chip">LLaMA</span><span class="chip">RAG</span>` +
    `<span class="chip">LangChain</span><span class="chip">XGBoost</span><span class="chip">scikit-learn</span><span class="chip">MLflow</span>` +
    `<span class="chip">Grad-CAM++</span><span class="chip">SHAP</span><span class="chip">LIME</span><span class="chip">BigQuery</span>` +
    `<span class="chip">Tableau</span><span class="chip">Git</span><span class="chip">Explainable AI</span>`,
  ]);

  const EDUCATION = () => ([
    `<span class="hi">education</span>`,
    "",
    `<span class="acc">▸ M.S. Applied Computer Science</span>`,
    `  Grand Valley State University · <span class="dim">Jan 2024 – Jan 2026</span>`,
    "",
    `<span class="acc">▸ Fellow, CCBP 4.0 Intensive</span>`,
    `  NxtWave · <span class="dim">Apr 2022 – Aug 2023</span>`,
    "",
    `<span class="acc">▸ B.Tech, Mechanical Engineering</span>`,
    `  Sri Venkateswara University · <span class="dim">2019 – 2023</span>`,
  ]);

  const CERTS = () => ([
    `<span class="hi">certifications & writing</span>`,
    "",
    `  ▸ Microsoft Certified: <span class="hi">Power BI Data Analyst Associate</span> <span class="dim">· Mar 2025</span>`,
    `  ▸ Neo4j Fundamentals Certification`,
    `  ▸ Deep Learning Specialization`,
    `  ▸ SQL: Beginner to Advanced for Data Professionals`,
    `  ▸ JavaScript Essentials`,
    "",
    `<span class="dim">writing:</span>`,
    `  ${link("https://medium.com/@kattungadinesh147/from-loops-to-layers-understanding-and-implementing-self-attention-in-transformers-from-scratch-92bafc27f086", "Self-Attention Explained with PyTorch")} <span class="dim">— Medium</span>`,
    `  more on ${link(ME.links.medium, "medium.com/@kattungadinesh147")}`,
  ]);

  const CONTACT = () => ([
    `<span class="hi">contact</span> <span class="dim">// let's build something</span>`,
    "",
    `  email      ${link("mailto:" + ME.email, ME.email)}`,
    `  linkedin   ${link(ME.links.linkedin, "in/dineshkumarraju0223")}`,
    `  github     ${link(ME.links.github, "github.com/dineshraju147")}`,
    `  medium     ${link(ME.links.medium, "@kattungadinesh147")}`,
    `  hackerrank ${link(ME.links.hackerrank, "Kattungadinesh11")}`,
    `  location   ${ME.location}`,
    "",
    `<span class="dim">grab the</span> <span class="cmd">resume</span> <span class="dim">too.</span>`,
  ]);

  const RESUME = () => ([
    `Opening my résumé in a new tab…`,
    `<span class="dim">if it didn't open:</span> ${link(ME.links.resume, "download the PDF")}`,
  ]);

  /* ---- ask: the second brain ------------------------------------------- */
  const QA = [
    { k: ["who are you", "introduce", "about you", "yourself", "tell me about"], a: ABOUT },
    { k: ["good at", "strength", "best at", "expert", "specialize", "specialise"], a: () => [
        `Three things I'm genuinely good at:`,
        `  1. <span class="hi">Connecting LLMs to real systems</span> — MCP servers, tools, and`,
        `     the plumbing that makes a model actually useful.`,
        `  2. <span class="hi">Cloud architecture</span> — designing AWS infra that scales`,
        `     without lighting money on fire.`,
        `  3. <span class="hi">Building ML from first principles</span> — I've written the`,
        `     transformer by hand, so I know what the abstractions hide.`,
      ] },
    { k: ["hire", "looking for", "opportunit", "job", "available", "open to"], a: () => [
        `I'm a Cloud AI Engineer at ${ME.company} and I like hard problems at the`,
        `intersection of <span class="hi">AI, cloud, and shipping</span>. Open to collaborating on`,
        `MCP / LLM tooling, applied ML, and cloud platform work.`,
        `Fastest path: <span class="cmd">contact</span>.`,
      ] },
    { k: ["mcp", "model context protocol", "protocol"], a: () => [
        `MCP — the Model Context Protocol — is how I connect LLMs to the`,
        `outside world: servers that expose <span class="hi">tools, resources, and prompts</span>`,
        `a model can call. At ${ME.company} I design these integrations so an LLM`,
        `can reach real data securely instead of hallucinating it.`,
      ] },
    { k: ["stack", "tools", "technolog", "languages", "skills"], a: SKILLS },
    { k: ["project", "built", "portfolio", "work you"], a: PROJECTS_LIST },
    { k: ["study", "school", "degree", "education", "university", "gvsu"], a: EDUCATION },
    { k: ["research", "agriculture", "xai", "explainable", "soil"], a: () => [
        `My research was <span class="hi">explainable AI for precision agriculture</span> at GVSU.`,
        `I used Grad-CAM++, SHAP, and LIME to open up CNN decisions, and`,
        `forecast soil moisture at ~99% accuracy so irrigation could be`,
        `water-efficient across different terrain. Interpretability first.`,
      ] },
    { k: ["contact", "reach", "email", "linkedin", "connect"], a: CONTACT },
    { k: ["location", "where", "based", "michigan", "grand rapids"], a: () => [
        `I'm based in <span class="hi">${ME.location}</span> — and comfortable working across`,
        `cloud, remote, and cross-functional teams.`,
      ] },
    { k: ["why", "philosophy", "approach", "how do you work"], a: () => [
        `My rule: don't ship "dark code" I can't explain myself. Keep it`,
        `simple, document it, demo it fast, measure it, then improve with`,
        `feedback. I'd rather understand a small thing deeply than paste a`,
        `big thing I don't. Curiosity over cleverness.`,
      ] },
    { k: ["hobby", "fun", "outside", "free time"], a: () => [
        `Outside the day job: building things like this terminal, writing`,
        `about ML on Medium, and chasing the next certification. I treat`,
        `learning as the actual product.`,
      ] },
  ];

  function ASK(args) {
    const q = args.join(" ").toLowerCase().trim();
    if (!q) return [
      `<span class="dim">ask me something — e.g.</span>`,
      `  <span class="cmd">ask what are you good at</span>`,
      `  <span class="cmd">ask what is mcp</span>`,
      `  <span class="cmd">ask are you looking for work</span>`,
    ];
    const hit = QA.find((e) => e.k.some((kw) => q.includes(kw)));
    const head = `<span class="dim">&gt; you asked:</span> <span class="hi">${esc(args.join(" "))}</span>`;
    if (hit) return [head, "", ...hit.a()];
    return [
      head, "",
      `Hmm — my second brain doesn't have a canned answer for that one.`,
      `Ask me about my <span class="cmd">work</span>, <span class="cmd">projects</span>, <span class="cmd">skills</span>, <span class="cmd">mcp</span>, or how to <span class="cmd">hire</span> me.`,
      `Or reach the real me: <span class="cmd">contact</span>.`,
    ];
  }

  const NEOFETCH = () => {
    const art = CHIP.split("\n").map((l) => `<span class="nf-art">${esc(l)}</span>`).join("\n");
    const info = [
      `<b>${esc(ME.name.split(" ")[0])}</b>@<b>brain</b>`,
      `<span class="dim">─────────────────────</span>`,
      `<b>role</b>     ${ME.role}`,
      `<b>host</b>     ${ME.company}`,
      `<b>os</b>       DINESH-OS mk.4 (second brain)`,
      `<b>uptime</b>   learning, continuously`,
      `<b>shell</b>    /bin/curiosity`,
      `<b>edu</b>      M.S. Applied CS · GVSU`,
      `<b>lang</b>     Python · SQL · JS`,
      `<b>focus</b>    MCP · AWS · applied ML`,
      `<b>loc</b>      ${ME.location}`,
      `<span class="dim">─────────────────────</span>`,
      `<span class="chip" style="background:var(--phos);color:var(--bg)">green</span><span class="chip">amber</span><span class="chip">ice</span>`,
    ].join("\n");
    return [`<div class="nf"><div style="white-space:pre">${art}</div><div class="nf-info" style="white-space:pre-line">${info}</div></div>`];
  };

  /* =======================================================================
     COMMANDS TABLE
     ===================================================================== */
  const COMMANDS = {
    help: HELP,
    "?": HELP,
    man: HELP,
    about: ABOUT,
    summary: ABOUT,
    bio: ABOUT,
    whoami: WHOAMI,
    experience: EXPERIENCE,
    work: EXPERIENCE,
    projects: PROJECTS_LIST,
    ls: (a) => (a[0] && a[0].startsWith("proj")) ? PROJECTS_LIST() : [
      `about  experience  projects  skills  education  certs  contact  resume`,
    ],
    open: (a) => openProject(a),
    cat: (a) => openProject(a),
    skills: SKILLS,
    education: EDUCATION,
    edu: EDUCATION,
    certs: CERTS,
    certifications: CERTS,
    contact: CONTACT,
    social: CONTACT,
    email: () => [`${link("mailto:" + ME.email, ME.email)}`],
    resume: () => { window.open(ME.links.resume, "_blank", "noopener"); return RESUME(); },
    cv: () => { window.open(ME.links.resume, "_blank", "noopener"); return RESUME(); },
    ask: ASK,
    neofetch: NEOFETCH,
    theme: (a) => setTheme(a[0]),
    clear: () => { outputEl.innerHTML = ""; showPrompt(); return null; },
    cls: () => { outputEl.innerHTML = ""; showPrompt(); return null; },
    matrix: () => { startMatrix(); return null; },
    date: () => [new Date().toString()],
    echo: (a) => [esc(a.join(" "))],
    history: () => history.length ? history.map((h, i) => `  ${String(i + 1).padStart(3)}  ${esc(h)}`) : [`<span class="dim">no history yet</span>`],
    sudo: (a) => [
      `<span class="warnc">[sudo]</span> nice try. this brain runs on curiosity, not root.`,
      a.length ? `<span class="dim">${esc(ME.name)} is not in the sudoers file. This incident will be remembered fondly.</span>` : "",
    ].filter(Boolean),
    exit: () => [`there's no exit — you're inside my head now. <span class="dim">(try</span> <span class="cmd">clear</span><span class="dim">)</span>`],
    hire: () => ASK(["hire", "me"]),
  };

  const COMMAND_NAMES = Object.keys(COMMANDS).filter((c) => c.length > 1 && c !== "?");

  function openProject(a) {
    const name = (a[0] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!name) return [`<span class="dim">usage:</span> <span class="cmd">open &lt;name&gt;</span> — see <span class="cmd">projects</span>`];
    const key = PROJ_ORDER.find((k) => k === name || k.startsWith(name) || name.startsWith(k));
    const p = key && PROJECTS[key];
    if (!p) return [
      `<span class="warnc">no such project:</span> ${esc(a[0])}`,
      `run <span class="cmd">projects</span> for the list.`,
    ];
    return [
      `<span class="hi">${p.title}</span>`,
      `<span class="dim">${p.repo.replace("https://", "")}</span>`,
      "",
      ...p.body,
      "",
      `${link(p.repo, "→ open on GitHub")}`,
    ];
  }

  function setTheme(name) {
    const themes = { green: "", amber: "amber", ice: "ice" };
    const key = (name || "").toLowerCase();
    if (!(key in themes)) return [
      `<span class="dim">themes:</span> <span class="cmd">green</span> · <span class="cmd">amber</span> · <span class="cmd">ice</span>`,
      `<span class="dim">usage:</span> <span class="cmd">theme amber</span>`,
    ];
    if (themes[key]) document.documentElement.setAttribute("data-theme", themes[key]);
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("dinesh-theme", key); } catch (e) {}
    return [`phosphor set to <span class="hi">${key}</span>. <span class="dim">the whole tube recolored.</span>`];
  }

  /* =======================================================================
     MATRIX — full-bleed digital rain on canvas
     ===================================================================== */
  const ctx = rain.getContext("2d");
  let columns = [], fontSize = 16, rainRAF = 0, lastFrame = 0;
  const GLYPHS = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789:.=*+-<>¦｜".split("");

  function sizeRain() {
    rain.width = window.innerWidth;
    rain.height = window.innerHeight;
    fontSize = Math.max(12, Math.min(18, window.innerWidth / 60));
    columns = new Array(Math.ceil(rain.width / fontSize)).fill(0)
      .map(() => Math.floor(Math.random() * (rain.height / fontSize)));
  }
  function hexA(hex, a) {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--phos").trim();
    return `rgba(${parseInt(v.slice(1,3),16)},${parseInt(v.slice(3,5),16)},${parseInt(v.slice(5,7),16)},${a})`;
  }
  function drawRain(t) {
    if (!matrixOn) return;
    rainRAF = requestAnimationFrame(drawRain);
    if (document.hidden) return;
    if (t - lastFrame < 55) return;      // ~18fps, the classic cadence
    lastFrame = t;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    ctx.fillStyle = `rgba(${parseInt(bg.slice(1,3),16)},${parseInt(bg.slice(3,5),16)},${parseInt(bg.slice(5,7),16)},0.16)`;
    ctx.fillRect(0, 0, rain.width, rain.height);
    ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
    const phos = getComputedStyle(document.documentElement).getPropertyValue("--phos").trim();
    for (let i = 0; i < columns.length; i++) {
      const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      ctx.fillStyle = Math.random() > 0.975 ? "#eafff4" : phos;
      ctx.fillText(ch, i * fontSize, columns[i] * fontSize);
      if (columns[i] * fontSize > rain.height && Math.random() > 0.975) columns[i] = 0;
      columns[i]++;
    }
  }
  function startMatrix() {
    if (matrixOn) return;
    if (reduced) { typeLines([`<span class="dim">(matrix suppressed — you prefer reduced motion. wise.)</span>`]); return; }
    sizeRain();
    matrixOn = true;
    matrixOpenedAt = performance.now();
    rain.classList.add("on");
    promptEl.hidden = true;
    lastFrame = 0;
    rainRAF = requestAnimationFrame(drawRain);
    print(`<span class="dim">// entering the rain — press any key to wake up</span>`);
  }
  function stopMatrix() {
    if (!matrixOn) return;
    matrixOn = false;
    cancelAnimationFrame(rainRAF);
    rain.classList.remove("on");
    ctx.clearRect(0, 0, rain.width, rain.height);
    showPrompt();
  }
  window.addEventListener("resize", () => { if (matrixOn) sizeRain(); });

  /* =======================================================================
     KEYBOARD
     ===================================================================== */
  function onKey(e) {
    // matrix intercepts everything, but guard the launch keystroke
    if (matrixOn) {
      if (performance.now() - matrixOpenedAt > 250) { e.preventDefault(); stopMatrix(); }
      return;
    }
    if (busy) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const raw = buffer; buffer = ""; renderInput();
      run(raw);
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      buffer = buffer.slice(0, -1); renderInput(); return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const g = ghostFor(buffer);
      if (g) { buffer += g; renderInput(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); buffer = ""; renderInput(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; buffer = history[histIdx] || ""; renderInput(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < history.length - 1) { histIdx++; buffer = history[histIdx] || ""; }
      else { histIdx = history.length; buffer = ""; }
      renderInput();
      return;
    }
    if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); outputEl.innerHTML = ""; showPrompt(); return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      buffer += e.key; renderInput();
    }
  }

  window.addEventListener("keydown", onKey);

  // keep a hidden input focused so mobile keyboards open on tap
  function focusInput() { try { input.focus({ preventScroll: true }); } catch (e) {} }
  // Soft keyboards deliver characters, backspace, and newline via input events
  // rather than reliable keydowns — handle all three here for mobile.
  input.addEventListener("input", (e) => {
    if (busy || matrixOn) { input.value = ""; return; }
    const t = input.value;
    input.value = "";
    if (e.inputType === "deleteContentBackward") { buffer = buffer.slice(0, -1); renderInput(); return; }
    if (t.includes("\n")) {
      buffer += t.split("\n")[0];
      const raw = buffer; buffer = ""; renderInput(); run(raw);
      return;
    }
    if (t) { buffer += t; renderInput(); }
  });
  document.addEventListener("click", (e) => {
    if (matrixOn) { stopMatrix(); return; }
    if (e.target.closest("a")) return; // let links work
    focusInput();
  });

  /* =======================================================================
     STATUS HUD — a living lower third
     ===================================================================== */
  const clockEl = el("hud-clock");
  const memEl = el("hud-mem");
  let memBase = 34 + Math.random() * 6;
  function tickHud() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    if (clockEl) clockEl.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    memBase += (Math.random() - 0.5) * 1.4;
    memBase = Math.max(28, Math.min(52, memBase));
    if (memEl) memEl.textContent = `mem ${memBase.toFixed(2)}%`;
  }
  setInterval(tickHud, 1000);
  tickHud();

  /* =======================================================================
     BOOT SEQUENCE — POST theatre, then a self-typing wordmark
     ===================================================================== */
  async function typeInto(node, text, speed = 5) {
    for (const ch of text) {
      node.textContent += ch;
      scrollBoot();
      if (!reduced) await wait(speed);
    }
  }
  function bootLine(html) {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = html;
    bootEl.appendChild(div);
    scrollBoot();
    return div;
  }
  function scrollBoot() { bootEl.scrollTop = bootEl.scrollHeight; }

  const POST = [
    { h: `<span class="dim">DINESH-OS mk.4 — second-brain kernel</span>`, d: 120 },
    { h: `<span class="dim">(c) ${new Date().getFullYear()} ${esc(ME.name)} · all curiosity reserved</span>`, d: 180 },
    { h: `&nbsp;`, d: 60 },
    { h: `POST … detecting cognition modules ......... <span class="ok">OK</span>`, d: 200 },
    { h: `loading identity.dat ....................... <span class="ok">100%</span>`, d: 200 },
    { h: `mounting /experience /projects /skills ..... <span class="ok">OK</span>`, d: 200 },
    { h: `linking model-context-protocol ............. <span class="ok">OK</span>`, d: 190 },
    { h: `calibrating AWS region ..................... <span class="ok">us-east-1</span>`, d: 180 },
    { h: `restraint subsystem ........................ <span class="warnc">PARTIAL</span>`, d: 210 },
    { h: `warming up second brain .................... <span class="ok">READY</span>`, d: 220 },
  ];

  async function boot() {
    // reduced motion → skip straight to a static banner + hint
    if (reduced) { await finishBoot(true); return; }
    for (const p of POST) { bootLine(p.h); await wait(p.d); }
    await wait(160);
    bootLine("&nbsp;");
    const b = document.createElement("div");
    b.className = "banner";
    bootEl.appendChild(b);
    await typeInto(b, BANNER, 3);
    await wait(260);
    await finishBoot(false);
  }

  async function finishBoot(instant) {
    bootEl.setAttribute("aria-hidden", "true");
    bootEl.style.display = "none";
    termEl.hidden = false;
    el("hud").removeAttribute("aria-hidden");
    // Opening splash inside the terminal
    const b = document.createElement("div");
    b.className = "banner";
    b.textContent = BANNER;
    outputEl.appendChild(b);
    await typeLines([
      "",
      `<span class="dim">// ${ME.role} @ ${ME.company} · second brain, online</span>`,
      "",
      `Hi — I'm <span class="hi">${esc(ME.name.split(" ").slice(0,3).join(" "))}</span>. This terminal is me,`,
      `momentarily wearing a CRT. Ask it anything about my work.`,
      "",
      `<span class="dim">start here →</span> <span class="cmd">help</span> · <span class="cmd">about</span> · <span class="cmd">projects</span> · <span class="cmd">ask what are you good at</span>`,
      "",
    ], { speed: instant ? 0 : 9 });
    focusInput();
  }

  /* ---- restore saved theme, then boot ---------------------------------- */
  try {
    const saved = localStorage.getItem("dinesh-theme");
    if (saved && saved !== "green") document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}

  boot();
})();
