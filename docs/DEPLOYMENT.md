# Deployment

Neon + Filebase + Vercel Hobby. No Firebase, no Vercel Cron, no external cron
service, no worker.

Marker key: ✅ verified here · ⚠️ verified only against doubles · ⏳ requires
real credentials, **not verified**.

The acceptance matrix — V1–V4, end-to-end deletion, retry, pre-signed retrieval,
eventual removal and the crash-stranding check — lives in
[`ACCEPTANCE.md`](ACCEPTANCE.md). Run `./scripts/acceptance/run.sh` to produce an
evidence file.

## 0. Required configuration

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** connection string (`-pooler`) |
| `FILEBASE_ACCESS_KEY` | uploads | Filebase access key |
| `FILEBASE_SECRET_KEY` | uploads | Filebase secret |
| `FILEBASE_BUCKET` | uploads | must stay private |
| `FILEBASE_ENDPOINT` | no | default `https://s3.filebase.io` |
| `FILEBASE_REGION` | no | default `auto`; wrong region = `SignatureDoesNotMatch` |
| `NEXT_PUBLIC_APP_URL` | no | canonical origin for links |
| `CLEANUP_SECRET` | no | ≥32 chars; **only** for the cleanup function's manual path |

There is no filesystem fallback: without `DATABASE_URL` the data layer throws.

## 1. Neon

1. Create a project (Free plan is enough: 1 GB Postgres, 5 GB egress).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Run migrations:
   ```bash
   npm run db:generate   # already committed; only after schema changes
   npm run db:migrate
   ```
4. ✅ Schema verified by generated SQL: `RESTRICT` FK on assets, no FK on
   `deletion_jobs`, partial index on `expires_at`, CHECK constraints on status,
   duration and "published completeness".

## 2. Filebase

1. Create a bucket. **Keep it private.** Filebase has no bucket policy API and
   object ACLs are not supported, so the bucket ACL is the only switch.
2. Create an access key. Put it in `FILEBASE_ACCESS_KEY` / `FILEBASE_SECRET_KEY`.
3. Do **not** attempt to configure a lifecycle rule: `PutBucketLifecycle*`
   returns 501. Expiry is orchestrated by Neon, not by the bucket.

## 3. Cleanup function (provider-managed deletion)

```bash
npm i -g neon-cli        # ≥ 4.21 for triggers
neon link                # select the project/branch
neon deploy --env .env.production
```

`neon.ts` declares `functions.cleanup` and a `schedule` trigger at
`17 * * * *`. `DATABASE_URL` is injected by Neon; the `FILEBASE_*` values and
`CLEANUP_SECRET` are declared in `neon.ts` and resolved at deploy time.

### Verification, and what is *not* verified

| # | Check | Command | Status |
| --- | --- | --- | --- |
| V1 | Triggers available on this project | `neon deploy` must not 404 `function triggers not available for this project` | ⏳ |
| V2 | Trigger fires on schedule | `neon triggers list --output json` → `Next Run At`; `neon logs query --source function --since 1h` | ⏳ |
| V3 | Outbound to Filebase works from the isolate | logs show `HeadObject` 200, not `ENOTFOUND` / `SignatureDoesNotMatch` | ⏳ |
| V4 | Trigger auth accepted | delivery carries `x-neon-trigger-invocation-id` matching body `invocation_id` | ⏳ |
| V5 | Retry semantics | undocumented; the design does not depend on them | ⏳ |
| V6 | Cron granularity | `0 * * * *` class expressions only; minute-level is not assumed | ⏳ |

**Do not describe provider-managed deletion as operational until V1–V4 pass.**
Until then the accurate statement is: access stops at expiry, and physical
deletion depends on the Neon trigger firing.

### Manual invocation (operator)

```bash
curl -X POST "$NEON_FUNCTION_URL" -H "x-cleanup-secret: $CLEANUP_SECRET"
```

The trigger path needs no secret; a client-supplied `x-neon-*` header is stripped
by Neon's proxy, so it cannot be forged.

## 4. Vercel

- Set all environment variables in the project.
- Deploy. No cron configuration is needed or present.
- Confirm `GET /api/health` returns
  `{"ok":true,"database":"postgres","storage":"filebase",...}`.

## 5. Post-deploy smoke test

```bash
curl -s https://your-domain/api/health
curl -sI https://your-domain/ | grep -iE "content-security|strict-transport"
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain/letter/AAAAAAAAAAAAAAAAAAAAAAAA  # 404
```

Then: create a letter, upload a photo, publish, open the link **on another
device** (proves Filebase persistence and pre-signing), expire it, and confirm
both the letter and the image URL return 404 immediately.

## 6. Free-tier limits worth knowing

| Resource | Free allowance |
| --- | --- |
| Neon Postgres storage | 1 GB/project (20 GB/account) |
| Neon egress | 5 GB/project/month |
| Neon Functions | 10 active + 400 waiting Capacity-Hours, 1 M invocations/project/month |
| Filebase | plan-dependent; object storage billed by volume |

An hourly cleanup invocation that finds nothing to do is far below the Function
allowance, but this is an estimate until measured in the console.
