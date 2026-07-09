# dinesh@brain — an interactive terminal portfolio

An interactive CRT terminal that is also a real one. The persona at the prompt
is my **second brain** — it speaks as me, answers questions about my work, and
happens to be wearing a phosphor-green terminal.

**Live:** https://dineshraju147.github.io/

```
██████╗ ██╗███╗   ██╗███████╗███████╗██╗  ██╗
██╔══██╗██║████╗  ██║██╔════╝██╔════╝██║  ██║
██║  ██║██║██╔██╗ ██║█████╗  ███████╗███████║
██║  ██║██║██║╚██╗██║██╔══╝  ╚════██║██╔══██║
██████╔╝██║██║ ╚████║███████╗███████║██║  ██║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝
```

---

## What it is

A single-page, no-build, no-framework portfolio for **Dinesh Kumar Raju
Kattunga** — Cloud AI Engineer. Type a command and the terminal answers.
It is designed so *anyone* — recruiter, engineer, or curious visitor — can
learn about me in under a minute, whether they type or just watch the prompt
nudge them.

## Try these commands

| command | what it does |
|---|---|
| `help` | list every command |
| `about` | who I am, the short version |
| `whoami` | …and who you are |
| `experience` | where I've worked (alias: `work`) |
| `projects` | selected builds — then `open <name>` |
| `skills` | the stack, with honest signal bars |
| `education` · `certs` | degrees, certifications, writing |
| `ask <question>` | ask my second brain (e.g. `ask what is mcp`) |
| `contact` · `resume` | how to reach me / grab the PDF |
| `neofetch` | system card + ASCII portrait |
| `theme <green\|amber\|ice>` | recolor the whole tube |
| `matrix` | …you'll see |

Also: `↑`/`↓` walk history, `Tab` accepts the autosuggestion, `Esc` clears the
line. On mobile, tap the screen to bring up the keyboard.

## How it's built

Three files. No build step, no framework, no dependencies, no images.

- **`index.html`** — structure, metadata, JSON-LD, and a no-JS fallback.
- **`style.css`** — the CRT is *stacked CSS overlays*: scanlines, a drifting
  roll bar, barrel vignette, corner glare, chromatic misconvergence on the
  wordmark, and a power-on bloom. Three phosphor themes are CSS custom
  properties on `:root`; the `theme` command swaps one attribute and the whole
  tube recolors.
- **`app.js`** — a real command engine: split → dispatch → echo → history, a
  Levenshtein "did you mean?" for typos, a self-typing boot sequence, a
  fish-style autosuggestion ghost, the full-bleed `matrix` canvas, and a living
  status HUD with a real clock.

Everything animated respects `prefers-reduced-motion`, and the rain loop pauses
when the tab is hidden so it never burns a background tab.

## Design process — three iteration passes

Each pass = ship it, then screenshot at 1440px and 390px, read every shot like a
hostile art director, fix everything, and add one deliberate upgrade.

1. **Pass 1 — sell the tube.** The CRT read too flat. Strengthened the
   scanlines, added a drifting roll bar and a power-on bloom, and added an idle
   hint that cycles suggestions so a non-technical visitor knows the prompt is
   live.
2. **Pass 2 — details & reach.** Rebuilt the neofetch ASCII chip so both
   borders are grid-perfect, added JSON-LD `Person` structured data (so search
   engines can introduce me too), dropped an unused font, and repositioned the
   input so mobile soft-keyboards reliably open.
3. **Pass 3 — the fine-tooth comb.** Verified every command, the typo
   "did you mean?", tab completion, both themes, the reduced-motion path, and a
   completely clean console.

## Credits

Designed & built by **Claude** (Anthropic), adapting the concept from
[FABLE-25 exhibit 09 · `shell`](https://fable-25.netlify.app/shell/) into a
personal second-brain portfolio. Content and identity: Dinesh Kumar Raju
Kattunga.

The previous Angular version of this site lives under [`legacy-angular/`](legacy-angular/).

## License

MIT — see [`LICENSE`](LICENSE).
