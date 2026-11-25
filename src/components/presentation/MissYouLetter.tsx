"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MissYouContent } from "@/experiences/miss-you/schema";
import { resolveMissYouTheme } from "@/experiences/miss-you/themes";
import { getExperience } from "@/experiences/registry";
import { getTrack } from "@/content/tracks";
import { Icon } from "@/components/ui/icons";
import { AudioController } from "@/components/presentation/AudioController";
import { QuickReplyModal } from "@/components/response/QuickReplyModal";
import { ExperienceReplyModal } from "@/components/response/ExperienceReplyModal";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { MissYouAtmosphere } from "./miss-you/MissYouAtmosphere";
import { MissYouDispatchCard } from "./miss-you/MissYouDispatchCard";
import { MissYouDistanceBridge } from "./miss-you/MissYouDistanceBridge";
import { MissYouStationery } from "./miss-you/MissYouStationery";
import { MissYouPhotoGallery } from "./miss-you/MissYouPhotoGallery";
import { cn } from "@/lib/cn";

export const MISS_YOU_SCENES = ["arrival", "distance", "letter", "memories", "reunion"] as const;
export type MissYouScene = (typeof MISS_YOU_SCENES)[number];

export function MissYouLetter({
  content,
  apologyId,
  initialScene = "arrival",
  variant = "full",
}: {
  content: MissYouContent;
  apologyId?: string;
  initialScene?: MissYouScene;
  variant?: "full" | "embedded" | "modal";
}) {
  const theme = resolveMissYouTheme(content.themeId);
  const visible = useDocumentVisible();
  const [scene, setScene] = useState<MissYouScene>(initialScene);
  const [visitedMemories, setVisitedMemories] = useState<boolean>(initialScene === "memories");
  const [armed, setArmed] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [experienceReplyOpen, setExperienceReplyOpen] = useState(false);

  const sceneIndex = MISS_YOU_SCENES.indexOf(scene);

  const audioSrc = useMemo(() => {
    if (!content.audio || content.audio === "none") return undefined;
    return getTrack(content.audio)?.src;
  }, [content.audio]);

  const goTo = (s: MissYouScene) => {
    if (s === "memories") setVisitedMemories(true);
    setScene(s);
  };

  const next = () => {
    setArmed(true);
    const target = MISS_YOU_SCENES[Math.min(sceneIndex + 1, MISS_YOU_SCENES.length - 1)]!;
    goTo(target);
  };

  const back = () => {
    const target = MISS_YOU_SCENES[Math.max(sceneIndex - 1, 0)]!;
    goTo(target);
  };

  useEffect(() => {
    if (variant === "embedded") return;
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        setScene((current) => {
          const idx = MISS_YOU_SCENES.indexOf(current);
          const target = MISS_YOU_SCENES[Math.min(idx + 1, MISS_YOU_SCENES.length - 1)]!;
          if (target === "memories") setVisitedMemories(true);
          return target;
        });
      } else if (e.key === "ArrowLeft") {
        setScene((current) => {
          const idx = MISS_YOU_SCENES.indexOf(current);
          const target = MISS_YOU_SCENES[Math.max(idx - 1, 0)]!;
          if (target === "memories") setVisitedMemories(true);
          return target;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [variant]);

  const isMemoriesActive = scene === "memories";
  const isEmbedded = variant === "embedded";
  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-between text-center overflow-x-hidden",
        isEmbedded
          ? "min-h-[380px] gap-4 px-3.5 py-4"
          : isModal
            ? "min-h-[420px] gap-4 px-4 sm:px-6 py-4 sm:py-6"
            : "min-h-svh gap-5 px-4 sm:px-6 py-4 sm:py-6",
      )}
      style={{
        background: theme.palette.background,
        color: theme.palette.text,
      }}
    >
      <MissYouAtmosphere theme={theme} paused={!visible} />

      {/* Top Navigation & Progress Rail */}
      <header
        className={cn(
          "relative z-10 w-full max-w-[620px] flex items-center justify-between gap-2",
          isEmbedded ? "mb-1" : "mb-2",
        )}
      >
        <div className="flex items-center gap-2 min-w-[64px]">
          {sceneIndex > 0 ? (
            <button
              type="button"
              onClick={back}
              aria-label="Previous scene"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
              style={{
                background: `${theme.palette.surface}90`,
                border: `1px solid ${theme.palette.border}`,
              }}
            >
              <Icon name="chevron-left" size={14} />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <span className="text-[11px] font-semibold opacity-60">
              {sceneIndex + 1}/{MISS_YOU_SCENES.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Experience scenes">
          {MISS_YOU_SCENES.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(s)}
              aria-label={`Go to scene ${idx + 1}`}
              aria-current={idx === sceneIndex ? "step" : undefined}
              className="h-1.5 rounded-full transition-all cursor-pointer"
              style={{
                width: idx === sceneIndex ? "22px" : "6px",
                background: idx === sceneIndex ? theme.palette.primary : theme.palette.border,
                opacity: idx === sceneIndex ? 1 : 0.55,
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 min-w-[64px]">
          <AudioController
            src={audioSrc}
            volume={0.5}
            armed={armed}
            tone={{
              text: theme.palette.text,
              surface: theme.palette.surface,
              border: theme.palette.border,
            }}
          />
          {sceneIndex > 0 && (
            <span className="text-[11px] font-semibold opacity-60">
              {sceneIndex + 1}/{MISS_YOU_SCENES.length}
            </span>
          )}
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main
        className={cn(
          "relative z-10 w-full max-w-[620px] flex flex-col items-center justify-center",
          variant === "full" && "my-auto py-2",
        )}
      >
        <AnimatePresence mode="wait">
          {/* Scene 1: Arrival Dispatch Card */}
          {scene === "arrival" ? (
            <motion.div
              key="scene-arrival"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45 }}
              className="w-full"
            >
              <MissYouDispatchCard
                recipientName={content.recipientName}
                senderName={content.senderName}
                headline={content.headline}
                theme={theme}
                onOpen={next}
              />
            </motion.div>
          ) : null}

          {/* Scene 2: Distance Bridge & Everyday Reminders */}
          {scene === "distance" ? (
            <motion.div
              key="scene-distance"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45 }}
              className="w-full flex flex-col items-center space-y-4 sm:space-y-5"
            >
              <div className="space-y-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.palette.primary }}
                >
                  Miles apart
                </p>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: theme.typography.headingFont }}
                >
                  Bridge across the map
                </h2>
              </div>

              <MissYouDistanceBridge
                senderName={content.senderName}
                recipientName={content.recipientName}
                distanceNote={content.distanceNote}
                reminders={content.reminders ?? []}
                theme={theme}
              />

              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:opacity-95 active:scale-95 cursor-pointer"
                style={{
                  background: theme.palette.primary,
                  color: theme.isDark ? theme.palette.background : "#ffffff",
                }}
              >
                <span>Read the note</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </motion.div>
          ) : null}

          {/* Scene 3: Personal Stationery Note */}
          {scene === "letter" ? (
            <motion.div
              key="scene-letter"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45 }}
              className="w-full flex flex-col items-center space-y-4 sm:space-y-5"
            >
              <div className="space-y-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.palette.primary }}
                >
                  In my own words
                </p>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: theme.typography.headingFont }}
                >
                  What I wanted to write
                </h2>
              </div>

              <MissYouStationery
                recipientName={content.recipientName}
                senderName={content.senderName}
                letter={content.letter}
                theme={theme}
              />

              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:opacity-95 active:scale-95 cursor-pointer"
                style={{
                  background: theme.palette.primary,
                  color: theme.isDark ? theme.palette.background : "#ffffff",
                }}
              >
                <span>See our snapshots</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </motion.div>
          ) : null}

          {/* Scene 5: Reunion Finale & Two-Way Response */}
          {scene === "reunion" ? (
            <motion.div
              key="scene-reunion"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center space-y-4 sm:space-y-5"
            >
              <div className="space-y-2.5">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full shadow-sm"
                  style={{
                    background: theme.palette.surfaceAlt,
                    color: theme.palette.primary,
                    border: `1px solid ${theme.palette.border}`,
                  }}
                >
                  <Icon name="compass" size={22} />
                </div>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: theme.palette.primary }}
                >
                  Looking ahead
                </p>
                <h2
                  className="text-[clamp(1.75rem,6vw,2.6rem)] font-bold leading-tight text-balance max-w-[18ch] mx-auto"
                  style={{
                    fontFamily: theme.typography.headingFont,
                    color: theme.palette.text,
                  }}
                >
                  {content.reunionWish?.trim() || "Counting the days until I get to see you in person again."}
                </h2>
                <p
                  className="text-xl"
                  style={{
                    fontFamily: theme.typography.decoFont,
                    color: theme.palette.primary,
                  }}
                >
                  — {content.senderName}
                </p>
              </div>

              {(() => {
                const exp = getExperience("miss-you");
                const replyConfig = exp?.replyConfig;
                const isReplyEnabled = Boolean(apologyId && replyConfig?.enabled === true);
                if (!isReplyEnabled || !apologyId) return null;

                const inviteLabel =
                  typeof replyConfig?.inviteLabel === "function"
                    ? replyConfig.inviteLabel(content.senderName)
                    : `Send a note back to ${content.senderName}`;

                const isExpReplyEnabled = Boolean(replyConfig?.allowExperienceReply === true);
                const expInviteLabel =
                  typeof replyConfig?.experienceInviteLabel === "function"
                    ? replyConfig.experienceInviteLabel(content.senderName)
                    : `Create an experience for ${content.senderName}`;

                return (
                  <div className="pt-4 flex flex-col items-center gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setQuickReplyOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={quickReplyOpen}
                        className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold shadow-sm transition motion-safe:active:scale-95 cursor-pointer"
                        style={{
                          background: theme.palette.primary,
                          color: theme.isDark ? theme.palette.background : "#ffffff",
                        }}
                      >
                        <Icon name="message" size={15} />
                        <span>{inviteLabel}</span>
                      </button>

                      {isExpReplyEnabled ? (
                        <button
                          type="button"
                          onClick={() => setExperienceReplyOpen(true)}
                          aria-haspopup="dialog"
                          aria-expanded={experienceReplyOpen}
                          className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-medium transition motion-safe:active:scale-95 cursor-pointer"
                          style={{
                            borderColor: theme.palette.border,
                            background: theme.palette.surface,
                            color: theme.palette.text,
                          }}
                        >
                          <Icon name="pen-line" size={13} />
                          <span>{expInviteLabel}</span>
                        </button>
                      ) : null}
                    </div>

                    <QuickReplyModal
                      apologyId={apologyId}
                      senderName={content.senderName}
                      isOpen={quickReplyOpen}
                      onClose={() => setQuickReplyOpen(false)}
                      experienceId="miss-you"
                    />
                    {isExpReplyEnabled ? (
                      <ExperienceReplyModal
                        apologyId={apologyId}
                        parentSenderName={content.senderName}
                        parentRecipientName={content.recipientName}
                        isOpen={experienceReplyOpen}
                        onClose={() => setExperienceReplyOpen(false)}
                      />
                    ) : null}
                  </div>
                );
              })()}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/*
          Scene 4 (Memories) mounts lazily ONLY on first visit, then remains
          mounted behind a hidden class when navigating forward/back so loaded
          images stay warm in DOM without re-downloading.
        */}
        {visitedMemories && (
          <div
            aria-hidden={!isMemoriesActive}
            className={
              isMemoriesActive
                ? "w-full flex flex-col items-center space-y-4 sm:space-y-5"
                : "hidden"
            }
          >
            <div className="space-y-1">
              <p
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: theme.palette.primary }}
              >
                Snapshots
              </p>
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: theme.typography.headingFont }}
              >
                Moments we hold onto
              </h2>
            </div>

            <MissYouPhotoGallery
              photos={content.photos}
              layout={content.photoLayout}
              theme={theme}
            />

            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:opacity-95 active:scale-95 cursor-pointer"
              style={{
                background: theme.palette.primary,
                color: theme.isDark ? theme.palette.background : "#ffffff",
              }}
            >
              <span>Look ahead</span>
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        )}
      </main>

      {/* Footer Hints */}
      <footer
        className={cn(
          "relative z-10 w-full max-w-[620px] flex items-center justify-between text-[11px] opacity-60",
          isEmbedded ? "mt-2" : "mt-3",
        )}
      >
        <span>Koi Koi</span>
        <span className="hidden sm:inline">Use ← and → arrow keys to navigate</span>
        <button
          type="button"
          onClick={() => setScene("arrival")}
          className="hover:underline cursor-pointer"
        >
          Replay
        </button>
      </footer>
    </div>
  );
}
