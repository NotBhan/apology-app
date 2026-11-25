# I Miss You Experience + Image Performance Implementation Plan

**Goal:** Implement a browser-side adaptive WebP image optimization and progressive delivery pipeline across all Koi Koi uploads/presentations, and build the complete **I Miss You** (`miss-you`) interactive experience end-to-end.

**Architecture:**
- **Media Optimization & Delivery**: Extend `src/lib/image.ts` with magic-byte sniffing, EXIF-safe decoding via `createImageBitmap({ imageOrientation: "from-image" })`, transparency inspection, bounded adaptive WebP/JPEG/PNG encoding targeting `<= 1600px` and `200-450 KB`, AbortSignal cancellation, progress reporting, and zero-PII compression telemetry. Fix `GET /api/uploads/[assetId]` to use optional `getCreator()` so published experience recipients can view photos without signing in while preserving strict `canServeAsset` enforcement. Add shared `<OptimizedPhoto />` component and session DOM persistence to eliminate redundant image downloads across scenes, slides, and lightboxes. Keep 1:1 asset row mapping with `apology_assets` / `response_assets` (no secondary asset lifecycle).
- **I Miss You Experience**: Register `miss-you` in `src/experiences/types.ts`, `src/experiences/registry.ts`, and `src/experiences/categories.ts` alongside its dedicated Zod schema (`src/experiences/miss-you/schema.ts`), 5 atmospheric visual themes (`src/experiences/miss-you/themes.ts`), and 5-scene interactive recipient experience (`MissYouLetter` + subcomponents) plus dedicated creator workflow (`MissYouEditor`, `/create/miss-you`) reusing Koi Koi's existing auth, draft persistence, Filebase storage, permanent tokens, deletion jobs, and two-way reply system.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, React 19, Tailwind CSS v4, Zod 4, Framer Motion 14, Neon PostgreSQL (JSONB `content`), Filebase S3.

---

### Task 1: Image Optimization Engine & Telemetry (`src/lib/image.ts`)
- Implement magic-byte format detection (`JPEG`, `PNG`, `WebP`, `GIF` [detect animated frames], `HEIC/HEIF`).
- Reject animated GIFs and unsupported HEIC/binary files with actionable user messages rather than degrading animations or uploading unreadable bytes.
- Preserve transparency cleanly (WebP alpha natively; PNG fallback if WebP unsupported and alpha < 255; JPEG fallback otherwise).
- Skip unnecessary recompression for already-small compliant files (`<= 180 KB` and `<= 1600px` long edge), and fall back to original compliant file if compression does not shrink file size.
- Implement bounded adaptive quality loop (`0.78 -> 0.70 -> 0.64 -> 0.60`, max 3 quality steps) + bounded dimension fallback (`1280px`, `1024px`) — max 6 total encode attempts.
- Derive upload filename extension and MIME type strictly from generated `Blob`.
- Capture zero-PII compression diagnostics (`ImageCompressionMetrics`).
- Wire `Extension` alignment into `src/lib/upload.ts`, `CreatorWizardClient.tsx`, `BirthdayEditor.tsx`, `PhotosPanel.tsx`, `QuickReplyModal.tsx`, `ExperienceReplyModal.tsx`.
- Fix `GET /api/uploads/[assetId]/route.ts` to allow unauthenticated recipient reads on live published letters via `getCreator()`.

### Task 2: Progressive Delivery & `<OptimizedPhoto />` Component
- Create `src/components/ui/OptimizedPhoto.tsx` with explicit aspect ratio stability, `loading="eager" | "lazy"`, `fetchPriority="high" | "auto"`, `decoding="async"`, cached-on-mount immediate check, shimmer loading skeleton, and calm error state.
- Upgrade `MemoryGallery.tsx`, `BirthdayPhotoGallery.tsx`, `BirthdayEnvelope.tsx`, `BirthdayMessageCard.tsx`, `ResponseViewClient.tsx`, and `ManageList.tsx` to use `<OptimizedPhoto />` with priority on the first/hero photograph, lazy loading on off-screen photographs, and persistent mounted slide/scene caches to prevent redundant re-downloads when navigating slides/scenes/lightboxes.

