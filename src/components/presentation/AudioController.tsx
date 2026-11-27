"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export interface AudioControllerProps {
  /** Resolved track URL, or undefined when music is disabled. */
  src?: string;
  volume: number;
  /** Playback only begins after a deliberate recipient gesture. */
  armed: boolean;
  /** Optional controlled mute state synchronized with PresentationApi. */
  muted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  className?: string;
  tone?: { text: string; surface: string; border: string };
}

/**
 * Music is always optional and always visible. Never autoplays before a
 * gesture, pauses when the tab is hidden, and stops on unmount.
 */
export function AudioController({
  src,
  volume,
  armed,
  muted: controlledMuted,
  onMuteChange,
  className,
  tone,
}: AudioControllerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [internalMuted, setInternalMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const muted = controlledMuted ?? internalMuted;

  const toggleMuted = useCallback(() => {
    const next = !muted;
    if (onMuteChange) {
      onMuteChange(next);
    } else {
      setInternalMuted(next);
    }
  }, [muted, onMuteChange]);

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.src = "";
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !armed || !src) return;
    safePlayAudio(audio, () => {
      setPlaying(true);
      setBlocked(false);
    }, () => {
      // Browser denied autoplay: expose the control, never loop a retry.
      setBlocked(true);
    });
  }, [armed, src]);

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (playing && armed) {
        safePlayAudio(audio, () => setBlocked(false), () => setBlocked(true));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [playing, armed]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      safePlayAudio(audio, () => setBlocked(false), () => setBlocked(true));
    } else {
      audio.pause();
    }
  }, []);

  if (!src) return null;

  return (
    <div
      className={cn("flex items-center gap-1.5 rounded-full px-1.5 py-1", className)}
      style={{
        background: tone?.surface ?? "rgba(255,255,255,0.72)",
        border: `1px solid ${tone?.border ?? "rgba(0,0,0,0.08)"}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        aria-pressed={playing}
        className="grid h-8 w-8 place-items-center rounded-full transition active:scale-95"
        style={{ color: tone?.text ?? "#33203f" }}
      >
        <motion.span
          initial={false}
          animate={{ scale: playing ? 1 : 0.92 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <Icon name={playing ? "pause" : "play"} size={13} />
        </motion.span>
      </button>

      <button
        type="button"
        onClick={toggleMuted}
        aria-label={muted ? "Unmute music" : "Mute music"}
        aria-pressed={muted}
        className="grid h-9 w-9 place-items-center rounded-full transition active:scale-95"
        style={{ color: tone?.text ?? "#33203f" }}
      >
        <Icon name={muted ? "volume-off" : "volume-on"} size={15} />
      </button>

      {blocked ? (
        <span
          className="pr-2 text-[10px] leading-tight"
          style={{ color: tone?.text ?? "#33203f" }}
        >
          tap to play
        </span>
      ) : null}
    </div>
  );
}

function safePlayAudio(audio: HTMLAudioElement, onPlayed: () => void, onBlocked: () => void) {
  try {
    const result = audio.play() as Promise<void> | undefined;
    if (result && typeof result.then === "function") {
      result.then(onPlayed).catch(onBlocked);
    } else {
      onPlayed();
    }
  } catch {
    onBlocked();
  }
}
