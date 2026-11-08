"use client";

import { useState } from "react";
import type { ApologyTheme } from "@/types/theme";
import { contrastRatio, readableTextOn } from "@/lib/theme-vars";
import { cn } from "@/lib/cn";

type ColorKey = "background" | "primary" | "secondary" | "accent";

interface ColorsPanelProps {
  theme: ApologyTheme;
  value: Partial<Record<ColorKey, string>>;
  onChange: (value: Partial<Record<ColorKey, string>>) => void;
}

const FIELDS: { key: ColorKey; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "The page behind everything" },
  { key: "primary", label: "Primary", hint: "Headings and main buttons" },
  { key: "secondary", label: "Secondary", hint: "Soft accents and washes" },
  { key: "accent", label: "Accent", hint: "Small highlights" },
];

export function ColorsPanel({ theme, value, onChange }: ColorsPanelProps) {
  const [warning, setWarning] = useState<string | null>(null);

  const effective = (key: ColorKey) => value[key] ?? theme.palette[key === "background" ? "background" : key];

  function setColor(key: ColorKey, next: string | undefined) {
    const updated = { ...value, [key]: next };
    if (!next) delete updated[key];

    if (key === "background" && next) {
      const text = readableTextOn(next, theme.palette.text, "#fffaf3");
      const ratio = contrastRatio(next, text);
      if (ratio < 4.5) {
        setWarning("That background is hard to read against the text. Try a lighter or darker shade.");
      } else {
        setWarning(null);
      }
    } else {
      setWarning(null);
    }

    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ece2f6] bg-[#fbf8ff] p-3.5">
        <p className="text-[0.72rem] text-[#6b5580]">
          Colours adjust the theme you picked. Scene structure and motion stay as designed so
          nothing breaks on a small screen.
        </p>
      </div>

      <div className="space-y-3">
        {FIELDS.map((field) => {
          const current = effective(field.key);
          const overridden = Boolean(value[field.key]);
          return (
            <div
              key={field.key}
              className="flex items-center gap-3 rounded-2xl border border-[#ece2f6] bg-white px-3.5 py-3"
            >
              <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-black/10">
                <span className="absolute inset-0" style={{ background: current }} />
                <input
                  type="color"
                  value={current}
                  onChange={(event) => setColor(field.key, event.target.value)}
                  aria-label={`${field.label} colour`}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>

              <div className="min-w-0 flex-1">
                <p className="text-[0.82rem] font-semibold text-[#33203f]">{field.label}</p>
                <p className="truncate text-[0.68rem] text-[#8a7a9c]">
                  {field.hint} · <span className="uppercase">{current}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setColor(field.key, overridden ? undefined : theme.palette[field.key])}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.66rem] font-semibold transition",
                  overridden
                    ? "bg-[#f2ecfa] text-[#5b3f7d]"
                    : "text-[#b3a5c2]",
                )}
                disabled={!overridden}
              >
                {overridden ? "Reset" : "Default"}
              </button>
            </div>
          );
        })}
      </div>

      {warning ? (
        <p className="rounded-xl bg-[#fff7ed] px-3 py-2 text-[0.72rem] text-[#9a3412]">{warning}</p>
      ) : null}

      <button
        type="button"
        onClick={() => {
          onChange({});
          setWarning(null);
        }}
        className="w-full rounded-full border border-[#e3d7ef] px-4 py-2 text-[0.78rem] font-semibold text-[#5b3f7d]"
      >
        Reset all colours
      </button>
    </div>
  );
}
