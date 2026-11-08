export interface MusicTrack {
  id: string;
  title: string;
  mood: string;
  /** Public path. Tracks ship as small, loopable synthesised beds (64 kbps mono MP3). */
  src: string;
  durationSeconds: number;
  themes: string[];
}

/**
 * Only tracks that actually exist in /public/audio are listed. The app plays
 * these through HTMLAudioElement; nothing streams from third-party services.
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "soft-lavender",
    title: "Soft Lavender",
    mood: "Warm, tender",
    src: "/audio/soft-lavender.mp3",
    durationSeconds: 24,
    themes: ["romantic", "cute", "heartfelt"],
  },
  {
    id: "paper-morning",
    title: "Paper Morning",
    mood: "Gentle, hopeful",
    src: "/audio/paper-morning.mp3",
    durationSeconds: 24,
    themes: ["heartfelt", "minimal", "fresh-start"],
  },
  {
    id: "midnight-glow",
    title: "Midnight Glow",
    mood: "Quiet, cinematic",
    src: "/audio/midnight-glow.mp3",
    durationSeconds: 24,
    themes: ["midnight", "regret"],
  },
  {
    id: "sunlit-room",
    title: "Sunlit Room",
    mood: "Bright, easy",
    src: "/audio/sunlit-room.mp3",
    durationSeconds: 24,
    themes: ["friendship", "fresh-start"],
  },
];

export const TRACKS_BY_ID = new Map(MUSIC_TRACKS.map((t) => [t.id, t]));

export function getTrack(id: string | undefined): MusicTrack | undefined {
  if (!id) return undefined;
  return TRACKS_BY_ID.get(id);
}
