import type { ApologyCustomization } from "@/types/apology";
import type { ApologyTheme } from "@/types/theme";
import { getTrack } from "@/content/tracks";

/**
 * Resolves the audio the recipient should hear.
 * `none` always wins; a custom upload wins over the theme default.
 */
export function resolveAudioSrc(
  theme: ApologyTheme,
  customization: ApologyCustomization,
): string | undefined {
  const audio = customization.audio;
  if (audio.source === "none") return undefined;
  if (audio.source === "custom") {
    if (audio.assetId) return `/api/uploads/${encodeURIComponent(audio.assetId)}`;
    if (audio.trackId) return getTrack(audio.trackId)?.src;
    return undefined;
  }
  return getTrack(theme.defaultMusic)?.src;
}

export function resolveVolume(customization: ApologyCustomization): number {
  const volume = customization.audio.volume;
  if (typeof volume !== "number" || Number.isNaN(volume)) return 0.55;
  return Math.min(1, Math.max(0, volume));
}
