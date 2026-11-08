<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

## Environment

- This shell exports `NODE_ENV=production`. Always install with
  `npm install --include=dev`, and run tests as `NODE_ENV=test ...` (the
  `npm test` script already does).
- `cacheComponents` is disabled on purpose. Do not enable it without moving every
  route behind `<Suspense>`; see `docs/ARCHITECTURE.md` AD-04.

## Contracts (single source of truth)

Never redefine a domain shape outside these files:

| Concern | File |
| --- | --- |
| Theme | `src/types/theme.ts` |
| Sticker pack | `src/types/sticker.ts`, `src/sticker-packs/types.ts` |
| Scene | `src/types/scene.ts` |
| Apology / draft | `src/types/apology.ts` |
| Validation | `src/lib/validation/apology.ts` (Zod, the wire + storage boundary) |

Persistence may only contain data that these schemas accept. Nothing loaded from
storage may define components, timing functions or selectors.

## Link lifetime

- Published links are temporary: `MIN_LINK_DAYS` to `MAX_LINK_DAYS` (1–7).
- `expiresAt` is always computed on the server. Never accept it from a client
  and never add it to `draftPayloadSchema`.
- A published record without a valid future `expiresAt` must never be served.

## Adding a theme

1. Create `src/themes/<id>/theme.ts` (`export const theme: ApologyTheme`).
2. Create `src/themes/<id>/skin.tsx` (`export default function Skin`, `"use client"`,
   decorative-only, unique composition, respects `paused`).
3. Add the id to `THEME_IDS` and the registry. No engine changes.

## Adding a sticker pack

1. `src/sticker-packs/<id>/meta.ts` — `export const meta: StickerPack`.
2. `src/sticker-packs/<id>/art.tsx` — `export default` a `StickerPackArt`.
3. Every pack must render **all eleven** `CHARACTER_STATES`, with a distinct pose
   per state, prefixed CSS/SVG ids, and a static path when `animate === false`.

## Rendering rules that exist for a reason

- Theme skins render **only** decoration: `absolute inset-0`, `aria-hidden`,
  `pointer-events-none`. No text, no controls.
- Sticker art is resolved through `art.render(state)(props)` — a render function,
  not a component type. Do not instantiate a component from a runtime lookup.
- Round any computed inline style or SVG attribute to a fixed precision. SSR
  serialises floats to 5 dp and a mismatch triggers a hydration error.
- Never format a date or time during SSR. The server formats in UTC and the
  browser in local time; use `useMounted()` to defer date text until after
  hydration.
- Ambient motion stops when `paused` is true (inactive scene, hidden tab, reduced
  motion).
- Recipient responses are never transmitted. Do not add an endpoint for them.

## Before finishing work

```bash
npm run validate   # lint → typecheck → test → build
```

Mobile checks at 360 px and 390 px: no horizontal overflow, no console errors.
