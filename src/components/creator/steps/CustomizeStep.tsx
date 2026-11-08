"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ApologyCustomization, PhotoAsset } from "@/types/apology";
import type { ApologyTheme } from "@/types/theme";
import { MusicPanel } from "@/components/customization/MusicPanel";
import { PhotosPanel } from "@/components/customization/PhotosPanel";
import { ColorsPanel } from "@/components/customization/ColorsPanel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Tab = "music" | "photos" | "colours";

interface CustomizeStepProps {
  customization: ApologyCustomization;
  theme: ApologyTheme;
  onChange: (patch: Partial<ApologyCustomization>) => void;
  onUploadAudio: (file: File) => Promise<{ assetId: string }>;
  onUploadPhoto: (
    blob: Blob,
    meta: { width: number; height: number; type: string },
  ) => Promise<PhotoAsset>;
  onNext: () => void;
  onBack: () => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: "music", label: "Music" },
  { key: "photos", label: "Photos" },
  { key: "colours", label: "Colours" },
];

export function CustomizeStep({
  customization,
  theme,
  onChange,
  onUploadAudio,
  onUploadPhoto,
  onNext,
  onBack,
}: CustomizeStepProps) {
  const [tab, setTab] = useState<Tab>("music");

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step six</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Make it yours
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          Optional adjustments. Everything here can stay exactly as the theme designed it.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Customisation"
        className="flex rounded-full bg-[#f4eefb] p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "relative flex-1 rounded-full px-3 py-2 text-[0.78rem] font-semibold transition",
              tab === item.key ? "text-[#4b2f6b]" : "text-[#8a7a9c]",
            )}
          >
            {tab === item.key ? (
              <motion.span
                layoutId="customize-tab"
                className="absolute inset-0 rounded-full bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "music" ? (
          <MusicPanel
            value={customization.audio}
            themeDefaultTrackId={theme.defaultMusic}
            onChange={(audio) => onChange({ audio })}
            onUpload={onUploadAudio}
          />
        ) : null}

        {tab === "photos" ? (
          <PhotosPanel
            photos={customization.photos}
            memoryStyle={customization.memoryStyle}
            onChange={(photos) => onChange({ photos })}
            onMemoryStyleChange={(memoryStyle) => onChange({ memoryStyle })}
            onUpload={onUploadPhoto}
          />
        ) : null}

        {tab === "colours" ? (
          <ColorsPanel
            theme={theme}
            value={customization.colors ?? {}}
            onChange={(colors) => onChange({ colors })}
          />
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-[1.4]">
          Continue
        </Button>
      </div>
    </div>
  );
}
