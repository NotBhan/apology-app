"use client";

import { useState } from "react";
import type { ApologyTheme } from "@/types/theme";
import { contrastRatio, readableTextOn } from "@/lib/theme-vars";
import { cn } from "@/lib/cn";

type ColorKey = "background" | "primary" | "secondary" | "accent" | "text" | "surface";

interface ColorsPanelProps {
  theme: ApologyTheme;
  value: Partial<Record<ColorKey, string>>;
  onChange: (value: Partial<Record<ColorKey, string>>) => void;
}

const FIELDS: { key: ColorKey; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "The page behind everything" },
  { key: "surface", label: "Card surface", hint: "Message cards and stationery" },
  { key: "text", label: "Text ink", hint: "Main body copy" },
  { key: "primary", label: "Primary", hint: "Headings and main buttons" },
  { key: "secondary", label: "Secondary", hint: "Soft accents and washes" },
  { key: "accent", label: "Accent", hint: "Small highlights" },
];

const CURATED_PRESETS: {
  label: string;
  colors: Partial<Record<ColorKey, string>>;
}[] = [
  { label: "Theme default", colors: {} },
  {
    label: "Candlelit paper",
    colors: {
      background: "#fbf5ea",
      surface: "#fffdf8",
      text: "#2c1e16",
      primary: "#9b3d48",
      secondary: "#d8b496",
      accent: "#b57238",
    },
  },
  {
    label: "Twilight ink",
    colors: {
      background: "#16192c",
      surface: "#222742",
      text: "#f4f2fb",
      primary: "#c7b8ff",
      secondary: "#8c9ce8",
      accent: "#f0c97a",
    },
  },
  {
    label: "Soft sage",
    colors: {
      background: "#edf3ea",
      surface: "#fbfdf9",
      text: "#1e3326",
      primary: "#4a7358",
      secondary: "#a7c2a2",
      accent: "#c9855a",
    },
  },
];

export function ColorsPanel({ theme, value, onChange }: ColorsPanelProps) {
  const [warning, setWarning] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const effective = (key: ColorKey) => value[key] ?? theme.palette[key];

  function checkContrast(colors: Partial<Record<ColorKey, string>>) {
    const bg = colors.surface ?? colors.background ?? theme.palette.surface;
    const text = colors.text ?? readableTextOn(bg, theme.palette.text, "#fffaf3");
    if (contrastRatio(bg, text) < 4.5) {
      setWarning("That background and text combination is low contrast. Try darker ink or a lighter card surface.");
    } else {
      setWarning(null);
    }
  }

  function setColor(key: ColorKey, next: string | undefined) {
    const updated = { ...value, [key]: next };
    if (!next) delete updated[key];
    setStatusMessage(null);
    checkContrast(updated);
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#ece2f6] bg-[#fbf8ff] p-3.5">
        <p className="text-[0.72rem] text-[#6b5580]">
          Colours adjust the theme you picked. Text contrast adapts automatically if you change the backdrop.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
          Curated palettes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CURATED_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setWarning(null);
                setStatusMessage(`${preset.label} applied.`);
                onChange(preset.colors);
              }}
              className="min-h-9 rounded-full border border-[#ece2f6] bg-white px-3 py-1 text-[0.72rem] font-semibold text-[#5b3f7d] transition hover:border-[#cdb8e6]"
            >
              {preset.label}
            </button>
          ))}
        </div>
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
          setStatusMessage("Colours reset to theme default.");
        }}
        className="min-h-10 w-full rounded-full border border-[#e3d7ef] px-4 py-2 text-[0.78rem] font-semibold text-[#5b3f7d]"
      >
        Reset all colours
      </button>
      {statusMessage ? (
        <p role="status" aria-live="polite" className="text-center text-[0.7rem] text-[#7c6892]">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
