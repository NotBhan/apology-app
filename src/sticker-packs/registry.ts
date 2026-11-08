import type { StickerPackId } from "@/types/sticker";
import type { StickerPack, StickerPackArt } from "./types";

import { meta as cats } from "./cats/meta";
import { meta as teddyBears } from "./teddy-bears/meta";
import { meta as bunnies } from "./bunnies/meta";
import { meta as capybaras } from "./capybaras/meta";
import { meta as puppies } from "./puppies/meta";
import { meta as bubuDudu } from "./bubu-dudu/meta";

export const STICKER_PACKS = {
  cats,
  "bubu-dudu": bubuDudu,
  "teddy-bears": teddyBears,
  bunnies,
  capybaras,
  puppies,
} as const satisfies Record<StickerPackId, StickerPack>;

export const STICKER_PACK_LIST = Object.values(STICKER_PACKS);

export function getStickerPack(id: string | undefined): StickerPack {
  if (id && id in STICKER_PACKS) return STICKER_PACKS[id as StickerPackId];
  return STICKER_PACKS.cats;
}

const ART_LOADERS: Record<StickerPackId, () => Promise<{ default: StickerPackArt }>> = {
  cats: () => import("./cats/art"),
  "bubu-dudu": () => import("./bubu-dudu/art"),
  "teddy-bears": () => import("./teddy-bears/art"),
  bunnies: () => import("./bunnies/art"),
  capybaras: () => import("./capybaras/art"),
  puppies: () => import("./puppies/art"),
};

const artCache = new Map<StickerPackId, StickerPackArt>();

export async function loadStickerArt(id: StickerPackId): Promise<StickerPackArt> {
  const cached = artCache.get(id);
  if (cached) return cached;
  const mod = await ART_LOADERS[id]();
  artCache.set(id, mod.default);
  return mod.default;
}

export function cachedStickerArt(id: StickerPackId): StickerPackArt | undefined {
  return artCache.get(id);
}

export { resolveStickerAsset } from "./assets";
