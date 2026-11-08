"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface AudioControllerProps {
  /** Resolved track URL, or undefined when music is disabled. */
  src?: string;
  volume: number;
  /** Playback only begins after a deliberate recipient gesture. */
  armed: boolean;
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
  className,
  tone,
}: AudioControllerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);

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
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setBlocked(false);
      })
      .catch(() => {
        // Browser denied autoplay: expose the control, never loop a retry.
        setBlocked(true);
      });
  }, [armed, src]);

  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (playing && armed) void audio.play().catch(() => setBlocked(true));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [playing, armed]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
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
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </motion.span>
      </button>

      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        aria-label={muted ? "Unmute music" : "Mute music"}
        aria-pressed={muted}
        className="grid h-8 w-8 place-items-center rounded-full transition active:scale-95"
        style={{ color: tone?.text ?? "#33203f" }}
      >
        {muted ? <MutedGlyph /> : <SoundGlyph />}
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

function PlayGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <path d="M3 1.8v8.4c0 .5.55.8.97.54l6.2-4.2a.64.64 0 0 0 0-1.08l-6.2-4.2A.64.64 0 0 0 3 1.8Z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
      <rect x="2.4" y="1.8" width="2.4" height="8.4" rx="1" />
      <rect x="7.2" y="1.8" width="2.4" height="8.4" rx="1" />
    </svg>
  );
}

function SoundGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2 5.2h2.2L7 2.8v8.4L4.2 8.8H2z" fill="currentColor" stroke="none" />
      <path d="M9.2 4.6a3.2 3.2 0 0 1 0 4.8M11 3a5.6 5.6 0 0 1 0 8" strokeLinecap="round" />
    </svg>
  );
}

function MutedGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M2 5.2h2.2L7 2.8v8.4L4.2 8.8H2z" fill="currentColor" stroke="none" />
      <path d="m9.4 5.4 3.2 3.2M12.6 5.4l-3.2 3.2" strokeLinecap="round" />
    </svg>
  );
}
