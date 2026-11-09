"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { AudioChoice } from "@/types/apology";
import { MUSIC_TRACKS, getTrack } from "@/content/tracks";
import { cn } from "@/lib/cn";

interface MusicPanelProps {
  value: AudioChoice;
  themeDefaultTrackId?: string;
  onChange: (value: AudioChoice) => void;
  onUpload: (file: File) => Promise<{ assetId: string }>;
}

export function MusicPanel({ value, themeDefaultTrackId, onChange, onUpload }: MusicPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const defaultTrack = getTrack(themeDefaultTrackId);

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { assetId } = await onUpload(file);
      onChange({ ...value, source: "custom", assetId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5">
        <ModeRow
          label="Theme soundtrack"
          description={defaultTrack ? `${defaultTrack.title} · ${defaultTrack.mood}` : "No default track"}
          checked={value.source === "default"}
          onSelect={() => onChange({ ...value, source: "default" })}
        />
        <ModeRow
          label="Another track"
          description="Pick from the built-in ambient beds"
          checked={value.source === "custom" && Boolean(value.trackId)}
          onSelect={() => onChange({ ...value, source: "custom", trackId: value.trackId ?? MUSIC_TRACKS[0].id })}
        />
        <ModeRow
          label="My own audio"
          description="MP3, WAV, OGG or WebM · up to 4 MB"
          checked={value.source === "custom" && Boolean(value.assetId)}
          onSelect={() => undefined}
        />
        <ModeRow
          label="No music"
          description="Silence is a valid choice"
          checked={value.source === "none"}
          onSelect={() => onChange({ ...value, source: "none" })}
        />
      </div>

      {value.source === "custom" && !value.assetId ? (
        <div className="space-y-2 rounded-2xl border border-[#ece2f6] bg-[#fbf8ff] p-3">
          {MUSIC_TRACKS.map((track) => {
            const active = value.trackId === track.id;
            return (
              <div key={track.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, source: "custom", trackId: track.id })}
                  aria-pressed={active}
                  className={cn(
                    "flex-1 rounded-xl px-3 py-2 text-left transition",
                    active ? "bg-white shadow-sm" : "hover:bg-white/70",
                  )}
                >
                  <span className="block text-[0.82rem] font-semibold text-[#3d2a50]">
                    {track.title}
                  </span>
                  <span className="block text-[0.68rem] text-[#8a7a9c]">{track.mood}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewing(previewing === track.id ? null : track.id)}
                  className="rounded-full border border-[#e3d7ef] px-3 py-1 text-[0.68rem] text-[#5b3f7d]"
                >
                  {previewing === track.id ? "Stop" : "Preview"}
                </button>
              </div>
            );
          })}
          {previewing ? (
            <TrackPreview
              key={previewing}
              src={getTrack(previewing)?.src}
              onEnded={() => setPreviewing(null)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]">
          Upload audio
        </label>
        <input
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
          className="block w-full text-[0.78rem] text-[#6b5580] file:mr-3 file:rounded-full file:border-0 file:bg-[#f2ecfa] file:px-4 file:py-2 file:text-[0.78rem] file:font-semibold file:text-[#5b3f7d]"
        />
        {uploading ? <p className="text-[0.72rem] text-[#8a7a9c]">Uploading…</p> : null}
        {error ? <p className="text-[0.72rem] text-[#b91c1c]">{error}</p> : null}
        {value.assetId ? (
          <p className="text-[0.72rem] text-[#3f7a4a]">Your audio is attached.</p>
        ) : null}
      </div>

      {value.source !== "none" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="volume"
              className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#7c6892]"
            >
              Volume
            </label>
            <span className="text-[0.72rem] tabular-nums text-[#8a7a9c]">
              {Math.round(value.volume * 100)}%
            </span>
          </div>
          <input
            id="volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={value.volume}
            onChange={(event) => onChange({ ...value, volume: Number(event.target.value) })}
            className="w-full accent-[#6d3fa8]"
          />
        </div>
      ) : null}
    </div>
  );
}

function ModeRow({
  label,
  description,
  checked,
  onSelect,
}: {
  label: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition",
        checked ? "border-[#b18ade] bg-white" : "border-[#ece2f6] bg-white/60 hover:border-[#d9c8ec]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
          checked ? "border-[#6d3fa8]" : "border-[#d8c9e8]",
        )}
      >
        {checked ? <span className="h-2 w-2 rounded-full bg-[#6d3fa8]" /> : null}
      </span>
      <span>
        <span className="block text-[0.85rem] font-semibold text-[#33203f]">{label}</span>
        <span className="block text-[0.72rem] text-[#8a7a9c]">{description}</span>
      </span>
    </button>
  );
}

function TrackPreview({ src, onEnded }: { src?: string; onEnded: () => void }) {
  if (!src) return null;
  return (
    <motion.audio
      src={src}
      autoPlay
      controls
      onEnded={onEnded}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full"
    />
  );
}
