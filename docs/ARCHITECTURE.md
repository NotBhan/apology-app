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
