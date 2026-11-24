"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BirthdayContent } from "@/experiences/birthday/schema";
import { resolveBirthdayTheme } from "@/experiences/birthday/themes";
import { Icon } from "@/components/ui/icons";
import { QuickReplyModal } from "@/components/response/QuickReplyModal";
import { ExperienceReplyModal } from "@/components/response/ExperienceReplyModal";
import { getExperience } from "@/experiences/registry";
import { BirthdayCelebration } from "./birthday/BirthdayCelebration";
import { BirthdayEnvelope } from "./birthday/BirthdayEnvelope";
import { BirthdayCake } from "./birthday/BirthdayCake";
import { BirthdayCard } from "./birthday/BirthdayCard";
import { BirthdayMessageCard } from "./birthday/BirthdayMessageCard";

export const BIRTHDAY_SCENES = ["opening", "wish", "message", "gallery", "finale"] as const;
export type BirthdayScene = (typeof BIRTHDAY_SCENES)[number];

export function BirthdayLetter({
  content,
  apologyId,
}: {
  content: BirthdayContent;
  apologyId?: string;
}) {
  const theme = resolveBirthdayTheme(content.themeId);
  const [scene, setScene] = useState<BirthdayScene>("opening");
  const [candleOut, setCandleOut] = useState(false);
  const [celebrateBurst, setCelebrateBurst] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [experienceReplyOpen, setExperienceReplyOpen] = useState(false);

  const sceneIndex = BIRTHDAY_SCENES.indexOf(scene);

  const goTo = (s: BirthdayScene) => setScene(s);
  const next = () => setScene(BIRTHDAY_SCENES[Math.min(sceneIndex + 1, BIRTHDAY_SCENES.length - 1)]);
  const back = () => setScene(BIRTHDAY_SCENES[Math.max(sceneIndex - 1, 0)]);

  function handleCakeBlownOut() {
    setCandleOut(true);
    setCelebrateBurst(true);
    window.setTimeout(() => setCelebrateBurst(false), 3000);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        setScene((current) => {
          const idx = BIRTHDAY_SCENES.indexOf(current);
          return BIRTHDAY_SCENES[Math.min(idx + 1, BIRTHDAY_SCENES.length - 1)];
        });
      } else if (e.key === "ArrowLeft") {
        setScene((current) => {
          const idx = BIRTHDAY_SCENES.indexOf(current);
          return BIRTHDAY_SCENES[Math.max(idx - 1, 0)];
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-between px-4 sm:px-6 py-6 sm:py-10 text-center overflow-x-hidden selection:bg-black/10"
      style={{
        background: theme.palette.background,
        color: theme.palette.text,
      }}
    >
      {/* Ambient Decorative Celebration Layer */}
      <BirthdayCelebration theme={theme} burst={celebrateBurst} />

      {/* Top Header & Breadcrumb Progress */}
      <header className="relative z-10 w-full max-w-[620px] flex items-center justify-between mb-4">
        {sceneIndex > 0 ? (
          <button
            type="button"
            onClick={back}
            aria-label="Previous step"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
            style={{
              background: `${theme.palette.surface}80`,
              border: `1px solid ${theme.palette.border}`,
            }}
          >
            <Icon name="chevron-left" size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>
        ) : (
          <div className="w-12" />
        )}

        {/* Scene progress dots */}
        <div className="flex items-center gap-1.5">
          {BIRTHDAY_SCENES.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(s)}
              aria-label={`Go to ${s} step`}
              className="h-1.5 rounded-full transition-all cursor-pointer"
              style={{
                width: idx === sceneIndex ? "22px" : "6px",
                background: idx === sceneIndex ? theme.palette.primary : theme.palette.border,
                opacity: idx === sceneIndex ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <div className="w-12 text-right">
          <span className="text-[11px] font-semibold opacity-60">
            {sceneIndex + 1}/{BIRTHDAY_SCENES.length}
          </span>
        </div>
      </header>

      {/* Main Interactive Scene Stage */}
      <main className="relative z-10 w-full max-w-[620px] my-auto flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Opening Envelope */}
          {scene === "opening" ? (
            <motion.div
              key="scene-opening"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className="space-y-1.5">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: theme.palette.accent }}
                >
                  a birthday invitation
                </p>
                <h1
                  className="text-[clamp(1.8rem,6vw,2.8rem)] font-bold leading-tight"
                  style={{ fontFamily: theme.typography.headingFont }}
                >
                  {content.headline}
                </h1>
                <p className="text-sm opacity-80">Specially prepared for {content.recipientName}</p>
              </div>

              <BirthdayEnvelope
                recipientName={content.recipientName}
                senderName={content.senderName}
                theme={theme}
                onOpened={next}
              />

              {/* Primary "Open it" action */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                  style={{
                    background: theme.palette.primary,
                    color: theme.palette.surface,
                  }}
                >
                  <span>Open it</span>
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Scene 2: Card & Cake Celebration (Make a wish) */}
          {scene === "wish" ? (
            <motion.div
              key="scene-wish"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center space-y-4 sm:space-y-6"
            >
              <BirthdayCard
                recipientName={content.recipientName}
                senderName={content.senderName}
                headline={content.headline}
                age={content.age}
                theme={theme}
              />

              <div className="space-y-1 pt-3 pb-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: theme.palette.accent }}
                >
                  make a wish
                </p>
                <p className="text-sm opacity-80">
                  {content.age ? `${content.age} looks wonderful on you.` : "Another beautiful year ahead."}
                </p>
              </div>

              <BirthdayCake
                theme={theme}
                candleCount={content.candleCount ?? 3}
                isBlownOut={candleOut}
                onBlowOut={handleCakeBlownOut}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                  style={{
                    background: theme.palette.primary,
                    color: theme.palette.surface,
                  }}
                >
                  <span>Continue</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Scene 3: The Personal Letter */}
          {scene === "message" ? (
            <motion.div
              key="scene-message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center space-y-6"
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.24em]"
                style={{ color: theme.palette.accent }}
              >
                from {content.senderName}
              </p>

              <BirthdayMessageCard
                senderName={content.senderName}
                recipientName={content.recipientName}
                message={content.message}
                photos={[]}
                theme={theme}
              />

              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                style={{
                  background: theme.palette.primary,
                  color: theme.palette.surface,
                }}
              >
                <span>Continue</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </motion.div>
          ) : null}

          {/* Scene 4: Gallery / Photos */}
          {scene === "gallery" ? (
            <motion.div
              key="scene-gallery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center space-y-6"
            >
              <h2
                className="text-2xl font-bold"
                style={{ fontFamily: theme.typography.headingFont }}
              >
                Some moments
              </h2>

              {content.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3.5 w-full max-w-[460px]">
                  {content.photos.map((photo, i) => (
                    <div
                      key={`gallery-photo-${i}`}
                      className="overflow-hidden rounded-2xl p-2 shadow-sm"
                      style={{
                        background: theme.palette.surface,
                        border: `1.5px solid ${theme.palette.border}`,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`Moment ${i + 1}`}
                        className="h-36 sm:h-40 w-full rounded-xl object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70">No photos this time — the words are the gift.</p>
              )}

              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                style={{
                  background: theme.palette.primary,
                  color: theme.palette.surface,
                }}
              >
                <span>One last thing</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </motion.div>
          ) : null}

          {/* Scene 5: Finale & Response Invitations */}
          {scene === "finale" ? (
            <motion.div
              key="scene-finale"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full shadow-sm" style={{ background: `${theme.palette.primary}18`, color: theme.palette.primary }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="currentColor" opacity="0.3" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <h2
                  className="text-[clamp(2.2rem,7vw,3.4rem)] font-bold leading-tight"
                  style={{
                    fontFamily: theme.typography.headingFont,
                    color: theme.palette.primary,
                  }}
                >
                  {content.wish ?? "Happy birthday."}
                </h2>
                <p className="text-base font-medium opacity-85">— {content.senderName}</p>
              </div>

              {/* Action and Response Buttons */}
              {(() => {
                const birthdayExp = getExperience("birthday");
                const replyConfig = birthdayExp?.replyConfig;
                const isReplyEnabled = Boolean(apologyId && replyConfig?.enabled === true);
                if (!isReplyEnabled || !apologyId) return null;

                const inviteLabel =
                  typeof replyConfig?.inviteLabel === "function"
                    ? replyConfig.inviteLabel(content.senderName)
                    : "Say Thank You";

                const isExperienceReplyEnabled = Boolean(
                  apologyId &&
                    replyConfig?.enabled === true &&
                    replyConfig?.allowExperienceReply === true
                );
                const experienceInviteLabel =
                  typeof replyConfig?.experienceInviteLabel === "function"
                    ? replyConfig.experienceInviteLabel(content.senderName)
                    : `Send a letter to ${content.senderName}`;

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
                          color: theme.palette.surface,
                        }}
                      >
                        <Icon name="message" size={15} />
                        <span>{inviteLabel}</span>
                      </button>
                      {isExperienceReplyEnabled ? (
                        <button
                          type="button"
                          onClick={() => setExperienceReplyOpen(true)}
                          aria-haspopup="dialog"
                          aria-expanded={experienceReplyOpen}
                          className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-medium transition motion-safe:active:scale-95 cursor-pointer"
                          style={{
                            borderColor: theme.palette.border,
                            background: `${theme.palette.surface}80`,
                            color: theme.palette.text,
                          }}
                        >
                          <Icon name="pen-line" size={13} />
                          <span>{experienceInviteLabel}</span>
                        </button>
                      ) : null}
                    </div>
                    <QuickReplyModal
                      apologyId={apologyId}
                      senderName={content.senderName}
                      isOpen={quickReplyOpen}
                      onClose={() => setQuickReplyOpen(false)}
                      experienceId="birthday"
                    />
                    {isExperienceReplyEnabled ? (
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
      </main>

      {/* Footer Navigation Hints */}
      <footer className="relative z-10 w-full max-w-[620px] flex items-center justify-between text-[11px] opacity-60 mt-4">
        <span>Koi Koi Birthday</span>
        <span className="hidden sm:inline">Use ← and → arrow keys to navigate</span>
        <button
          type="button"
          onClick={() => {
            setScene("opening");
            setCandleOut(false);
          }}
          className="hover:underline cursor-pointer"
        >
          Replay
        </button>
      </footer>
    </div>
  );
}
