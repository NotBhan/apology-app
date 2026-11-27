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

- Published links are **permanent**. `status === 'published'` is the whole
  liveness rule; there is no TTL, no `expiresAt` gate and no expiry sweep.
- `isLinkLive(status)` takes no expiry argument on purpose. Never reintroduce
  one, and never treat a missing expiry as "dead".
- Re-publishing an already-published record must keep the token it issued, so a
  link that was already sent keeps working. Only a revoked record mints a new one.
- Revoking or deleting is the only way to take a link out of service.

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

## Legacy records

- A published record with no `expires_at` is **live**, not dead. Permanence is
  the current model, so a missing expiry is the normal state.
- Rows written before the permanent-link migration may still carry an
  `expires_at`; it is ignored on read and never selected by the cleanup worker.
- `apologies_published_complete` requires `published_at` and
  `private_token_hash`, not an expiry.

## No Firebase, no cron

- There is no Firebase SDK, no Firestore, no Vercel Cron and no `/api/cron/*`.
  Do not reintroduce a scheduled route, a timer or a background worker in the
  app. Physical deletion belongs to the Neon cleanup function.
- Filebase cannot expire objects (lifecycle config is 501). Never claim native
  bucket expiry.

## Upload invariant

- `apology_assets` is written as `pending` **before** `PutObject`. Never upload
  an object whose key is not already a row: deletion snapshots rows, so an
  un-reserved object can be orphaned forever.
- Upload completion is conditional. If it reports zero rows, delete the object
  you just wrote and return 409 — do not attach it.

## Deletion lifecycle

- Access and deletion are separate responsibilities. Access stops from
  `isLinkLive()`; physical removal is the purge worker.
- `src/lib/lifecycle/protocol.ts` is the only deletion path. Manual delete and
  the scheduled worker both call it — never delete a record directly.
- Only a durable `deletion_jobs` row makes a record a candidate. There is no
  expiry sweep: a live link can never be selected for deletion.
- Order is fixed: **assets first, then the record**. A record pointing at
  missing photos is worse than a leftover file.
- Every step is idempotent and the job lease prevents concurrent workers from
  double-processing. A failed storage delete keeps the job for retry.
- The deletion job holds ids and an owner hash only. Never add names, messages
  or media to it.
- Uploads are bound to `apologyId` + `ownerKeyHash`. Media access is decided by
  `canServeAsset()` — do not bypass it with a bare id lookup.

## Security and failure surfaces

- Security headers live in `src/lib/security/headers.ts` and are applied from
  `next.config.ts` to every path. Never add an inline header in a route.
- Adding an external origin to the CSP means editing that module and re-running
  the browser compatibility check. No third-party origin is currently needed.
- Never add `loading.tsx` to a route that calls `notFound()`: the framed shell
  flushes with 200 and the 404 status is lost.
- Error boundaries show a digest only. Never render `error.message` — it can
  contain storage paths, database operations or letter fragments.

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
- No Unicode emoji in source. Controls use `@/components/ui/icons`; storytelling
  uses sticker packs; decoration belongs to theme skins. The registry in
  `src/lib/design/symbols.ts` is the reference, and a test enforces the ban.
- Recipient responses are never transmitted. Do not add an endpoint for them.

## Validation policy (changed-file-first, mandatory DB safety)

These rules take precedence over generic instructions to run `npm run validate` after every change.

### Lint

- For isolated changes, run ESLint only on edited TypeScript/TSX files:
  `npx eslint <edited files...>`
- Preserve existing ESLint rules and configuration; do not run full-repo lint for isolated presentation changes.

### Tests

- Run directly relevant tests for edited components/behavior plus affected dependent tests when shared components or contracts change.
- Do not run the entire test suite automatically for isolated UI edits, and never delete or weaken existing tests to make edits pass.

### Typecheck and build

- Run `npm run typecheck` when changes affect shared interfaces, schemas, module registration, API contracts, persistence, routing, or shared component contracts.
- Run `npm run build` when changes affect routing, module integration, or production compilation.

### Database safety — mandatory

- Never use `DATABASE_URL` as a test database fallback or target in tests.
- Destructive integration suites require an explicitly configured isolated `TEST_DATABASE_URL` (distinct from `DATABASE_URL`) and must verify connected database identity (`verifyConnectedTestDatabaseIdentity`) before any `DELETE` or fixture setup.
- Infrastructure acceptance (`src/acceptance/infrastructure.test.ts`) requires both `ACCEPTANCE=1` and isolated `TEST_DATABASE_URL` + `FILEBASE_TEST_BUCKET` (never `FILEBASE_BUCKET`).
- Missing isolated test configuration must skip or fail safely without writing to production Neon or Filebase.
- Never run cleanup workers or destructive tests against production.

## Responsive checks

Mobile checks at 360 px and 390 px: no horizontal overflow, no console errors.
