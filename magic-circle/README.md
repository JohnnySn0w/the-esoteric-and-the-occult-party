# The Goetic Circle

Five NTAG215 stickers activate five independent layers: snake, exterior stars,
interior stars, central square, and golden mist/sparkles. Initially only one plain
circle is visible. Use the mist sticker last for the finale; activation order is
not enforced. Reset hides all five layers while keeping the outline.

## Artwork source

The app displays the actual **Figure 153, Magical Circle of King Solomon** from the
Mathers/Crowley *Goetia*, as reproduced in L. W. de Laurence's *The Lesser Key of
Solomon: Goetia, The Book of Evil Spirits*. The source scan is public domain:

- [Wikimedia Commons file and provenance](https://commons.wikimedia.org/wiki/File:Goetic_circle_from_The_Lesser_Key_of_Solomon.jpg)
- [Scanned volume at Internet Archive](https://archive.org/details/lesserkeyofsolom00dela/page/n5/mode/2up)

`public/goetia-source.jpg` is the unchanged 1728 × 2324 source image. The SVG viewport
omits the external triangle, its lower name and the figure caption. It retains the
circle's original names, four internal hexagrams, central square and
four external candle pentagrams. Direction labels are omitted. A display filter makes the original printed ink
gold on black; the original lettering and drawing are not regenerated or transcribed.
This is a monochrome projection adaptation, not a reproduction of the text's color
prescriptions. It is the Goetic circle, not an Abramelin diagram.

## Run a gathering

1. Open the site and choose **Prepare a circle**. Save the private host URL.
2. Open **Host controls → Open projector**, move that window to the projector,
   and choose **Fullscreen**. The projector link has no reset permission.
3. Encode each of the five **sticker URLs** as an NDEF HTTPS URI on an NTAG215.
   Use this repository's `tools/make_ntag215.py` and `tools/flipper_ble.py`.
4. Guests scan and accept the phone's normal Open prompt. The opened page awakens
   that seal automatically. No account, app, shortcut or phone setup is needed.
5. Use **Reset circle** in the host controls to start again with the same stickers.

Every device needs internet access; they can use different networks. The active
projector checks for changes about once per second, then fades in the seal.
Repeated openings are idempotent. Links remain reusable after reset. Anyone with
a sticker link can activate that seal remotely; this is a party effect, not proof
that someone is physically present. Keep the host URL private.

Actual Android/iPhone NFC behavior must be checked on the intended phones. Local
desktop browser testing does not establish physical phone compatibility.

## Data and implementation

- React/Vinext frontend and a Cloudflare D1 shared database through Sites.
- URL query: `?circle=<id>&seal=section-1&key=<seal-key>` (through `section-5`).
- The first five prototype links and stored keys retain their IDs, now mapped
  to the five layers in order. Existing Section One stickers reveal the snake.
  The old sixth action is retired; its bit is omitted from public state.
- Projector query: `?circle=<id>&view=projector`.
- Host credential lives in the URL fragment and host browser local storage.
  Only its SHA-256 hash is stored server-side. No visitor storage is required.
- Public state includes only circle ID, five-bit mask, revision and last seal.
- Atomic bitwise updates preserve simultaneous scans. Reset requires the host
  credential; seal keys cannot reset the circle or read other sticker keys.
- The approved standalone SVG layers in `public/goetic-layers/` are stacked
  over the outline. Unrevealed layers have zero opacity. The fifth SVG contains
  animated mist and sparkles, independent of the four historical art layers.
  Reduced-motion preferences disable animation.
- Optional read-only WebMCP `get_circle_progress` returns the same public state.
- Runtime event URLs, host credentials and generated NFC files belong in the
  parent repository's ignored `artifacts/` directory, never committed source.

## Develop locally

Use Node 22.13+ and the Sites portable execution profile. Install dependencies
with `npm ci`, then `npm run dev` (normally port 5173). D1 needs its schema before
the first API request. Build once (`npm run build`), then apply each new migration
once to the local database:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_chilly_mantis.sql
```

After schema changes, run `npm run db:generate`. Production deployment applies the
tracked migrations; never create tables inside request handlers.

Validation:

```powershell
npx tsc --noEmit
node scripts/test-circle.mjs
npm run build
```

The integration script requires the local preview and tests host authorization,
invalid links, room isolation, simultaneous/duplicate scans, reset, sticker reuse,
and absence of credentials in public state. It creates local test circles only.

## Publishing

This directory is the source in the user's GitHub repository. The Sites project
ID is preserved in `.openai/hosting.json`. Publish an exact source copy from the
ignored `artifacts/site-checkout/` directory using the Sites workflow; keep its
independent source checkout out of this repository's tracked tree. Use public
visitor access so opening a sticker requires no sign-in. Never copy `.env*`, local
database/runtime state, event links or credentials into the publication checkout.

Repeat checks after functional changes. Native deployment status must report
success before new sticker files are generated against that deployment's URL.
