# Architecture

## 1. Shape

```
Browser ──► App Router pages (RSC) ──► Server Actions ──► Repository ──► .data | Firestore
                 │                                            │
                 └──► Presentation Engine (client) ◄── Zod ◄──┘
```

- **Reads** for creator pages and the public letter happen in Server Components.
- **Writes** from the wizard go through Server Actions (`src/app/create/actions.ts`).
- **Uploads** and the JSON letter endpoint go through Route Handlers
  (`src/app/api/**`) because they stream bytes and serve machine-readable data.
- The **client never talks to Firestore**. Admin credentials stay server-side and
  the client SDK is not used for drafts or letters, so no client-side rule can be
  used to enumerate data.

## 2. Key decisions

### AD-01 — Lazy theme skins, static theme data

`src/themes/registry.ts` imports theme *data* statically (cheap, needed for CSS
variables and pickers) and theme *skins* through `next/dynamic`. Landing pages
and the wizard therefore download one composition, not eight.

### AD-02 — Lazy sticker art, registry-cached

`loadStickerArt(packId)` dynamically imports one pack's art module and caches the
result. The renderer shows a tonal placeholder until the chunk resolves, then
swaps in place. A failed chunk renders a labelled fallback, never a broken image.

### AD-03 — SVG is a first-class sticker format

The brief lists `rive | lottie | webp | apng`. There are no licensed Rive/Lottie
binaries available, and the brief explicitly forbids filling that hole with
emoji. Original animated SVG characters were authored instead, so `svg` was added
to `STICKER_FORMATS`. `lottie` and `rive` renderers still ship and are lazily
imported when a licensed pack provides a file, so adding one needs no engine
change.

### AD-04 — `cacheComponents` disabled

Next 16 enables Cache Components by default, which requires every route to
produce a static shell. Every route here is request-time (owner cookies, private
tokens, personalised content). The flag is disabled in `next.config.ts` rather
than wrapping each route in artificial `<Suspense>` boundaries.

### AD-05 — Filesystem default, Firestore when configured

`getRepository()` returns `FirestoreRepository` only when
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are all
present; otherwise `FileRepository` writes to `.data/`. This keeps the project
runnable and testable with zero external setup, and production needs only env
vars. Vercel's ephemeral filesystem is the reason Firestore is the production
path — documented in `docs/TESTING.md`.

### AD-06 — Scene order is theme data, copy is tone data

`buildScenes()` walks `theme.sceneIds` and fills each scene from the sender's
messages using copy keyed by a coarse *tone* (tender / warm / solemn /
restrained). Themes reorder and restyle; they never contain the sender's words.

### AD-07 — Colour overrides are palette-only

`themeScopeVars()` applies sender colours to five palette slots. Spacing,
composition, motion and scene structure are not overridable, which is why a
sender cannot break a layout.

## 3. Data model

`ApologyRecord` = `ApologyDraft` + `accessToken` + `ownerKeyHash`. Everything the
recipient receives is `PublishedApology`, which has neither.

Security properties:

| Property | Mechanism |
| --- | --- |
| Unguessable link | 20 random bytes, base64url (`createAccessToken`) |
| No sequential ids in URLs | `crypto.randomUUID()` for ids; tokens are separate |
| Drafts private | server-side `ownerKeyHash` comparison on every read/write |
| Published-only access | `getPublishedByToken` returns `undefined` unless the record is live |
| Time-limited links | `expiresAt` is computed server-side; `isLinkLive()` requires `published` **and** a future expiry |
| No immortal links | a published record with no `expiresAt` is treated as dead, not as permanent |
| Revocation | status flips to `revoked`; token lookup then misses |
| Expiry is not client-controlled | `expiresAt` is absent from `draftPayloadSchema`; only `linkDurationDays` (1–7, validated) crosses the wire |
| No indexing | `robots: { index: false }` at root metadata + per-route |
| Upload safety | magic-byte validation, 5 MB photo / 8 MB audio caps, server-minted ids |

## 4. Presentation engine

```
PresentationEngine
├── ThemeCanvas        (lazy skin, paused when scene is inactive)
├── chrome             (progress, back, audio)
├── SceneTransition    (theme transition preset)
└── SceneRenderer
    ├── OpeningScene
    ├── MessageScene   → MessageReveal (theme reveal mode)
    ├── LetterScene    → LetterCard
    ├── EnvelopeScene  → EnvelopeAnimation (5 stages)
    ├── MemoryScene    → MemoryGallery (polaroid | scrapbook | slideshow)
    ├── ClosingScene
    └── ResponseScene  → ResponsePanel
```

`PresentationEngine` exposes a `PresentationApi` through `onApiReady` so the
creator preview can drive it from outside the viewport. The recipient route never
mounts that chrome.

## 5. Non-goals (v1)

Payments, accounts, analytics, server-side response storage, public galleries.
The recipient's answer is never transmitted.

## 6. Deletion lifecycle

Expiry enforcement and data deletion are **separate** concerns, deliberately.

### Access vs. deletion

- **Access** is decided on every read by `isLinkLive(status, expiresAt)`. Nothing
  is scheduled: at the expiry instant the letter stops resolving, the recipient
  sees the generic unavailable page, and `/api/uploads/[id]` refuses the media
  because the owning record is no longer live.
