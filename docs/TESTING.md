# Testing

## Commands

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit (strict)
npm run test        # vitest (jsdom)
npm run build       # next build
npm run validate    # all four, in order
```

> `NODE_ENV` is `production` in some shells. `npm test` pins `NODE_ENV=test`
> so React's development build (which provides `act`) is loaded.

## Automated coverage

| Area | File | What it proves |
| --- | --- | --- |
| Scene ordering | `src/presentation/build-scenes.test.ts` | theme order respected (heartfelt puts envelope before letter), opening first, response last, no duplicate ids |
| Optional scenes | same | memory absent without photos, present with them; letter dropped when the note is blank |
| Content fidelity | same | each message scene carries the sender's exact text, and never invents copy |
| Theme × pack matrix | same | all 8 themes × 6 packs produce ≥5 scenes, opening-first, response-last, unique ids |
| Theme contract | `src/themes/registry.test.ts` | eight themes, known scene keys, required scenes, motion values, distinct palettes |
| Contrast | same | every theme's body text ≥ 4.5:1 on its background |
| Sticker contract | same | six packs, all eleven states present per pack, provenance declared, unique accents/characters |
| Input validation | `src/lib/validation/apology.test.ts` | unknown theme/pack ids rejected, blank names rejected, 320-char message cap, 5-photo cap, hex-only colours, volume bounds, unknown keys stripped |
| Access control | `src/lib/storage/file-repository.test.ts` | unpublished letters invisible, other owners blocked from save/publish, revoke stops serving, revoked drafts unsavable, malformed ids/tokens rejected, `toPublished` leaks nothing |
| Link expiry | `src/lib/expiry.test.ts`, `file-repository.test.ts` | 1–7 day window honoured, out-of-range clamped, expired window stops serving, re-publish renews the same token, missing expiry never counts as live |
| Expiry is not client-set | `src/lib/validation/apology.test.ts` | `linkDurationDays` accepts 1–7 and rejects 0/8/fractional; a supplied `expiresAt` is stripped |
| Reveal primitives | `src/components/presentation/MessageReveal.test.tsx` | text is never dropped in any reveal mode |
| Envelope | `src/components/presentation/EnvelopeAnimation.test.tsx` | starts sealed, opens on the seal, reveals the letter, addresses recipient, signs sender, fires `onOpened` |

**91 tests across 7 files.**

## Manual / visual matrix

Run `npm run dev` and check:

| Viewport | Where | Pass condition |
| --- | --- | --- |
| 360 × 640 | `/letter/...` | no horizontal scroll, CTA above the fold, text not clipped |
| 390 × 844 | all routes | default target |
| 430 × 932 | all routes | larger type does not overflow cards |
| 768 × 1024 | `/preview/[id]` | phone frame centred, controls beside it |
| 1440 × 900 | `/`, `/preview` | showcase grid 4-up, frame intact |

Per theme: open `/preview/[id]`, step every scene, confirm the skin changes
composition between opening, letter, memory and response.

Per pack: switch packs in step 5 and confirm the same character states render
without reloading the theme.

Reduced motion: enable it at the OS level and confirm scenes cut rather than
animate, the typewriter renders instantly, and ambient loops stop.

Audio: confirm nothing plays before "Hear me out", mute works, pause works, and
switching tabs pauses playback.

## Security checklist

| Check | Expected |
| --- | --- |
| `GET /letter/<random>` | 404, same page as a revoked link |
| `GET /create/<other-browser-draft>` | 404 |
| `PATCH /api/drafts/<id>` from another browser | 403 |
| Unpublish / revoke then reopen | 404 |
| Upload a `.jpg` containing PHP | 415 (magic bytes fail) |
| Upload 20 MB photo | 413 |
| Theme id `../../etc` | 400 via Zod |
| Recipient HTML in a message | rendered as text, never as markup |

## Verified results

Access control, exercised against a running server with two independent cookie
jars:

| Request | Result |
| --- | --- |
| `POST /api/drafts` (valid) | 201, no token in the response |
| `PATCH` own draft | 200 |
| `PATCH` same draft, different browser | **403** "You do not have access to this draft." |
| `POST .../publish` | 200, returns `{ token, path }` |
| `GET /letter/<published token>` | 200, renders the recipient experience |
| `GET /letter/<unknown token>` | **404** |
| `GET /letter/<token>` after revoke | **404** |
| Publish for 1 day | 200, `expiresAt` ≈ now + 24 h |
| Publish for 8 days / 0 days | **400** with a field-level message |
| `GET /letter/<token>` once `expiresAt` has passed | **404**, same page as an unknown token |
| Publish again after expiry | same token, fresh window, letter serves again |
| `POST /api/uploads` with a PHP payload named `.jpg` | **415** |
| `POST /api/uploads` with a real PNG | 201 |

Visual sweep: all eight themes loaded at **360 px and 390 px** — `0` console
errors, `0` px horizontal overflow in every combination. All nine scenes were
stepped in the preview frame with `0` console errors, and the polaroid,
scrapbook and slideshow memory layouts each rendered with three uploaded photos.

## Defects found during verification (and fixed)

| # | Defect | Cause | Fix |
| --- | --- | --- | --- |
| 1 | Wizard reset mid-step, then crashed with `Cannot read properties of undefined (reading 'trim')` | `update()` shallow-merged `messages`, so editing message 1 replaced the whole object | `DraftPatch` type + nested merge for `messages` and `customization` |
| 2 | Hydration mismatch on Midnight | star `left/top/width` were raw floats; SSR serialises to 5 dp | round to 3 dp before render |
| 3 | Hydration mismatch on Friendship | computed SVG `x2/y2` differed at 15 significant digits | `round3()` helper on every computed coordinate |
| 4 | Preview phone frame clipped the CTA | engine stage used `min-h-[100svh]` (the browser viewport) inside a fixed-height frame | `h-full min-h-0` + scene-level scroll |
| 5 | Envelope's letter rose into the scene heading | inner letter translated `-58%` with no clipping | cap at `-22%`, fade the envelope to 40% once the card appears |
| 6 | Heartfelt wax seal sat behind the response copy | skin motif at `top-44%` collided with the panel | moved to a side motif at `top-64%` |
| 7 | Situations step showed "Anything else" as selected with an empty field | selection state ignored `situationCustom` | "other" only reads as chosen once explained |

Two environment traps worth remembering:

- `NODE_ENV=production` in this shell makes `npm install` skip devDependencies
  and makes React's production build load in tests (`React.act is not a
  function`). Always `npm install --include=dev`; `npm test` pins `NODE_ENV=test`.
- `npm install` rewrites `package.json` scripts. Re-check the `test` script after
  any dependency change.

## Production notes

`FileRepository` writes to `.data/`. That survives local development and any
long-lived Node host, but **not** Vercel's ephemeral filesystem. Set:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY   # with \n escapes
```

`GET /api/health` reports the active backend.

Firestore is never read with the client SDK; `firestore.rules` denies client
access entirely and all reads/writes go through the Admin SDK in route handlers.
