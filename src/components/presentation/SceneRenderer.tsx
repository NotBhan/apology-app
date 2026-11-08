"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { ApologyContent } from "@/presentation/build-scenes";
import type { PresentationScene, ResponseOption } from "@/types/scene";
import type { ApologyTheme } from "@/types/theme";
import type { CharacterState } from "@/types/sticker";
import { resolveSituationLabel } from "@/content/situations";
import { RESPONSE_COPY } from "@/lib/api/responses";
import { CharacterController } from "./CharacterController";
import { MessageReveal } from "./MessageReveal";
import { LetterCard } from "./LetterCard";
import { EnvelopeAnimation } from "./EnvelopeAnimation";
import { MemoryGallery } from "./MemoryGallery";
import { ResponsePanel } from "./ResponsePanel";
import { cn } from "@/lib/cn";

export interface SceneRendererProps {
  scene: PresentationScene;
  content: ApologyContent;
  theme: ApologyTheme;
  index: number;
  total: number;
  characterState: CharacterState;
  animate: boolean;
  envelopeOpened: boolean;
  onNext: () => void;
  onEnvelopeOpened: () => void;
  onReplay: () => void;
  onCharacterState: (state: CharacterState) => void;
  onSeenMemory: () => void;
  className?: string;
}

export function SceneRenderer(props: SceneRendererProps) {
  const { scene } = props;

  switch (scene.type) {
    case "opening":
      return <OpeningScene {...props} />;
    case "message":
      return <MessageScene {...props} />;
    case "letter":
      return <LetterScene {...props} />;
    case "envelope":
      return <EnvelopeScene {...props} />;
    case "memory":
      return <MemoryScene {...props} />;
    case "closing":
      return <ClosingScene {...props} />;
    case "response":
      return <ResponseScene {...props} />;
    default:
      return <MessageScene {...props} />;
  }
}

/* ------------------------------------------------------------------ shared */

function Eyebrow({ children, theme }: { children: React.ReactNode; theme: ApologyTheme }) {
  return (
    <p
      className={cn(
        "text-[0.66rem] tracking-[0.24em]",
        theme.typography.uppercaseEyebrow ? "uppercase" : "lowercase",
      )}
      style={{ color: "var(--t-muted)", fontFamily: "var(--t-font-body)" }}
    >
      {children}
    </p>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = "solid",
  full,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "solid" | "ghost";
  full?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.975 }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition disabled:opacity-40",
        full ? "w-full" : "",
      )}
      style={
        tone === "solid"
          ? {
              background: "var(--t-primary)",
              color: "var(--t-surface)",
              boxShadow: "0 10px 26px -14px color-mix(in oklab, var(--t-primary) 80%, transparent)",
            }
          : {
              background: "transparent",
              color: "var(--t-text)",
              border: "1px solid var(--t-border)",
            }
      }
    >
      {children}
    </motion.button>
  );
}