### Task 3: I Miss You Module, Schema & Themes (`src/experiences/miss-you/`)
- Update `ExperienceId` in `src/experiences/types.ts` to include `"miss-you"`.
- Author `src/experiences/miss-you/schema.ts` (`MISS_YOU_THEME_IDS`, `MISS_YOU_PHOTO_LAYOUTS`, `missYouPhotoItemSchema`, `normalizeMissYouPhotos`, `missYouContentSchema`).
- Author `src/experiences/miss-you/themes.ts` with 5 distinct high-contrast themes (`dusk-postage`, `midnight-window`, `morning-coffee`, `starlight-distance`, `pressed-violet`).
- Author `src/experiences/miss-you/module.ts` with `missYouExperience` + `missYouReplyConfig`.
- Register in `src/experiences/registry.ts` and promote `"affection"` category in `src/experiences/categories.ts` (`label: "I Miss You"`, `href: "/create/miss-you"`, `status: "implemented"`).

### Task 4: I Miss You Presentation Engine & Components
- Create `src/components/presentation/miss-you/MissYouAtmosphere.tsx` (CSS/SVG ambient layer per theme respecting `prefers-reduced-motion` and tab visibility).
- Create `src/components/presentation/miss-you/MissYouDispatchCard.tsx` (Scene 1 tactile horizon/airmail opening).
- Create `src/components/presentation/miss-you/MissYouDistanceBridge.tsx` (Scene 2 distance constellation + interactive reminders deck).
- Create `src/components/presentation/miss-you/MissYouStationery.tsx` (Scene 3 personal letter reveal).
- Create `src/components/presentation/miss-you/MissYouPhotoGallery.tsx` (Scene 4 keepsake photo gallery with `postcards`, `polaroid`, `strips`, `carousel` + accessible lightbox + `<OptimizedPhoto />` + DOM slide persistence).
- Create `src/components/presentation/MissYouLetter.tsx` orchestrating all 5 scenes (`arrival`, `distance`, `letter`, `memories`, `reunion`) with keyboard navigation, visited-scene DOM caching, and `<QuickReplyModal experienceId="miss-you" />` + `<ExperienceReplyModal />`.

### Task 5: I Miss You Creator Flow & Platform Wiring
- Create `src/components/creator/MissYouEditor.tsx` (4-stage responsive editor, compressed upload telemetry preview, photo captions/reordering, layout selector, live mobile preview, full-screen walkthrough modal, auth state awareness).
- Create `src/app/create/miss-you/page.tsx` with server-side `getCreator()` + `draftId` hydration.
- Wire `miss-you` into:
  - `src/app/create/[draftId]/page.tsx` (redirect to `/create/miss-you?draftId=...`)
  - `src/app/preview/[draftId]/page.tsx` (render Birthday & I Miss You previews cleanly from `/manage`)
  - `src/app/letter/[token]/page.tsx` (render `MissYouLetter`)
  - `src/app/api/drafts/[draftId]/publish/route.ts` (validate module schema cleanly for experience modules)
  - `src/app/create/actions.ts` (`publishDraftAction` handles experience module schemas)
  - `src/components/manage/ManageList.tsx` (Edit routing, metadata summary, Experience Reply badge)
  - `src/app/response/[token]/ResponseViewClient.tsx` & `src/components/response/ExperienceReplyModal.tsx` & `src/lib/api/client.ts`
  - `src/app/page.tsx` & `src/platform/content.ts` (show I Miss You themes cleanly)

### Task 6: Comprehensive Testing, Real-Image Benchmarking, Screenshots & Validation
- Write unit & integration tests covering:
  - `src/lib/image.test.ts` (12 test scenarios from Part C including large JPEG/PNG, alpha PNG, small images, portrait/landscape, wrong MIME, unsupported/animated GIF/HEIC, abort cancellation, failures, metrics).
  - `src/lib/upload-integration.test.ts` (Blob upload MIME/extension integrity, quota enforcement on compressed bytes, reservation cleanup regressions).
  - `src/components/ui/OptimizedPhoto.test.tsx`.
  - `src/experiences/miss-you/schema.test.ts`.
  - `src/components/presentation/MissYouLetter.test.tsx` & `MissYouPhotoGallery.test.tsx`.
  - `src/components/creator/MissYouEditor.test.tsx`.
  - `src/acceptance/miss-you-persistence.integration.test.tsx` (draft -> publish -> public link parity without `sessionStorage`, recipient `/api/uploads/[assetId]` unauthenticated read verification).
- Run real Chromium CDP measurements with synthetic large multi-megabyte smartphone portrait/landscape JPEG/PNG fixtures to measure original bytes vs optimized WebP bytes, reduction %, duration ms, and compare lazy vs eager gallery loading bytes!
- Capture desktop & 360px/390px mobile screenshots of I Miss You creator & published views and inspect them visually.
- Run full `npm run validate` (`eslint`, `tsc --noEmit`, `vitest run`, `next build`).
