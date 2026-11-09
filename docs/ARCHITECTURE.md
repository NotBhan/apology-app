# Architecture

## 1. Shape

```
Browser ──► Next.js App Router (RSC) ──► route handlers / server actions
                                              │
                        ┌─────────────────────┴─────────────────────┐
                        ▼                                           ▼
                 Neon PostgreSQL                              Filebase (S3)
                 apologies, assets,                           private bucket
                 deletion ledger, tombstones,                 apologies/{id}/{random}
                 rate limits
                        ▲
                        │ schedule trigger
                 ┌──────┴───────────────┐
                 │ Neon Function        │── DeleteObjects ──► Filebase
                 │ `cleanup` (Node 24)  │
                 └──────────────────────┘
```

The application creates, validates and presents apologies. It never schedules or
performs physical cleanup. **Neon hosts the cleanup orchestration; Filebase
performs the physical deletion.** This is not Filebase lifecycle expiry —
Filebase returns 501 for `PutBucketLifecycleConfiguration`, so no bucket TTL
exists or is configured.

## 2. Decisions

### AD-01 — Neon over Firestore

Relational data with explicit constraints. `apologies.status`, duration bounds
and "published implies expires_at + published_at + token hash" are CHECK
constraints, so an invalid row cannot be written even by a build that forgets to
validate.

### AD-02 — `neon-http`, therefore no interactive transactions

`drizzle-orm/neon-http` opens no session. Every mutation is a single statement or
a `db.batch`. That is a constraint, not an accident: it forces the deletion
intent and the renewal guard to be expressed as one atomic statement each,
rather than as multi-round-trip logic that could interleave.

**No database transaction is held across a Filebase call.**

### AD-03 — Upload reservation precedes the object

`apology_assets` rows are written with `state='pending'` and a server-generated
`object_key` *before* `PutObject`. Deletion intent snapshots `apology_assets`
including pending rows, so every object that can ever exist is already inside
`job.object_keys`. Orphaning is impossible by construction, not by timing.

Completion is conditional (`state='pending' AND apology editable AND no job`).
Zero rows means deletion started mid-upload: the object just written is deleted,
the row marked `failed`, and the client gets `409`.

### AD-04 — Token hashing, and what it costs

Only `sha256(token)` is stored. A database read therefore cannot produce a
working link. The cost is that a token cannot be recovered, so **renewal mints a
new link**: the previous URL stops working when a letter is republished. The
Manage page surfaces the new URL rather than pretending the old one survived.

### AD-05 — Media is authorised, then redirected

`/api/uploads/[assetId]` resolves the asset row, checks the owning apology's
liveness (`canServeAsset`), and only then issues a **60-second** pre-signed GET
with a `307`. Responses are `private, no-store` because authorisation changes at
the expiry instant.

A leaked object key is useless: the key never appears in a URL the browser keeps,
and the asset id alone still requires a live letter.

### AD-06 — Deletion is a durable ledger, not a queue

`deletion_jobs` is the source of truth for what must be deleted. It is not a
foreign key to `apologies`, so it survives the row it describes and can finish a
crashed run. It stores ids, keys, an attempt count, a lease and a sanitised
error — never names, messages or media.

## 3. Deletion lifecycle

1. **Intent** (one CTE): lock the apology row `FOR UPDATE` → aggregate
   `object_key` → upsert the job (union with the previous snapshot; a `completed`
   job is never reopened) → mark `status='deleted'` **only for ids the upsert
   returned**.
2. **Claim**: `lease_until` compare-and-set. Zero rows means another worker owns
   it.
3. **Defer / reap**: a `pending` reservation younger than **30 minutes** defers
   finalisation (a `PutObject` may still land). Older reservations are abandoned:
   their objects are deleted and the rows marked `failed`.
4. **Delete**: `DeleteObjects` in batches of ≤1000. A missing key is success; any
   other per-key error fails the step.
5. **Verify**: `HeadObject` every key. A survivor fails the step, even if the
   delete response claimed success.
6. **Finalise** (`db.batch`): delete assets → delete apology → tombstone →
   `state='completed'`.

Failure at 4–6 records a sanitised error, leaves the row and the tombstone
untouched, and restores no access. The next scheduled run retries because
candidate selection includes `failed` jobs.

## 4. Expiry

`expires_at` is computed server-side at publish (1–7 days, default 3) and is
absent from `draftPayloadSchema`. Access is enforced on every read by
`isLinkLive()`; physical deletion is a separate, eventual process. An expired,
revoked, deleted or unknown token all produce the same 404.

## 5. Security

| Property | Mechanism |
| --- | --- |
| Creator identity | httpOnly cookie → sha256 stored as `owner_key_hash` |
| Link token | 32 random bytes; only the hash stored |
| Recipient payload | `toPublished()` projection; no token, no owner hash |
| Media | asset row → owning apology → liveness → 60 s presigned 307 |
| Storage credentials | server-only; never `NEXT_PUBLIC_`; never ambient `AWS_*` |
| Trigger auth | `x-neon-trigger-invocation-id` provenance via `parseTriggerDelivery` |
| Manual cleanup | `x-cleanup-secret`, `timingSafeEqual`, checked before any work |
| Headers | one policy for `/:path*`; storage origin added to `img-src`/`media-src` |
| Rate limits | Postgres fixed-window counters, shared across instances |

## 6. Failure surfaces

`error.tsx` shows a digest only. `global-error.tsx` supplies its own document.
`not-found.tsx` is uniform for unknown, expired, revoked and deleted links.

**No `loading.tsx` on a route that can fail before rendering** (a `notFound()`, or a
data-layer throw such as missing configuration). The shell flushes with `200`
and the real status is lost, so a misconfigured deploy would look healthy.
