"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BirthdayContent } from "@/experiences/birthday/schema";
import { resolveBirthdayConfig, type BirthdaySceneKey } from "@/experiences/birthday/resolve";
import { useReducedMotionSafe } from "@/hooks/useMounted";
import { Icon } from "@/components/ui/icons";
import { AudioController } from "@/components/presentation/AudioController";
import { QuickReplyModal } from "@/components/response/QuickReplyModal";
import { ExperienceReplyModal } from "@/components/response/ExperienceReplyModal";
import { getExperience } from "@/experiences/registry";
import type { MotionPreset, TransitionStyle } from "@/types/customization";
import { BirthdayCelebration } from "./birthday/BirthdayCelebration";
import { BirthdayGiftBox } from "./birthday/BirthdayGiftBox";
import { BirthdayEnvelope } from "./birthday/BirthdayEnvelope";
import { BirthdayCake } from "./birthday/BirthdayCake";
import { BirthdayCard } from "./birthday/BirthdayCard";
import { BirthdayPhotoGallery } from "./birthday/BirthdayPhotoGallery";

export const BIRTHDAY_SCENES = ["opening", "wish", "message", "gallery", "finale"] as const;
export type BirthdayScene = (typeof BIRTHDAY_SCENES)[number];

function sceneMotionProps(
  style: TransitionStyle,
  preset: MotionPreset,
  still: boolean,
) {
  if (still) {
    return {
      initial: false as const,
      animate: { opacity: 1 },
      exit: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  const duration = preset === "expressive" ? 0.65 : preset === "gentle" ? 0.48 : 0.5;
  if (style === "card" || style === "curtain") {
    return {
      initial: { opacity: 0, x: 26 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -26 },
      transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
    };
  }
  if (style === "paper") {
    return {
      initial: { opacity: 0, y: 26, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -16, scale: 0.98 },
      transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
    };
  }
  if (style === "crossfade") {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration },
    };
  }
  return {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration },
  };
}

