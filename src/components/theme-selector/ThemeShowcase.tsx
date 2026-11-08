"use client";

import { THEME_LIST } from "@/themes/registry";
import { ThemeCard } from "@/components/theme-selector/ThemeCard";

export function ThemeShowcase() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {THEME_LIST.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          selected={false}
          onSelect={() => undefined}
        />
      ))}
    </div>
  );
}
