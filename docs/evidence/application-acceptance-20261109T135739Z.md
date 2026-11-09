# Application acceptance — Vercel production

Run at 2026-11-09T13:57:39Z. Every line below was observed in this run; nothing
is inferred from a green build or from a local test.

## Deployment

| Field | Value |
| --- | --- |
| Commit deployed | `54cec442dfd73b1efc899dfe36a5b40696f2ada1` |
| Vercel project | `apology-app-me` (`prj_LyPIZSwJ0gBbtg6HJ9LfZ7hWYs1W`) |
| Plan | hobby |
| Deployment ID | `dpl_8uDsk5tRaUwiFbgRxj1E7EjiLhtK` |
| Deployment URL | `https://apology-app-4mvj94drm-chandrabhans-projects.vercel.app` |
| Production alias | `https://apology-app-me.vercel.app` |
| Git | `NotBhan/apology-app`, production branch `main` |
| Node.js | 26.x |
| Build | pass, 59 s |

No Vercel Cron definitions exist (`crons.definitions: []`).

## Environment variables (names only)

Set for Production: `DATABASE_URL`, `FILEBASE_ACCESS_KEY`,
`FILEBASE_SECRET_KEY`, `FILEBASE_BUCKET`, `FILEBASE_ENDPOINT`,
`FILEBASE_REGION`, `NEXT_PUBLIC_APP_URL`.

Deliberately **not** set in Vercel: `CLEANUP_SECRET` (Neon function only) and
`NEON_FUNCTION_URL` (acceptance harness only).

## Runtime

`GET /api/health` →

```json
{"ok":true,"database":"postgres","storage":"filebase","cleanupSecret":"unconfigured"}
```

The deployed application reached Neon and reported Filebase as configured with
no cleanup secret present.

## Security headers

Observed on `GET /`:

```
content-security-policy: … img-src 'self' data: blob: https://s3.filebase.io;
                         media-src 'self' blob: https://s3.filebase.io;
                         object-src 'none'; frame-ancestors 'none' …
strict-transport-security: max-age=63072000; includeSubDomains; preload
referrer-policy: no-referrer
x-frame-options: DENY
x-content-type-options: nosniff
```

No wildcard was added. The storage origin is present because the variables
existed before the build; `next.config.ts` compiles the policy at build time.

## Creator flow

- `/create` → draft `16cf4684-0116-4829-8fb7-c5bd628e05e1` created; a Neon row
  was required to obtain the id.
- Validation: `Continue` disabled with one name, enabled with both. Same gating
  on the situation step and until all three messages were filled.
- Persistence: after a full page reload the wizard resumed with the situation
  selection and all three messages plus the personal note intact.
- Theme and sticker pack selected (Midnight, Bunnies) and persisted.
- Photo uploaded through the UI (1.90 MiB PNG); the photo item, caption and
  focus controls rendered.
- Preview rendered 9 scenes.
- Publish produced a private recipient link; `/manage` listed the letter.

## Manage flow

- Owner sees the letter; unknown-draft and unknown-asset requests return `404`
  with no CORS headers.
- Revoke: confirmation accepted, then the recipient page returned `404` and
  `/api/letters/<token>` returned `410`; the revoke control disappeared.
- Delete now: apology status became `deleted`, one `deletion_jobs` row was
  created with a single object key, asset still `uploaded` — physical deletion
  deferred, as designed.

## Recipient flow

Opened in a **separate browser session with no creator cookie**.

- Envelope gate: "Will you listen, Test Recipient?" with "Hear me out".
- 9 scenes, counter `01/09` … `09/09`; letter scene rendered the personal note;
  envelope scene advanced only after "Break the seal"; memory scene `07/09`
  rendered the uploaded photo.
- Image decoded at its true `900x700`.
- No console errors in any stage observed.
- Revoked token afterwards: page `404`, API `410`.

## Browser media retrieval (the gate that server-side fetch could not satisfy)

- Page references `https://apology-app-me.vercel.app/api/uploads/<assetId>`
  (same origin) — no bucket URL is exposed to the document.
- That route answered `307` with `Cache-Control: private, no-store` and
  redirected to `https://s3.filebase.io/apology-app/apologies/<id>/<key>.png`
  carrying `X-Amz-Expires=60`; the browser received `200` and decoded the image.
- Bucket privacy: anonymous list and anonymous object fetch both `403`.
- Signing: object key is server-generated under `apologies/<apologyId>/`.
- Expiry: a 1-second presigned URL opened in the browser 8 seconds later was
  rejected with `<Code>AccessDenied</Code>`. A previously valid URL for the
  now-deleted object was likewise rejected.

## Full lifecycle

1. Created, uploaded, published (3-day link), opened as recipient.
2. Revoked → recipient access stopped immediately.
3. Deleted via the manage UI → deletion job queued.
4. Invoked the deployed cleanup function through its operator path:
   `{"ok":true,"scanned":1,"deleted":1,"retried":0,"skipped":0}`.
5. Post-run: apology rows `0`, asset rows `0`, job `completed`, Filebase objects
   under that prefix `0`, tombstone present with `reason: manual`,
   `assets_deleted: 1`.
6. Function log: `invoke begin` 13:54:29Z, `invoke end` 13:54:31Z.

The tombstone stores `apology_id`, `owner_key_hash`, `deleted_at`,
`assets_deleted`, `reason` — no names, messages or media.

## Security checks performed

| Check | Result |
| --- | --- |
| Unknown asset id, no cookie | `404` |
| Unknown draft id, no cookie | `404` |
| Foreign `Origin` on letter API | no `access-control-*` headers |
| Letter page caching | `private, no-cache, no-store, must-revalidate` |
| Health endpoint disclosure | booleans only, no values |
| Anonymous bucket list / object | `403` / `403` |
| Revoked token | page `404`, API `410` |
| Firebase references | none in source |
| Filesystem fallback | none in server code |

## Not verified

- **Renewal.** The control appears only for an expired letter, and there is no
  supported way to expire one early. Renewal remains covered by unit tests, not
  by a live production action. Its "old link invalidated" claim is therefore
  unverified in production.
- **Oversized upload rejection at the platform edge.** Ceilings are now 4 MiB
  with 64 KiB headroom and a regression test, but no live upload above 4.5 MB
  was attempted, so the `413 FUNCTION_PAYLOAD_TOO_LARGE` path was not exercised.
- **Custom audio.** Only the photo path was exercised; no audio file was
  uploaded.
- **Mobile viewports.** Browser checks ran at desktop width only.
- **Scheduled deletion after this run.** The 12:17Z delivery proved the schedule
  fires and an earlier run proved an isolate deletion, but this specific letter
  was removed by an operator invocation rather than by the timer.

## Status

- Infrastructure: OPERATIONAL
- Application deployment: DEPLOYED
- Browser-level acceptance: PASSED for the paths exercised above, with the four
  gaps listed under "Not verified".