export function BirthdayLetter({
  content,
  apologyId,
}: {
  content: BirthdayContent;
  apologyId?: string;
}) {
  const reduce = useReducedMotionSafe();
  const config = resolveBirthdayConfig(content);
  const { theme, palette, typography, interaction, scenes } = config;
  const still = reduce || interaction.motionPreset === "still";

  const [scene, setScene] = useState<BirthdayScene>("opening");
  const [candleOut, setCandleOut] = useState(false);
  const [celebrateBurst, setCelebrateBurst] = useState(false);
  const [audioArmed, setAudioArmed] = useState(false);
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const [experienceReplyOpen, setExperienceReplyOpen] = useState(false);
  const burstTimerRef = useRef<number | null>(null);

  const activeScene: BirthdaySceneKey = scenes.includes(scene) ? scene : scenes[0];
  const sceneIndex = scenes.indexOf(activeScene);
  const motionProps = sceneMotionProps(interaction.transitionStyle, interaction.motionPreset, still);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  const armAudio = () => {
    if (config.audioTrack && !audioArmed) {
      setAudioArmed(true);
    }
  };

  const goTo = (s: BirthdayScene) => {
    if (!scenes.includes(s)) return;
    if (s !== "opening") armAudio();
    setScene(s);
  };

  const next = () => {
    armAudio();
    const target = scenes[Math.min(sceneIndex + 1, scenes.length - 1)];
    if (target) setScene(target);
  };

  const back = () => {
    const target = scenes[Math.max(sceneIndex - 1, 0)];
    if (target) setScene(target);
  };

  function handleCakeBlownOut() {
    armAudio();
    setCandleOut(true);
    setCelebrateBurst(true);
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
    }
    if (!still) {
      burstTimerRef.current = window.setTimeout(() => {
        setCelebrateBurst(false);
        burstTimerRef.current = null;
      }, 3000);
    } else {
      setCelebrateBurst(false);
    }
  }

  function handleCakeRelight() {
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    setCandleOut(false);
    setCelebrateBurst(false);
  }

  // Keyboard navigation guarded when inputs or modal dialogs (lightbox, replies, preview) are open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (quickReplyOpen || experienceReplyOpen) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }
      if (e.key === "ArrowRight") {
        setScene((current) => {
          const currentIdx = scenes.includes(current) ? scenes.indexOf(current) : 0;
          return scenes[Math.min(currentIdx + 1, scenes.length - 1)];
        });
      } else if (e.key === "ArrowLeft") {
        setScene((current) => {
          const currentIdx = scenes.includes(current) ? scenes.indexOf(current) : 0;
          return scenes[Math.max(currentIdx - 1, 0)];
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scenes, quickReplyOpen, experienceReplyOpen]);

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-between px-4 sm:px-6 py-6 sm:py-10 text-center overflow-x-hidden selection:bg-black/10"
      style={{
        ...config.scopeVars,
        background: palette.background,
        color: palette.text,
        fontFamily: typography.bodyFont,
      }}
    >
      {/* Ambient Decorative Celebration Layer */}
      <BirthdayCelebration
        theme={theme}
        burst={celebrateBurst}
        enabled={config.decorations.enabled}
        animate={!still}
        density={config.decorations.density}
        intensity={interaction.celebrationIntensity}
      />

      {/* Top Header & Breadcrumb Progress */}
      <header className="relative z-10 w-full max-w-[620px] flex items-center justify-between mb-4">
        {sceneIndex > 0 ? (
          <button
            type="button"
            onClick={back}
            aria-label="Previous scene"
            className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
            style={{
              background: `${palette.surface}80`,
              border: `1px solid ${palette.border}`,
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
          {scenes.map((s, idx) => (
            <button
              key={s}
              type="button"
              onClick={() => goTo(s)}
              aria-label={`Go to scene ${idx + 1}`}
              className="h-1.5 rounded-full transition-all cursor-pointer"
              style={{
                width: idx === sceneIndex ? "22px" : "6px",
                background: idx === sceneIndex ? palette.primary : palette.border,
                opacity: idx === sceneIndex ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 min-w-12">
          {config.audioTrack && (
            <AudioController
              src={config.audioTrack.src}
              volume={0.55}
              armed={audioArmed}
              tone={{
                text: palette.text,
                surface: palette.surface,
                border: palette.border,
              }}
            />
          )}
          <span className="text-[11px] font-semibold opacity-60">
            {sceneIndex + 1}/{scenes.length}
          </span>
        </div>
      </header>

      {/* Main Interactive Scene Stage */}
      <main className="relative z-10 w-full max-w-[620px] my-auto flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Opening Gift Box */}
          {activeScene === "opening" ? (
            <motion.div
              key="scene-opening"
              {...motionProps}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className={`space-y-1.5 ${typography.alignment === "left" ? "text-left w-full max-w-[460px]" : "text-center"}`}>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: palette.accent }}
                >
                  {config.content.openingEyebrow}
                </p>
                <h1
                  className="font-bold leading-tight"
                  style={{
                    fontFamily: typography.headingFont,
                    fontSize: `calc(clamp(1.8rem, 6vw, 2.8rem) * ${typography.textScale})`,
                  }}
                >
                  {content.headline}
                </h1>
                <p className="text-sm opacity-80">{config.content.openingSubtitle}</p>
              </div>

              <BirthdayGiftBox
                recipientName={content.recipientName}
                senderName={content.senderName}
                theme={theme}
                animate={!still}
                revealMode={interaction.giftReveal}
                onOpened={next}
              />

              {/* Primary Opening CTA */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                  style={{
                    background: palette.primary,
                    color: palette.surface,
                  }}
                >
                  <span>{config.content.openingCta}</span>
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Scene 2: Card & Cake Celebration (Make a wish) */}
          {activeScene === "wish" ? (
            <motion.div
              key="scene-wish"
              {...motionProps}
              className="w-full flex flex-col items-center space-y-4 sm:space-y-6"
            >
              <BirthdayCard
                recipientName={content.recipientName}
                senderName={content.senderName}
                headline={content.headline}
                age={content.age}
                theme={theme}
                animate={!still}
                badgeLabel={config.content.wishCardBadge}
                showAgeBadge={config.content.showAgeBadge}
                decorationsEnabled={config.decorations.enabled}
                textScale={typography.textScale}
                alignment={typography.alignment === "left" ? "left" : "center"}
              />

              <div className="space-y-1 pt-3 pb-1">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: palette.accent }}
                >
                  {config.content.cakeHeading}
                </p>
                <p className="text-sm opacity-80">{config.content.cakeSubtitle}</p>
              </div>

              <BirthdayCake
                theme={theme}
                candleCount={content.candleCount ?? 3}
                animate={!still}
                candleMode={interaction.candleMode}
                ctaLabel={config.content.cakeCta}
                isBlownOut={candleOut}
                onBlowOut={handleCakeBlownOut}
                onRelight={handleCakeRelight}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                  style={{
                    background: palette.primary,
                    color: palette.surface,
                  }}
                >
                  <span>Continue</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Scene 3: The Personal Letter */}
          {activeScene === "message" ? (
            <motion.div
              key="scene-message"
              {...motionProps}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className="space-y-1 text-center">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: palette.accent }}
                >
                  from {content.senderName}
                </p>
                <p className="text-sm opacity-80">{config.content.letterEyebrow}</p>
              </div>

              <BirthdayEnvelope
                recipientName={content.recipientName}
                senderName={content.senderName}
                message={content.message}
                photos={content.photos}
                theme={theme}
                animate={!still}
                styleVariant={interaction.envelopeStyle}
                letterHeading={config.content.letterHeading}
                letterSignOff={config.content.letterSignOff}
                textScale={typography.textScale}
                alignment={typography.alignment === "left" ? "left" : "center"}
              />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                  style={{
                    background: palette.primary,
                    color: palette.surface,
                  }}
                >
                  <span>Continue</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Scene 4: Gallery / Photos */}
          {activeScene === "gallery" ? (
            <motion.div
              key="scene-gallery"
              {...motionProps}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className="space-y-1">
                <h2
                  className="font-bold"
                  style={{
                    fontFamily: typography.headingFont,
                    fontSize: `calc(1.5rem * ${typography.textScale})`,
                  }}
                >
                  {config.content.galleryHeading}
                </h2>
                {config.content.gallerySubtitle ? (
                  <p className="text-xs opacity-75">{config.content.gallerySubtitle}</p>
                ) : null}
              </div>

              <BirthdayPhotoGallery
                photos={content.photos}
                layout={content.photoLayout}
                theme={theme}
                animate={!still}
              />

              <button
                type="button"
                onClick={next}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-md transition hover:shadow-lg active:scale-95 cursor-pointer"
                style={{
                  background: palette.primary,
                  color: palette.surface,
                }}
              >
                <span>{config.content.galleryCta}</span>
                <Icon name="arrow-right" size={16} />
              </button>
            </motion.div>
          ) : null}

          {/* Scene 5: Finale & Response Invitations */}
          {activeScene === "finale" ? (
            <motion.div
              key="scene-finale"
              {...motionProps}
              className="w-full flex flex-col items-center space-y-6"
            >
              <div className="space-y-3">
                <div
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-full shadow-sm"
                  style={{ background: `${palette.primary}18`, color: palette.primary }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" fill="currentColor" opacity="0.3" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
                <h2
                  className="font-bold leading-tight"
                  style={{
                    fontFamily: typography.headingFont,
                    fontSize: `calc(clamp(2.2rem, 7vw, 3.4rem) * ${typography.textScale})`,
                    color: palette.primary,
                  }}
                >
                  {config.content.finaleHeading}
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
                    replyConfig?.allowExperienceReply === true,
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
                        className="inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold shadow-sm transition motion-safe:active:scale-95 cursor-pointer"
                        style={{
                          background: palette.primary,
                          color: palette.surface,
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
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-medium transition motion-safe:active:scale-95 cursor-pointer"
                          style={{
                            borderColor: palette.border,
                            background: `${palette.surface}80`,
                            color: palette.text,
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
            setScene(scenes[0]);
            handleCakeRelight();
          }}
          className="hover:underline cursor-pointer"
        >
          Replay
        </button>
      </footer>
    </div>
  );
}
