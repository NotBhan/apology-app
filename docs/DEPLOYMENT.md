# Deployment verification

What to check before pointing a real domain at this app, and what has actually
been verified versus what needs the real project.

Legend: ✅ verified here · ⚠️ verified against emulators only · ⏳ requires your
Firebase project / hosting account.

## 0. Required external configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | production | Firestore + Storage project |
| `FIREBASE_CLIENT_EMAIL` | production | Service-account identity |
| `FIREBASE_PRIVATE_KEY` | production | Service-account key (`\n` escaped) |
| `FIREBASE_STORAGE_BUCKET` | optional | Defaults to `<projectId>.firebasestorage.app` |
| `CRON_SECRET` | **production** | ≥16 chars. Without it `/api/cron/purge` returns 503 and nothing is ever deleted |

Generate the secret with `openssl rand -base64 32`. `.env.example` lists the
same set.

Without the Firebase trio the app runs on the local filesystem. That is fine for
development and for a single long-lived Node host, and **wrong** on Vercel:
records would survive in `.data` only until the next deployment.

## 1. Security headers — ✅ verified

Checked against a production build (`npm run build && npm start`) on every route
shape:

| Route | Status | CSP | Referrer | nosniff | X-Frame | HSTS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/create` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/privacy` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/letter/[token]` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/create/[draftId]` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/preview/[draftId]` | 200 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/does-not-exist` | 404 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/drafts/<bad-id>` | 404 | ✅ | ✅ | ✅ | ✅ | ✅ |
| thrown render error | 500 | ✅ | ✅ | ✅ | ✅ | ✅ |

CSP compatibility was checked in Chromium across landing, creator, privacy,
recipient, preview, 404 and unknown-token routes: **0 "Refused to…" violations,
0 console errors, fonts loaded (3 families)**.

The policy allows no third-party origin. Fonts are self-hosted by `next/font`,
audio and uploads are same-origin, and Firebase Admin never runs in the browser,
so no Firebase domain appears in `connect-src`.

```bash
curl -sI https://your-domain/ | grep -iE "content-security|x-frame|referrer|permissions|strict-transport"
```

## 2. Firebase Admin + Firestore + Storage — ⚠️ emulator only

There are no service-account credentials in this environment, so the managed
services could not be exercised. What *was* run is the real Admin SDK, real
queries and real object storage against the official emulators:

```bash
npx firebase emulators:exec --only firestore,storage --project demo-apology \
  "npm run test:firebase"
```

Result: **5/5 passed**. To repeat against the real project:

1. Create a service account with *Cloud Datastore User* and *Storage Object
   Admin*.
2. Set the four environment variables.
3. `GET /api/health` must return `{"storage":"firestore","uploads":"firebase","rateLimit":"firestore"}`.
4. Publish a letter with a photo, open it on a second device, confirm the image
   renders (this is the cross-instance persistence check).
5. Delete the letter, confirm the object disappears from the bucket.

## 3. Upload persistence across instances — ⏳

The filesystem backend cannot satisfy this, which is the reason the Storage
adapter exists. Verify by publishing on one instance and loading the letter
against a second instance (`vercel deploy` twice, or two Node processes behind a
load balancer). Failure looks like: the letter renders, the images 404.

## 4. Media authorization — ✅ verified locally

| Check | Expected |
| --- | --- |
| Live letter, anonymous request to `/api/uploads/<id>` | 200 |
| Same URL after expiry | **404** |
| Same URL after revoke | **404** |
| Owner with cookie, before publishing | 200 |
| Asset with no `apologyId` binding | 404 (fails closed) |
| Response headers | `Cache-Control: private, no-store` |

## 5. Cron authentication — ✅ verified

| Request | Result |
| --- | --- |
| No `Authorization` header | 404 |
| Wrong bearer token | 404 |
| Correct `Bearer $CRON_SECRET` | 200 with a report |
| `CRON_SECRET` unset | 503 |
| `?dryRun=1` | candidates only, no mutation |

## 6. Scheduled purge — ⏳ (route ✅, schedule ⏳)

`vercel.json` schedules `/api/cron/purge` at `17 * * * *`. Vercel sends
`Authorization: Bearer $CRON_SECRET` automatically.

After deploying, confirm a real firing:

1. Publish a letter with a 1-day window.
2. Move its `expiresAt` into the past in the Firestore console.
3. Call the endpoint once manually and compare with the scheduled run in the
   function logs.

`?dryRun=1` is the safe way to see what a run would touch.

## 7. Deletion — ✅ verified (emulator + filesystem)

Verified: apology document deleted, upload metadata deleted, Storage objects
deleted, token stops resolving, tombstone written, second run is a no-op.

**Bug already found this way:** `getDb()` called `settings()` on every request;
Firestore permits it once per instance, so the second request in a process would
have thrown. Fixed by memoising the handle. The filesystem backend could never
have surfaced it.

## 8. Retry behaviour — ✅ verified (unit)

A failed storage delete keeps the job, leaves the record intact and is retried on
the next run. A backend that reports success but leaves the object is caught by
the post-delete `stat()` check.

## 9. Rate limiting — ✅ verified locally

| Endpoint | Limit |
| --- | --- |
| `POST /api/drafts` | 10 / hour / IP |
| `POST /api/uploads` | 30 / hour / IP |
| `GET /api/uploads/[id]` | 600 / 10 min / IP |
| `GET /api/letters/[token]` | 120 / 10 min / IP |
| publish / revoke | 30 / hour / IP |

Backend is Firestore in production and per-process memory locally, which is why
the Firestore backend matters on serverless.

## 10. Post-deploy smoke test

```bash
curl -s https://your-domain/api/health
curl -sI https://your-domain/ | grep -i strict-transport
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain/letter/AAAAAAAAAAAAAAAAAAAAAAAA   # 404
```

Then create, publish and open a letter with one photo on a phone.