function Character({
  props,
  state,
  className,
  width,
}: {
  props: SceneRendererProps;
  state?: CharacterState;
  className?: string;
  width?: string;
}) {
  return (
    <div className={cn("relative mx-auto", className)} style={{ width: width ?? "46%", maxWidth: 220 }}>
      <CharacterController
        packId={props.content.stickerPackId}
        state={state ?? props.characterState}
        animate={props.animate}
        entrance={props.theme.motion.characterEntrance}
        className="aspect-square w-full"
        delay={0.1}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- opening */

function OpeningScene(props: SceneRendererProps) {
  const { scene, content, theme, index, total, onNext } = props;
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-5 pb-7 pt-4">
      <div className="w-full text-center">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-[0.62rem] uppercase tracking-[0.34em]"
          style={{ color: "var(--t-muted)" }}
        >
          {scene.eyebrow}
        </motion.p>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-2">
        <Character props={props} state={theme.characterStates.opening ?? "apologizing"} width="58%" />

        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-1 max-w-[15ch] text-balance text-center text-[clamp(1.9rem,8vw,2.6rem)] leading-[1.08]"
          style={{
            fontFamily: "var(--t-font-heading)",
            fontWeight: "var(--t-heading-weight)" as unknown as number,
            letterSpacing: "var(--t-heading-tracking)",
            color: "var(--t-text)",
          }}
        >
          {greeting(scene.title, content.recipientName)}
        </motion.h1>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="max-w-[26ch] text-center text-sm leading-relaxed"
          style={{ fontFamily: "var(--t-font-deco)", color: "var(--t-primary)", fontSize: "1.05rem" }}
        >
          {content.senderName} made this for you, {content.recipientName || "you"}.
        </motion.p>
      </div>

      <div className="w-full max-w-[320px] space-y-3">
        <PrimaryButton onClick={onNext} full>
          {scene.ctaLabel ?? "Hear me out"}
        </PrimaryButton>
        <p className="text-center text-[0.62rem]" style={{ color: "var(--t-muted)" }}>
          {sceneCounter(index, total)} · about a minute
        </p>
      </div>
    </div>
  );
}

function greeting(title: string | undefined, name: string) {
  if (!title) return name ? `Hi ${name},` : "Hi you,";
  return name ? `${title.replace(/\?$/, "")}, ${name}?` : title;
}

/* ----------------------------------------------------------------- message */

function MessageScene(props: SceneRendererProps) {
  const { scene, content, theme, index, onNext, onCharacterState } = props;
  const reduce = useReducedMotion();
  const situation = resolveSituationLabel(content.situation, content.situationCustom);

  return (
    <div className="relative flex h-full flex-col items-center px-5 pb-7 pt-2">
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-3">
        <Character
          props={props}
          state={scene.characterState}
          width={index % 2 === 0 ? "44%" : "50%"}
        />

        <div className="w-full max-w-[340px] text-center">
          <Eyebrow theme={theme}>
            {scene.eyebrow ?? situation}
          </Eyebrow>
          <h2
            className="mt-1.5 text-balance text-[clamp(1.35rem,5.6vw,1.75rem)] leading-[1.15]"
            style={{
              fontFamily: "var(--t-font-heading)",
              fontWeight: "var(--t-heading-weight)" as unknown as number,
              letterSpacing: "var(--t-heading-tracking)",
              color: "var(--t-text)",
            }}
          >
            {scene.title}
          </h2>
        </div>

        <motion.div
          className="w-full max-w-[340px] rounded-[20px] px-5 py-4 text-center shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)]"
          style={{
            background: "color-mix(in oklab, var(--t-surface) 92%, transparent)",
            border: "1px solid var(--t-border)",
          }}
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <MessageReveal
            text={scene.body ?? ""}
            mode={theme.motion.messageReveal}
            delay={0.35}
            className="text-[0.94rem] leading-[1.7]"
          />
        </motion.div>
      </div>

      <div className="w-full max-w-[320px]">
        <PrimaryButton
          onClick={() => {
            onCharacterState(scene.characterState ?? "idle");
            onNext();
          }}
          full
        >
          {scene.ctaLabel ?? "Next"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ letter */

function LetterScene(props: SceneRendererProps) {
  const { scene, content, theme, onNext } = props;
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center px-5 pb-7 pt-2">
      <div className="mb-3 text-center">
        <Eyebrow theme={theme}>{scene.eyebrow}</Eyebrow>
        <h2
          className="mt-1 text-[clamp(1.3rem,5.4vw,1.6rem)]"
          style={{
            fontFamily: "var(--t-font-heading)",
            fontWeight: "var(--t-heading-weight)" as unknown as number,
            color: "var(--t-text)",
          }}
        >
          {scene.title}
        </h2>
      </div>

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto no-scrollbar">
        <motion.div
          className="w-full max-w-[360px]"
          initial={reduce ? false : { opacity: 0, y: 24, rotate: -0.8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <LetterCard
            recipientName={content.recipientName}
            senderName={content.senderName}
            body={scene.body || content.messages.personalNote}
            variant={theme.assets.letter}
            revealMode={
              theme.motion.messageReveal === "typewriter" ? "typewriter" : "ink"
            }
            animate={props.animate}
          />
        </motion.div>
      </div>

      <div className="mt-4 w-full max-w-[320px]">
        <PrimaryButton onClick={onNext} full>
          {scene.ctaLabel ?? "Next"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- envelope */

function EnvelopeScene(props: SceneRendererProps) {
  const { scene, content, theme, onNext, envelopeOpened, onEnvelopeOpened } = props;

  return (
    <div className="relative flex h-full flex-col items-center px-5 pb-7 pt-2">
      <div className="mb-2 text-center">
        <Eyebrow theme={theme}>{scene.eyebrow}</Eyebrow>
        <h2
          className="mt-1 text-[clamp(1.25rem,5.2vw,1.55rem)]"
          style={{
            fontFamily: "var(--t-font-heading)",
            fontWeight: "var(--t-heading-weight)" as unknown as number,
            color: "var(--t-text)",
          }}
        >
          {scene.title}
        </h2>
      </div>

      <div className="no-scrollbar flex w-full flex-1 flex-col items-center justify-center overflow-y-auto">
        <EnvelopeAnimation
          recipientName={content.recipientName}
          senderName={content.senderName}
          body={content.messages.personalNote || content.messages.message3}
          variant={theme.assets.envelope}
          letterVariant={theme.assets.letter}
          ctaLabel={scene.ctaLabel ?? "Tap the seal"}
          onOpened={onEnvelopeOpened}
        />
      </div>

      <div className="mt-4 w-full max-w-[320px]">
        <PrimaryButton onClick={onNext} disabled={!envelopeOpened} full>
          Continue
        </PrimaryButton>
        <p className="mt-2 text-center text-[0.62rem]" style={{ color: "var(--t-muted)" }}>
          {envelopeOpened ? "" : "Open the envelope to continue"}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ memory */

function MemoryScene(props: SceneRendererProps) {
  const { scene, content, theme, onNext, onSeenMemory } = props;
  const photos = content.customization.photos;

  return (
    <div className="relative flex h-full flex-col items-center px-4 pb-7 pt-2">
      <div className="mb-3 text-center">
        <Eyebrow theme={theme}>{scene.eyebrow}</Eyebrow>
        <h2
          className="mt-1 text-[clamp(1.25rem,5.2vw,1.55rem)]"
          style={{
            fontFamily: "var(--t-font-heading)",
            fontWeight: "var(--t-heading-weight)" as unknown as number,
            color: "var(--t-text)",
          }}
        >
          {scene.title}
        </h2>
      </div>

      <div className="flex w-full flex-1 items-center justify-center overflow-hidden">
        <MemoryGallery
          photos={photos}
          style={content.customization.memoryStyle}
          className="max-h-full"
          animate={props.animate}
          onSeenAll={onSeenMemory}
        />
      </div>

      <div className="mt-4 w-full max-w-[320px]">
        <PrimaryButton onClick={onNext} full>
          {scene.ctaLabel ?? "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- closing */

function ClosingScene(props: SceneRendererProps) {
  const { scene, content, theme, onNext } = props;
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-5 pb-7 pt-4">
      <div className="w-full text-center">
        <Eyebrow theme={theme}>{scene.eyebrow}</Eyebrow>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4">
        <Character props={props} state={scene.characterState ?? "flowers"} width="50%" />

        <h2
          className="text-balance text-center text-[clamp(1.4rem,5.8vw,1.8rem)] leading-tight"
          style={{
            fontFamily: "var(--t-font-heading)",
            fontWeight: "var(--t-heading-weight)" as unknown as number,
            letterSpacing: "var(--t-heading-tracking)",
            color: "var(--t-text)",
          }}
        >
          {scene.title}
        </h2>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={reduce ? undefined : { opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.3 }}
          className="max-w-[30ch] whitespace-pre-wrap text-center text-[0.9rem] leading-[1.75]"
          style={{ color: "var(--t-text)" }}
        >
          {scene.body}
        </motion.p>

        <p
          className="text-2xl"
          style={{ fontFamily: "var(--t-font-deco)", color: "var(--t-primary)" }}
        >
          — {content.senderName}
        </p>
      </div>

      <div className="w-full max-w-[320px]">
        <PrimaryButton onClick={onNext} full>
          {scene.ctaLabel ?? "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- response */

function ResponseScene(props: SceneRendererProps) {
  const { scene, content, theme, onReplay, onCharacterState } = props;
  const [choice, setChoice] = useState<ResponseOption | null>(null);
  const celebrate = choice ? RESPONSE_COPY[choice].celebratory : false;

  return (
    <div className="relative flex h-full flex-col px-5 pb-7 pt-1">
      <AnimatePresence>
        {celebrate ? <GentleCelebration key="celebration" /> : null}
      </AnimatePresence>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-2.5">
          <Character props={props} state={props.characterState} width="30%" />

          <div className="text-center">
            <Eyebrow theme={theme}>{scene.eyebrow}</Eyebrow>
            <h2
              className="mt-1.5 text-balance text-[clamp(1.35rem,5.6vw,1.7rem)] leading-tight"
              style={{
                fontFamily: "var(--t-font-heading)",
                fontWeight: "var(--t-heading-weight)" as unknown as number,
                color: "var(--t-text)",
              }}
            >
              {scene.title}
            </h2>
            {scene.body ? (
              <p className="mx-auto mt-1.5 max-w-[36ch] text-[0.78rem] leading-snug" style={{ color: "var(--t-muted)" }}>
                {scene.body}
              </p>
            ) : null}
          </div>

          <ResponsePanel
            senderName={content.senderName}
            onReplay={onReplay}
            onCharacterState={onCharacterState}
            onChoiceChange={setChoice}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A restrained celebration: a few slow-rising lights, no confetti, no sound
 * burst. Forgiveness is warm, not a jackpot.
 */
function GentleCelebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <motion.span
          key={index}
          className="absolute block h-1.5 w-1.5 rounded-full"
          style={{
            left: `${10 + index * 9.5}%`,
            bottom: "18%",
            background: "var(--t-accent)",
          }}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{
            opacity: [0, 0.85, 0],
            y: [-4, -130 - index * 6],
            scale: [0.6, 1, 0.5],
          }}
          transition={{
            duration: 3.4 + (index % 3) * 0.6,
            delay: index * 0.22,
            repeat: Infinity,
            repeatDelay: 1.1,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  );
}

function sceneCounter(index: number, total: number) {
  return `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}
