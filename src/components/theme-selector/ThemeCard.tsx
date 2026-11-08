"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import type { ApologyTheme } from "@/types/theme";
import { ThemeCanvas } from "@/components/presentation/ThemeCanvas";
import { themeScopeVars } from "@/lib/theme-vars";
import { cn } from "@/lib/cn";

interface ThemeCardProps {
  theme: ApologyTheme;
  selected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
}

/**
 * Cards show the real skin, not a colour swatch. The skin mounts only when the
 * card scrolls into view, so browsing eight themes does not download eight
 * compositions up front.
 */
export function ThemeCard({ theme, selected, onSelect, onPreview }: ThemeCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "120px" });
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const visible = inView || hovered;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-[22px] border bg-white transition",
        selected
          ? "border-[#8a5bc4] shadow-[0_18px_40px_-26px_rgba(109,63,168,0.9)]"
          : "border-[#e8ddf3] hover:border-[#cdb8e6]",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        aria-pressed={selected}
        className="block w-full text-left"
      >
        <div
          className="relative h-40 w-full overflow-hidden"
          style={{
            ...themeScopeVars(theme),
            background: "var(--t-bg)",
          }}
        >
          {visible ? (
            <div className="pointer-events-none absolute inset-0 scale-[1.02]">
              <ThemeCanvas themeId={theme.id} sceneId="opening" paused={reduce || !visible} />
            </div>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(160deg, ${theme.palette.background}, ${theme.palette.backgroundAlt})` }}
            />
          )}

          <div
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background: `linear-gradient(to top, ${theme.palette.background}, transparent)`,
            }}
          />

          <div className="absolute inset-x-3 bottom-2 flex items-end justify-between">
            <span
              className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              style={{
                background: theme.palette.surface,
                color: theme.palette.text,
              }}
            >
              {theme.category}
            </span>
            {onPreview ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onPreview();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onPreview();
                  }
                }}
                className="rounded-full px-2.5 py-1 text-[0.62rem] font-semibold"
                style={{ background: theme.palette.surface, color: theme.palette.text }}
              >
                Preview
              </span>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[0.95rem] font-semibold text-[#33203f]">{theme.name}</h3>
            <span
              aria-hidden
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border transition",
                selected ? "border-[#8a5bc4] bg-[#8a5bc4]" : "border-[#d8c9e8] bg-white",
              )}
            >
              {selected ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" aria-hidden>
                  <path d="M2 5.2 4 7.2 8 2.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </span>
          </div>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-[#8a7a9c]">{theme.tagline}</p>
        </div>
      </button>

      {selected ? (
        <motion.span
          layoutId="theme-selected-ring"
          className="pointer-events-none absolute inset-0 rounded-[22px] ring-2 ring-[#8a5bc4]/60"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      ) : null}
    </div>
  );
}
