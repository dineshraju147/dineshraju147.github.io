# Dinesh Kattunga · AI engineer, shipping on AWS

The portfolio of **Dinesh Kumar Raju Kattunga**, Cloud AI Engineer at Alakai in Grand Rapids,
Michigan.

**Live:** https://dineshraju147.github.io/

## The idea

An engineer's notebook. Dinesh trained as a mechanical engineer, so the page is built like the pad
on his desk: graph paper, tape, sticky notes, a dot-matrix name in a hand-drawn box, and sketches
in the margins. It reads top to bottom:

| Section | What it shows |
|---|---|
| Hero | The name, what he does now (AI agents on AWS), email and résumé |
| About | The short version, a portrait, and the six areas he works in |
| How I got here | Five index cards along a route that draws itself as you scroll: the screen, the data, the models, attention, agents on AWS |
| Selected work | Four project folders that stack as you scroll, then a shelf of seven more projects |
| Run the agent | A replay of the agent pattern he builds: pick a question and watch each AWS service light up on a sketch of the architecture (sample data, no model called) |
| Experience | A logbook of roles, education, and credentials as stamps |
| Rules I work by | Five pinned notes |
| Let's talk | Email, with a copy button, LinkedIn, GitHub, Medium and the résumé |

## How it's built

No framework and no build step. Static files served by GitHub Pages.

```
index.html              the page, with JSON-LD Person data and Open Graph tags
assets/css/notebook.css tokens, paper, stickers, tape, sections, motion and breakpoints
assets/js/notebook.js   arrival, reveals, hand-drawn marks, the story route, the folder stack, the bar
assets/js/agent.js      the "Run the agent" replay and its architecture sketch
assets/vendor/          rough.js 4.6.6 (vendored, MIT) for the hand-drawn boxes, lines and diagram
assets/sketch/          hand-drawn doodles, drawn once with rough.js and saved as SVG
assets/fonts/           Handjet, Architects Daughter, Albert Sans, JetBrains Mono (self-hosted, OFL)
assets/img/gen/         still lifes generated with Higgsfield for the project folders
assets/img/work/        project thumbnails
terminal/               an earlier interactive-terminal portfolio, kept as an easter egg
legacy-angular/         the original Angular site
```

Everything that moves respects `prefers-reduced-motion`. Content is only hidden while it is about
to scroll into view, so links, fast scrolls and crawlers always find it. The project folders only
stack on screens tall enough to show a whole folder.

## Run it locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## License

MIT, see [`LICENSE`](LICENSE).
