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
          <Icon name={playing ? "pause" : "play"} size={13} />
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
