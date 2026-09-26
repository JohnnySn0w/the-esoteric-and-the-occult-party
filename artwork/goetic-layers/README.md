# Goetic circle layer study

Open `index.html` in a browser. It works directly from disk and needs no account,
server, dependencies or internet connection. Each SVG is independently usable,
self-contained, transparent, and aligned to a 1000 × 1000 canvas.

| File | Content |
| --- | --- |
| `00-outline.svg` | Plain starting circle |
| `01-snake.svg` | Serpent, inscriptions and enclosing ring linework |
| `02-exterior-stars.svg` | Four candle pentagrams with their lettering |
| `03-interior-stars.svg` | Four hexagrams, including Alpha/Omega lettering |
| `04-central-square.svg` | Central square, Master inscription, corner crosses |
| `05-golden-mist.svg` | Animated gold haze and sparkles; reduced-motion fallback |

The historic layers embed the unchanged scan from
`magic-circle/public/goetia-source.jpg`. SVG masks isolate its content; an SVG
display filter renders the original ink gold and removes the paper background.
No letters or figures are generated or redrawn. Direction labels and the external
triangle are not part of these isolated layers. The mist is a new display effect.

Source: [Goetic Circle of Solomon plate on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Goetic_circle_from_The_Lesser_Key_of_Solomon.jpg), public domain.

Regenerate SVG assets with `python tools/make_goetic_layers.py` from the repository
root. The script does not modify the source image or change saved circles. The
study is separate from the live six-section NFC implementation, for review before
connecting the new five-action sequence.
