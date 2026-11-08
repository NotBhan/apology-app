"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ThemeId } from "@/types/theme";
import { THEME_LIST, getTheme } from "@/themes/registry";
import { ThemeCard } from "@/components/theme-selector/ThemeCard";
import { ThemeCanvas } from "@/components/presentation/ThemeCanvas";
import { themeScopeVars } from "@/lib/theme-vars";
import { Button } from "@/components/ui/Button";

interface ThemeStepProps {
  themeId: ThemeId;
  recipientName: string;
  senderName: string;
  onChange: (themeId: ThemeId) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ThemeStep({
  themeId,
  recipientName,
  senderName,
  onChange,
  onNext,
  onBack,
}: ThemeStepProps) {
  const [preview, setPreview] = useState<ThemeId | null>(null);
  const previewTheme = preview ? getTheme(preview) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-[#a394b4]">step four</p>
        <h1
          className="text-[clamp(1.6rem,6vw,2rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pick the feeling
        </h1>
        <p className="text-[0.86rem] leading-relaxed text-[#7c6892]">
          Eight genuinely different worlds. Tap preview to see one before you commit.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {THEME_LIST.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={theme.id === themeId}
            onSelect={() => onChange(theme.id)}
            onPreview={() => setPreview(theme.id)}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-[1.4]">
          Use {getTheme(themeId).name}
        </Button>
      </div>

      <AnimatePresence>
        {previewTheme ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[#2a1a38]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${previewTheme.name} preview`}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-[420px] overflow-hidden rounded-t-[26px] bg-white sm:rounded-[26px]"
            >
              <div
                className="relative h-[300px] w-full overflow-hidden"
                style={{ ...themeScopeVars(previewTheme), background: "var(--t-bg)" }}
              >
                <div className="absolute inset-0">
                  <ThemeCanvas themeId={previewTheme.id} sceneId="opening" />
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-between px-5 py-6 text-center">
                  <p
                    className="text-[0.6rem] uppercase tracking-[0.32em]"
                    style={{ color: "var(--t-muted)" }}
                  >
                    {previewTheme.category}
                  </p>
                  <div className="space-y-2">
                    <h3
                      className="text-[1.7rem] leading-tight"
                      style={{
                        fontFamily: "var(--t-font-heading)",
                        color: "var(--t-text)",
                        letterSpacing: "var(--t-heading-tracking)",
                      }}
                    >
                      {recipientName ? `Hi ${recipientName},` : "Hi you,"}
                    </h3>
                    <p
                      className="text-[1rem]"
                      style={{ fontFamily: "var(--t-font-deco)", color: "var(--t-primary)" }}
                    >
                      {senderName || "I"} made this for you.
                    </p>
                  </div>
                  <span
                    className="rounded-full px-5 py-2 text-[0.78rem] font-semibold"
                    style={{ background: "var(--t-primary)", color: "var(--t-surface)" }}
                  >
                    Hear me out
                  </span>
                </div>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div>
                  <h4 className="text-[1rem] font-semibold text-[#33203f]">{previewTheme.name}</h4>
                  <p className="mt-0.5 text-[0.78rem] leading-relaxed text-[#8a7a9c]">
                    {previewTheme.description}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setPreview(null)} className="flex-1">
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      onChange(previewTheme.id);
                      setPreview(null);
                    }}
                    className="flex-1"
                  >
                    Choose this
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
