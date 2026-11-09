# Production infrastructure acceptance

Baseline: **`2d0d751`**. The architecture is frozen; this milestone proves the
external contract and nothing else.

**Current status: NOT RUN.** No Neon project, Filebase bucket or `neon` CLI
session exists in this environment. Everything below is a check to perform, not
a result. Provider-managed deletion is **not** operational until V1–V4 pass.

## How to run

```bash
export DATABASE_URL=...            # Neon pooled
export FILEBASE_ACCESS_KEY=...
export FILEBASE_SECRET_KEY=...
export FILEBASE_BUCKET=...
export FILEBASE_ENDPOINT=https://s3.filebase.io
export FILEBASE_REGION=auto
export NEON_FUNCTION_URL=...       # neon functions get cleanup →
export CLEANUP_SECRET=...          # openssl rand -base64 48

./scripts/acceptance/run.sh
```

Writes evidence to `docs/evidence/acceptance-<timestamp>.md`. Every line is
produced by a command that actually ran; the script stops on the first failure.

The suite itself:

```bash
ACCEPTANCE=1 npm run acceptance          # real Neon + real Filebase
npm test                                 # hermetic; skips the suite above
```

## Checks

| # | Check | How it is proven | Status |
| --- | --- | --- | --- |
| V1 | Function Triggers exist on this project | `neon triggers list --output json` returns the `hourly-cleanup` trigger with a `Next Run At` | ⏳ not run |
| V2 | The trigger actually fires | `neon logs query --source function --since 2h` shows a cleanup invocation after the scheduled time | ⏳ not run |
| V3 | Outbound HTTPS to Filebase works from the isolate | acceptance suite `head()` on a real object returns `exists: true` from inside the function's environment; locally it proves credentials + endpoint + region | ⏳ not run |
| V4 | Trigger delivery authenticates | a delivery carrying `x-neon-trigger-invocation-id` matching body `invocation_id` is accepted; a manual call without `x-cleanup-secret` is rejected `401` | ⏳ not run |
| E2E | Real deletion end to end | create → upload → publish → expire → `runCleanup` → object gone from Filebase, row gone from Neon, tombstone written | ⏳ not run |
| RETRY | Retry after a transient failure | first delete call throws `SlowDown`; record and object survive; second run completes | ⏳ not run |
| PRESIGN | Pre-signed media in a browser-equivalent fetch | `fetch(presignGet(key, 60))` → `200` with bytes; a 1-second URL → `403` after expiry | ⏳ not run |
| EVENTUAL | Expired records and objects eventually removed | batch of three expired letters; one cleanup run leaves none in either system | ⏳ not run |
| STRAND | Crash after object deletion cannot strand a job | `finalize` throws after `DeleteObjects`; record and job remain leased; after the lease elapses the next run completes | ✅ hermetic · ⏳ live |

### The stranding check, precisely

The risk: the function deletes Filebase objects, then dies before writing the
Neon rows. If the job were marked completed at that point, the objects would be
gone but the record would remain — and no later run would look at it.

What prevents that, and what the test asserts:

1. `finalize` is the **only** step that writes the tombstone, deletes rows and
   sets `state='completed'`. It runs *after* deletion and verification, in one
   `db.batch`.
2. A crash before it leaves the job `processing` with a live lease. Candidate
   selection includes non-`completed` jobs, so it is not forgotten.
3. Until the lease expires the job is skipped (no double-processing); after it
   expires the next run resumes.
4. Resuming re-deletes the already-missing keys — `NoSuchKey` is success — then
   verifies and finalises.

Proven hermetically in `protocol.test.ts` → “does not strand a job if the run
dies after deleting objects”. The acceptance suite repeats it against real Neon
and real Filebase with a 50 ms lease, so the real integration test proves it too.

## What this milestone does *not* cover

- Trigger **retry** semantics: undocumented by Neon. The design does not depend
  on them; a failed invocation is repaired by the next scheduled run.
- Minimum cron granularity: a 5-field expression is documented, the minimum
  interval is not. Only hourly is assumed.
- Free-plan Capacity-Hour headroom: an estimate until measured in the console.

## Evidence log

Paste each run's file into the PR or issue. A run is only valid if the evidence
file contains the real command output — screenshots and assertions pasted by
hand are not evidence.
