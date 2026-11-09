# Koi Koi — personalised apology experiences

A mobile-first app for making a private, animated apology: pick a world, write
three messages, seal a letter, send one unguessable link that expires in 1–7
days.

Neon PostgreSQL for data, Filebase (S3) for private media, Next.js on Vercel
Hobby. Expiry is enforced on every read; physical deletion is orchestrated by a
scheduled Neon Function. There is no cron route, no worker and no Firebase.

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
npm run db:migrate     # apply migrations to DATABASE_URL
```

137 hermetic tests: scene building, theme/sticker contracts, validation, link
expiry, upload lifecycle and its race with deletion, the deletion protocol,
media access, symbol audit, security headers, error boundary, envelope.

## Production notes

- **Database**: `DATABASE_URL` (Neon pooled). Migrations: `npm run db:migrate`.
  No filesystem fallback — the app throws without it.
- **Storage**: `FILEBASE_*`. Private bucket only; media is served through a
  60-second pre-signed redirect after an authorisation check.
- **Deletion**: a Neon `schedule` trigger runs `neon/functions/cleanup.ts`, which
  calls Filebase `DeleteObjects`. See `docs/ARCHITECTURE.md` §3.
- **Access**: a creator's identity is an httpOnly cookie; the database stores
  only its SHA-256 hash. Recipients get read access through a 20-byte random
  token and can only ever see `PublishedApology`.
- **No indexing**: `robots: { index: false }` is set globally and per route.
- **Temporary links**: a sender picks a 1–7 day window at publish time. The
  deadline is computed server-side and stored as `expiresAt`; an expired token
  behaves exactly like an unknown one (404), so it reveals nothing. Publishing
  again renews the same token for a fresh window.
- **Deletion**: a Neon `schedule` trigger runs `neon/functions/cleanup.ts`,
  which deletes the Filebase objects and then the rows. Media is bound to its
  apology, so a dead link takes its photos with it. See
  [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §3.

## Documentation

- [`docs/REFERENCE_AUDIT.md`](docs/REFERENCE_AUDIT.md) — what was available to reference, and what was not
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — decisions, data model, security
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — shell tokens, type, motion, accessibility
- [`docs/SCENE_SPECIFICATION.md`](docs/SCENE_SPECIFICATION.md) — every scene and its rules
- [`docs/THEME_SPECIFICATION.md`](docs/THEME_SPECIFICATION.md) — theme contract and eight directions
- [`docs/STICKER_SYSTEM.md`](docs/STICKER_SYSTEM.md) — pack contract, states, licensing
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phases, milestones, limitations
- [`docs/TESTING.md`](docs/TESTING.md) — automated coverage, manual matrix, security checklist
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — pre-launch verification and required configuration

## Asset provenance

All character art and textures are original to this project. The `bubu-dudu`
pack is an original homage with different designs, names and silhouettes; no
third-party sticker artwork is bundled.