- **Deletion** is physical removal, performed by a worker. It is eventually
  consistent and may lag by up to one scheduled run.

### Upload binding

`UploadAsset` carries `apologyId` and `ownerKeyHash`. `canServeAsset()` allows a
request only when the caller is the owner, or when the owning apology is live.
An asset with no binding fails closed. This closes the gap where a dead link's
photo URLs kept resolving.

Media responses are `Cache-Control: private, no-store`, because authorisation
changes at the expiry instant and a cached copy would outlive the link.

### The worker

`src/lib/lifecycle/purge.ts` — `runPurge()` and `purgeNow()` — is the only
deletion path. The scheduled job and the Manage "Delete now" button both use it.

Sequence per apology:

1. **Identify** — `listExpired(now)` for published records past their window, plus
   any job left by a previous run.
2. **Claim** — a lease (`deletions/<id>.leaseUntil`) is written in a transaction
   (Firestore) or under a per-id mutex (filesystem). A second worker sees a live
   lease and skips.
3. **Manifest** — asset ids come from the record's photos and custom audio, merged
   with ids already recorded on the job, so a retry cannot lose one.
4. **Delete assets** — each `remove()` is idempotent; a missing object is not an
   error.
5. **Verify** — each id is re-checked with `stat()`. A backend that reports
   success but leaves the object behind still fails the step.
6. **Delete the record** — only after storage is verified. Then re-read to confirm
   it is gone.
7. **Tombstone** — `{ apologyId, ownerKeyHash, deletedAt, assetsDeleted, reason }`.
   No names, no messages, no media, no usable token.
8. **Clear the job.**

Failure handling:

- Storage failure → job kept with `lastError`, record **not** deleted, retried next
  run. This is what stops silent orphaning.
- Record deletion failure → job kept, retried.
- Crash mid-run → the lease expires and the next run resumes.
- Repeated runs → idempotent; the second finds nothing.

### Renewal

`publish()` refuses with `DELETED` once a job exists, so a letter cannot be
revived while it is being torn down. A deleted record is gone, so an old token
cannot resurrect it.

### Scheduled configuration

`vercel.json` schedules `/api/cron/purge` hourly (`17 * * * *`). The route
requires `CRON_SECRET`; without it the route returns 503 rather than running
unauthenticated. Vercel sends `Authorization: Bearer $CRON_SECRET`.

### What is not stored in the queue

The job holds an id, asset ids, attempt count, timestamps, a lease and an owner
hash. The owner hash is present only so a retry can still write the tombstone
after the record is gone. It is a SHA-256 of a random key, not the key.

## 7. Security headers

Built once in `src/lib/security/headers.ts` and applied to `/:path*` from
`next.config.ts`, so API routes, 404s and 500s carry the same policy as pages.

| Header | Value | Why |
| --- | --- | --- |
| `Content-Security-Policy` | see below | Blocks injected/external code |
| `X-Frame-Options` | `DENY` | Legacy companion to `frame-ancestors` |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing on uploads |
| `Referrer-Policy` | `no-referrer` | Private tokens live in the URL path |
| `Permissions-Policy` | camera/mic/geo/… disabled | The app needs none |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate window handles |
| `Cross-Origin-Resource-Policy` | `same-origin` | No cross-origin embedding |
| `Strict-Transport-Security` | 2 years, preload | Production only |

CSP: `default-src 'self'` with same-origin scripts/styles/fonts/media/images and
**no third-party origin**. `'unsafe-inline'` is required for Next's inline
bootstrap payload and the theme system's inline custom properties;
`'unsafe-eval'` is added only in development for React Refresh.

If a future feature needs a CDN or an external API, add that origin to the
relevant directive in `headers.ts` — not inline in config — and re-run the
browser compatibility check in `docs/TESTING.md`.

## 8. Failure surfaces

| Surface | File | Behaviour |
| --- | --- | --- |
| Route error | `src/app/error.tsx` | Design-matched page, digest reference only, Try again |
| Root failure | `src/app/global-error.tsx` | Inline-styled fallback with its own `<html>` |
| Unknown / expired / revoked | `src/app/not-found.tsx` | One generic page for every case |
| Slow creator pages | `src/app/manage/loading.tsx` | Skeleton |

**No `loading.tsx` on routes that call `notFound()`.** A `loading.tsx` creates a
Suspense boundary, Next flushes the shell with `200`, and the later `notFound()`
can no longer change the status — a dead link would answer `200`. This was
observed and fixed; the recipient, preview and draft routes therefore resolve
their data before the response starts. The trade-off is deliberate: correct 404
semantics beat a skeleton.

## 9. Legacy records without an expiry

A published document written before expiry became mandatory has no `expiresAt`.
It is:

- **inaccessible** immediately, because `isLinkLive()` requires a valid future
  expiry and `isExpired()` treats a missing value as expired;
- **included in cleanup**, because `listExpired()` filters on `status` and then
  checks the expiry in code, rather than using a range query that would skip
  documents where the field is absent;
- **labelled** `legacy` in its tombstone, so an operator can tell a migration
  sweep from a normal expiry.

`GET /api/cron/purge?dryRun=1` lists what a run would delete, with reasons,
without mutating anything.
