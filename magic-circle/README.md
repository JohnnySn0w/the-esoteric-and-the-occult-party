# The Sixfold Circle

Six NTAG215 stickers open six HTTPS links. Each link automatically awakens one
section of a shared golden magic circle. The center lights when all six are awake.
The imagery is decorative, with Air, Sun, Venus, Earth, Jupiter and Saturn seals.

## Run a gathering

1. Open the site and choose **Prepare a circle**. Save the private host URL.
2. Open **Host controls → Open projector**, move that window to the projector,
   and choose **Fullscreen**. The projector link has no reset permission.
3. Encode each of the six **sticker URLs** as an NDEF HTTPS URI on an NTAG215.
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
- URL query: `?circle=<id>&seal=air&key=<seal-key>`.
- Projector query: `?circle=<id>&view=projector`.
- Host credential lives in the URL fragment and host browser local storage.
  Only its SHA-256 hash is stored server-side. No visitor storage is required.
- Public state includes only circle ID, six-bit mask, revision and last seal.
- Atomic bitwise updates preserve simultaneous scans. Reset requires the host
  credential; seal keys cannot reset the circle or read other sticker keys.
- Generated engraved circle artwork is `public/circle.png`; six SVG clipping
  sectors reveal that image. Reduced-motion preferences disable animation.
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
