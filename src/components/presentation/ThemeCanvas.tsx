"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ThemeId } from "@/types/theme";
import type { ThemeSkinProps } from "@/themes/types";

/**
 * Each skin is its own chunk. Only the active theme's composition is
 * downloaded, so an eight-theme registry costs one theme in practice.
 */
const SKINS: Record<ThemeId, ComponentType<ThemeSkinProps>> = {
  romantic: dynamic(() => import("@/themes/romantic/skin")),
  friendship: dynamic(() => import("@/themes/friendship/skin")),
  heartfelt: dynamic(() => import("@/themes/heartfelt/skin")),
  midnight: dynamic(() => import("@/themes/midnight/skin")),
  cute: dynamic(() => import("@/themes/cute/skin")),
  regret: dynamic(() => import("@/themes/regret/skin")),
  "fresh-start": dynamic(() => import("@/themes/fresh-start/skin")),
  minimal: dynamic(() => import("@/themes/minimal/skin")),
};

export function ThemeCanvas({ themeId, ...props }: ThemeSkinProps & { themeId: ThemeId }) {
  const Skin = SKINS[themeId] ?? SKINS.romantic;
  return <Skin {...props} />;
}
