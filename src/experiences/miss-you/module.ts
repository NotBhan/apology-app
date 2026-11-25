import type { ExperienceModule, ExperienceReplyConfig } from "../types";
import { missYouContentSchema } from "./schema";
import { MISS_YOU_THEMES } from "./themes";

export const missYouReplyConfig: ExperienceReplyConfig = {
  enabled: true,
  inviteLabel: (senderName: string) => `Send a note back to ${senderName}`,
  experienceInviteLabel: (senderName: string) => `Create an experience for ${senderName}`,
  allowExperienceReply: true,
  modalTitle: (senderName: string) => `Write back to ${senderName}`,
  modalSubtitle: "Send back a note across the space between you or share a snapshot from today",
  messagePlaceholder: "Tell them what you are looking forward to when you meet again...",
  emotions: [
    { key: "miss-too", label: "Miss you too", description: "Feeling every mile right now" },
    { key: "counting-days", label: "Counting down", description: "Looking forward to being together" },
    { key: "call-soon", label: "Call me tonight", description: "Would love to hear how your day went" },
    { key: "holding-on", label: "Holding this close", description: "Re-reading every line" },
  ],
  emotionBadgePrefix: "Mood",
  presets: [
    "Opening this made my whole evening warmer — thank you for writing it.",
    "Save a slow coffee morning for us the first weekend we're in the same place.",
    "Thinking right back of you tonight. Text me when you're up for a call.",
  ],
  accent: "#9f3e67",
};

/**
 * The I Miss You experience.
 *
 * Bridges physical or emotional distance with personal notes, everyday sparks,
 * shared photographs, and anticipation of meeting again.
 */
export const missYouExperience: ExperienceModule = {
  id: "miss-you",
  name: "I Miss You",
  tagline: "Bridge miles between you with shared memories, daily sparks, and looking ahead to reunion.",
  category: "love",
  accent: "#9f3e67",
  draftSchema: missYouContentSchema,
  themeIds: MISS_YOU_THEMES.map((theme) => theme.id),
  defaultThemeId: "dusk-postage",
  sceneIds: ["arrival", "distance", "letter", "memories", "reunion"],
  replyConfig: missYouReplyConfig,
};
