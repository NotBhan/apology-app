"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ApologyContent } from "@/presentation/build-scenes";
import { buildScenes } from "@/presentation/build-scenes";
import type { ApologyTheme } from "@/types/theme";
import type { CharacterState } from "@/types/sticker";
import { themeScopeVars } from "@/lib/theme-vars";
import { resolveAudioSrc, resolveVolume } from "@/lib/audio";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { SceneRenderer } from "./SceneRenderer";
import { SceneTransition } from "./SceneTransition";
import { ThemeCanvas } from "./ThemeCanvas";
import { AudioController } from "./AudioController";
import { Icon } from "@/components/ui/icons";

export interface PresentationApi {
  next: () => void;
  back: () => void;
  restart: () => void;
  goTo: (index: number) => void;
  index: number;
  total: number;
  sceneId: string;
  canBack: boolean;
  audioSrc?: string;
  volume: number;
  muted: boolean;
  setMuted: (muted: boolean) => void;
}

interface PresentationEngineProps {
  content: ApologyContent;
  theme: ApologyTheme;
  mode?: "preview" | "live";
  /** Lets the creator page render controls outside the presentation viewport. */
  onApiReady?: (api: PresentationApi) => void;
  className?: string;
}

export function PresentationEngine({
  content,
  theme,
  mode = "live",
  onApiReady,
  className,
}: PresentationEngineProps) {
  const scenes = useMemo(() => buildScenes(content, theme), [content, theme]);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [envelopeOpened, setEnvelopeOpened] = useState(false);
  const [characterState, setCharacterState] = useState<CharacterState>(
    scenes[0]?.characterState ?? "apologizing",
  );

  const reduce = useReducedMotion();
  const visible = useDocumentVisible();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const scene = scenes[Math.min(index, scenes.length - 1)];
  const isLast = index >= scenes.length - 1;

  const audioSrc = useMemo(() => resolveAudioSrc(theme, content.customization), [theme, content]);
  const volume = useMemo(() => resolveVolume(content.customization), [content]);

  const animate = !reduce && visible;

  const goTo = useCallback(
    (target: number) => {
      const bounded = Math.max(0, Math.min(scenes.length - 1, target));
      setIndex(bounded);
      setEnvelopeOpened(false);
      const nextState = scenes[bounded]?.characterState ?? "idle";
      setCharacterState(nextState);
    },
    [scenes],
  );

  const next = useCallback(() => {
    setArmed(true);
    goTo(index + 1);
  }, [goTo, index]);

  const back = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  const restart = useCallback(() => {
    setArmed(true);
    setIndex(0);
    setEnvelopeOpened(false);
    setCharacterState(scenes[0]?.characterState ?? "apologizing");
  }, [scenes]);

  useEffect(() => {
    onApiReady?.({
      next,
      back,
      restart,
      goTo,
      index,
      total: scenes.length,
      sceneId: scene?.id ?? "",
      canBack: index > 0,
      audioSrc,
      volume,
      muted,
      setMuted,
    });
  }, [onApiReady, next, back, restart, goTo, index, scenes.length, scene, audioSrc, volume, muted]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };

    stage.addEventListener("keydown", onKey);
    return () => stage.removeEventListener("keydown", onKey);
  }, [next, back]);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    touchStart.current = null;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0 && !isLast && scene?.type !== "envelope") next();
    if (dx > 0 && index > 0) back();
  };

  if (!scene) return null;

  const scope = themeScopeVars(theme, content.customization);

  return (
    <div
      className={className}
      style={{
        ...scope,
        position: "relative",
        overflow: "hidden",
        background: "var(--t-bg)",
        color: "var(--t-text)",
        fontFamily: "var(--t-font-body)",
      }}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-roledescription="presentation"
        aria-label={`Apology from ${content.senderName} to ${content.recipientName}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative isolate flex h-full min-h-0 w-full flex-col outline-none"
      >
        <ThemeCanvas
          themeId={theme.id}
          sceneId={scene.id}
          paused={!animate}
          className="absolute inset-0"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, transparent 40%, color-mix(in oklab, var(--t-bg) 55%, transparent) 100%)",
          }}
        />

        {/* Chrome */}
        <div
          className="relative z-30 flex items-center justify-between gap-2 px-4"
          style={{ paddingTop: "calc(var(--safe-top) + 12px)" }}
        >
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={back}
                aria-label="Previous scene"
                className="grid h-8 w-8 place-items-center rounded-full border"
                style={{
                  borderColor: "color-mix(in oklab, var(--t-border) 80%, transparent)",
                  color: "var(--t-text)",
                  background: "color-mix(in oklab, var(--t-surface) 55%, transparent)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <Icon name="chevron-left" size={14} />
              </button>
            ) : null}
            <span
              className="text-[0.6rem] tabular-nums tracking-[0.18em]"
              style={{ color: "var(--t-muted)" }}
            >
              {String(index + 1).padStart(2, "0")}/{String(scenes.length).padStart(2, "0")}
            </span>
          </div>

          <AudioController
            src={armed && !muted ? audioSrc : muted ? undefined : audioSrc}
            volume={volume}
            armed={armed && !muted}
            tone={{
              text: "var(--t-text)",
              surface: "color-mix(in oklab, var(--t-surface) 62%, transparent)",
              border: "color-mix(in oklab, var(--t-border) 80%, transparent)",
            }}
          />
        </div>

        {/* Progress */}
        <div className="relative z-30 mt-2 flex gap-1 px-4" aria-hidden>
          {scenes.map((item, dot) => (
            <motion.span
              key={item.id}
              className="h-[3px] flex-1 rounded-full"
              initial={false}
              animate={{
                opacity: dot <= index ? 1 : 0.22,
                scaleY: dot === index ? 1.6 : 1,
              }}
              transition={{ duration: 0.4 }}
              style={{ background: "var(--t-primary)" }}
            />
          ))}
        </div>

        {/* Scene */}
        <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
          <SceneTransition sceneKey={scene.id} preset={theme.motion.transition}>
            <SceneRenderer
              scene={scene}
              content={content}
              theme={theme}
              index={index}
              total={scenes.length}
              characterState={characterState}
              animate={animate}
              envelopeOpened={envelopeOpened}
              onNext={next}
              onEnvelopeOpened={() => setEnvelopeOpened(true)}
              onReplay={restart}
              onCharacterState={setCharacterState}
              onSeenMemory={() => undefined}
            />
          </SceneTransition>
        </div>

        {mode === "live" ? (
          <div
            className="pointer-events-none relative z-30 flex justify-center px-4"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 8px)" }}
          >
            <span className="text-[0.55rem] tracking-[0.2em]" style={{ color: "var(--t-muted)" }}>
              made with care · private link
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { PresentationEngineProps };
