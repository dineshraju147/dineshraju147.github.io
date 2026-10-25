# Dinesh Kattunga · AI engineer, shipping on AWS

A story-telling portfolio for **Dinesh Kumar Raju Kattunga**, Cloud AI Engineer at Alakai in
Grand Rapids, Michigan.

**Live:** https://dineshraju147.github.io/

## The idea

Dinesh trained as a mechanical engineer, where you understand a machine by drawing its exploded
view. So the page opens with his: a machined block that comes apart, layer by layer, as you scroll.
Each layer is a part of an AI product, in the order he learned it, and each becomes a chapter in
its own colour:

| Chapter | Years | Colour comes from | Live proof on the page |
|---|---|---|---|
| Interface | 2022 – 2023 | the blue of a hyperlink | one card, unstyled vs designed |
| Data | 2023 – 2024 | Power BI yellow | a filterable Business 360-style board |
| Models | 2024 – 2025 | the field green of his soil-moisture research | a neural network that trains in the browser |
| Attention | 2025 | the paper of the transformer paper | real scaled dot-product attention over your sentence |
| Agents on AWS | 2025 – now | AWS ink and orange | an agent run that lights up the AWS architecture |

The fixed bar takes the colour of the chapter beneath it. After the chapters: an index of selected
work with a preview, experience as poster lines, an about panel, contact rows and a footer of tiles.

## How it's built

No framework and no build step. Static files served by GitHub Pages.

```
index.html              the page, with JSON-LD Person data and Open Graph tags
assets/css/site.css     tokens (one typeface, five sizes, one radius), fields, layout, motion
assets/js/main.js       load sequence, reveals, chapter-coloured bar, the exploded-view scene, clock
assets/js/demos.js      the five live proofs (plain JS + SVG/canvas, no libraries)
assets/js/stage.js      the held scroll stage (from tasteskill), on GSAP ScrollTrigger + Lenis
assets/vendor/          gsap 3.15.0, ScrollTrigger, lenis 1.3.26 (vendored, pinned)
assets/seq/stack/       66 WebP frames of the exploded view, scrubbed by scroll on a canvas
assets/img/gen/         chapter photographs and the hero sky (still + 22 s loop)
assets/img/work/        project thumbnails
terminal/               the previous interactive-terminal portfolio, kept as an easter egg
legacy-angular/         the original Angular site
```

Everything that moves respects `prefers-reduced-motion`; content is only hidden while it is about
to scroll into view, so links, fast scrolls and crawlers always find it.

## Imagery

Generated with Higgsfield for this site: the hero sky (Nano Banana, animated with Kling 3.0), the
five chapter still lifes, and the exploded block (a still, its exploded end frame, and a Kling 3.0
start/end-frame animation turned into the scroll sequence). Project thumbnails and the portrait are
Dinesh's own.

## Design process

Art direction from [tasteskill](https://github.com/leonxlnx/taste-skill) (direction: colour
chapters). Each round was checked with its source lint and real-browser inspector at 1440, 768 and
390 px and critiqued from the screenshots.

## License

MIT, see [`LICENSE`](LICENSE).
