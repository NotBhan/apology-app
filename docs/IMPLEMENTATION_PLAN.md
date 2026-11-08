# Implementation plan & progress

## Phases

| Phase | Scope | State |
| --- | --- | --- |
| 00 | Repository + reference audit | ✅ `docs/REFERENCE_AUDIT.md` |
| 01 | Foundation: Next 16, TS strict, Tailwind v4, contracts, routes | ✅ |
| 02 | Theme infrastructure: registry, 8 themes, selector, preview | ✅ |
| 03 | Sticker infrastructure: registry, SVG/lottie/rive renderers, picker | ✅ |
| 04 | Presentation engine: scenes, transitions, envelope, memory, response | ✅ |
| 05 | Creator workflow: 7-step wizard, starters, customisation | ✅ |
| 06 | Persistence: repository, tokens, publish, revoke, uploads | ✅ |
| 07 | Testing & refinement | ✅ (see `docs/TESTING.md`) |

## Milestones as delivered

### M1 — Contracts before components
Types and Zod schemas were written first and every later module imports them:
`src/types/{theme,sticker,scene,apology}.ts`, `src/lib/validation/apology.ts`.
No module redefines a domain type.

### M2 — Theme registry with lazy skins
`src/themes/registry.ts` splits static data from lazy `skin.tsx` chunks.
Theme cards mount a real skin only when scrolled into view.

### M3 — Sticker registry with lazy art
`loadStickerArt()` caches one pack module per session. The renderer reserves
layout before the chunk arrives.

### M4 — Presentation engine
Engine → transition → renderer → 7 scene components, driven by data only.

### M5 — Creator wizard
7 steps, debounced autosave (900 ms), server actions, validation surfaced inline.

### M6 — Publishing
Publish / revoke / delete, private token route, owner-cookie identity.

### M7 — Validation
`npm run validate` = lint → typecheck → test → build.

## Known limitations

1. **Reference media was unavailable.** See `docs/REFERENCE_AUDIT.md`.
2. **No licensed third-party sticker art.** `bubu-dudu` is an original homage
   pack; no third-party designs are copied.
3. **Filesystem storage is not durable on Vercel.** Set the Firebase env vars
   for production; see `docs/TESTING.md`.
4. **Photo crop is focal-point based**, not freeform cropping. Enough to keep a
   face in frame in every layout, and it cannot produce an invalid image.
5. **No account system.** Access is a browser cookie. Clearing site data loses
   access to drafts — stated in the UI.
6. **Audio is a short synthesised loop**, not a licensed soundtrack.
7. **Recipient responses are never stored.** Intentional; there is no endpoint.
8. **Expiries are enforced on read, not swept.** Nothing deletes an expired
   record or its photos; they simply stop resolving. A scheduled cleanup job is
   the obvious next step.

## Next steps (not in v1)

- Object storage for uploads with signed URLs.
- More themes and packs via the same contracts (no engine changes).
- Optional response sharing by explicit recipient action only.
- Image CDN + AVIF for photos.
