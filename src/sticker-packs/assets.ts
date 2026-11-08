import type { StickerDefinition, StickerFormat } from "@/types/sticker";
import { CHARACTER_STATES } from "@/types/sticker";
import { STICKER_PACKS } from "./registry";

const EXTENSIONS: Record<Exclude<StickerFormat, "svg">, string> = {
  rive: "riv",
  lottie: "json",
  webp: "webp",
  apng: "png",
};

/**
 * Resolves a sticker definition to a loadable URL for file-backed formats.
 * Original vector packs return `undefined` and are rendered by React art.
 * Missing files are a first-class case: the renderer falls back to the pack's
 * idle art instead of showing a broken image.
 */
export function resolveStickerAsset(
  definition: Pick<StickerDefinition, "packId" | "format" | "source" | "defaultState">,
): string | undefined {
  if (definition.format === "svg") return undefined;
  const state = definition.defaultState ?? "idle";
  if (!CHARACTER_STATES.includes(state)) return undefined;
  const ext = EXTENSIONS[definition.format];
  return `/stickers/${definition.packId}/${definition.source}.${ext}`;
}

export function listStickerDefinitions(): StickerDefinition[] {
  return Object.values(STICKER_PACKS).flatMap((pack) =>
    pack.states.map<StickerDefinition>((state) => ({
      id: `${pack.id}:${state}`,
      packId: pack.id,
      label: `${pack.characterName} — ${state}`,
      category: state === "celebrate" ? "celebration" : "character",
      format: "svg",
      source: state,
      availableStates: pack.states,
      defaultState: state,
      loop: state === "idle" || state === "blink",
      aspect: 1,
    })),
  );
}
