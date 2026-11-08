import type { ThemeId } from "@/types/theme";
import type { ComponentType } from "react";
import type { ThemeSkin } from "./types";

import { theme as romantic } from "./romantic/theme";
import { theme as friendship } from "./friendship/theme";
import { theme as heartfelt } from "./heartfelt/theme";
import { theme as midnight } from "./midnight/theme";
import { theme as cute } from "./cute/theme";
import { theme as regret } from "./regret/theme";
import { theme as freshStart } from "./fresh-start/theme";
import { theme as minimal } from "./minimal/theme";

export const THEMES = {
  romantic,
  friendship,
  heartfelt,
  midnight,
  cute,
  regret,
  "fresh-start": freshStart,
  minimal,
} as const satisfies Record<ThemeId, unknown>;

export const THEME_LIST = Object.values(THEMES);

export function getTheme(id: string | undefined): (typeof THEMES)[ThemeId] {
  if (id && id in THEMES) return THEMES[id as ThemeId];
  return THEMES.romantic;
}

/**
 * Skins are lazy so the landing page and creator wizard never download eight
 * full theme compositions at once.
 */
const SKIN_LOADERS: Record<ThemeId, () => Promise<{ default: ThemeSkin }>> = {
  romantic: () => import("./romantic/skin"),
  friendship: () => import("./friendship/skin"),
  heartfelt: () => import("./heartfelt/skin"),
  midnight: () => import("./midnight/skin"),
  cute: () => import("./cute/skin"),
  regret: () => import("./regret/skin"),
  "fresh-start": () => import("./fresh-start/skin"),
  minimal: () => import("./minimal/skin"),
};

const skinCache = new Map<ThemeId, ThemeSkin>();

/** Only call from client components. */
export function loadThemeSkin(id: ThemeId): Promise<{ default: ThemeSkin }> {
  return SKIN_LOADERS[id]();
}

export function cachedThemeSkin(id: ThemeId): ThemeSkin | undefined {
  return skinCache.get(id);
}

export function cacheThemeSkin(id: ThemeId, skin: ThemeSkin) {
  skinCache.set(id, skin);
}

export type AnyTheme = (typeof THEMES)[ThemeId];
export type { ComponentType };
