# Koi Koi — personalised apology experiences

A mobile-first app for making a private, animated apology: pick a world, write
three messages, seal a letter, send one unguessable link that expires in 1–7
days.

Two separate experiences share one data model and one scene engine:

- **Creator** — a seven-step wizard, live phone-frame preview, publish/revoke.
- **Recipient** — a cinematic, scene-based presentation at `/letter/[token]`.

## Quick start

```bash
npm install --include=dev   # this shell may export NODE_ENV=production
npm run dev
```

Open http://localhost:3000. No external services are required: drafts and
uploads are stored under `.data/`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and eight-theme showcase |
| `/create` | Start a new apology |
| `/create/[draftId]` | Wizard (names → situation → words → theme → characters → customise → publish) |
| `/preview/[draftId]` | Full recipient experience in a phone frame, creator controls outside |
| `/letter/[token]` | Published, recipient-facing experience (until it expires) |
| `/manage` | List letters, see time remaining, renew, revoke or delete |
| `/privacy` | What is stored, for how long, and how deletion works |

## Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run validate       # all four
npm run test:firebase  # lifecycle against Firestore + Storage emulators
                       # (start them with the emulators:exec line in docs/TESTING.md)
```

136 tests: 131 hermetic (scene building, theme/sticker contracts, validation,
link expiry, deletion lifecycle, media access, symbols, access control, text
reveals, envelope) plus 5 that run against real Firestore + Storage emulators.

## Production notes

- **Storage**: filesystem by default. Set `FIREBASE_PROJECT_ID`,
  `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` to switch to Firestore
  (required on Vercel, whose filesystem is ephemeral). `GET /api/health` reports
  which backend is active.
- **Access**: a creator's identity is an httpOnly cookie; the database stores
  only its SHA-256 hash. Recipients get read access through a 20-byte random
  token and can only ever see `PublishedApology`.
- **No indexing**: `robots: { index: false }` is set globally and per route.
- **Temporary links**: a sender picks a 1–7 day window at publish time. The
  deadline is computed server-side and stored as `expiresAt`; an expired token
  behaves exactly like an unknown one (404), so it reveals nothing. Publishing
  again renews the same token for a fresh window.
- **Deletion**: an hourly cron (`/api/cron/purge`, protected by `CRON_SECRET`)
  removes expired letters, their uploads and their metadata. Media is bound to
  its apology, so a dead link takes its photos with it. See
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §6.

## Documentation

- [`docs/REFERENCE_AUDIT.md`](docs/REFERENCE_AUDIT.md) — what was available to reference, and what was not
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decisions, data model, security
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — shell tokens, type, motion, accessibility
- [`docs/SCENE_SPECIFICATION.md`](docs/SCENE_SPECIFICATION.md) — every scene and its rules
- [`docs/THEME_SPECIFICATION.md`](docs/THEME_SPECIFICATION.md) — theme contract and eight directions
- [`docs/STICKER_SYSTEM.md`](docs/STICKER_SYSTEM.md) — pack contract, states, licensing
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phases, milestones, limitations
- [`docs/TESTING.md`](docs/TESTING.md) — automated coverage, manual matrix, security checklist

## Asset provenance

All character art and textures are original to this project. The `bubu-dudu`
pack is an original homage with different designs, names and silhouettes; no
third-party sticker artwork is bundled.
