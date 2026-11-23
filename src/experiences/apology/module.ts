import { draftPayloadSchema } from "@/lib/validation/apology";
import { THEME_IDS } from "@/types/theme";
import type { ExperienceModule, ExperienceReplyConfig } from "../types";

export const apologyReplyConfig: ExperienceReplyConfig = {
  enabled: true,
  modalTitle: (senderName: string) => `Reply to ${senderName}`,
  modalSubtitle: "Leave an intimate, heartfelt note",
  messagePlaceholder: "Write your reply...",
  emotions: [
    { key: "forgive", label: "I forgive you", description: "I'm ready to move on" },
    { key: "time", label: "I need some time", description: "Not yet, but not never" },
    { key: "talk", label: "Let's talk properly", description: "In person, when we're calm" },
    { key: "appreciate", label: "I appreciate this", description: "Thank you for saying it" },
  ],
  emotionBadgePrefix: "Feeling",
  presets: [
    "Thank you for reaching out and saying this.",
    "I appreciate you taking the time to write to me.",
    "Let's talk soon when we are both ready.",
  ],
  accent: "#6d3fa8",
};

/**
 * The apology experience.
 *
 * This is a thin description of what already exists: the schema, themes and
 * scene vocabulary are unchanged, so adding the registry cannot alter
 * behaviour. `build-scenes.ts` and the theme registry stay where they are; the
 * module points at them rather than duplicating them.
 */
export const apologyExperience: ExperienceModule = {
  id: "apology",
  name: "I'm Sorry",
  tagline: "Say it properly, without the pressure of a reply.",
  category: "apology",
  accent: "#6d3fa8",
  draftSchema: draftPayloadSchema,
  themeIds: THEME_IDS,
  defaultThemeId: "romantic",
  sceneIds: [
    "opening",
    "hurt",
    "meaning",
    "sorry",
    "letter",
    "envelope",
    "memory",
    "closing",
    "response",
  ],
  replyConfig: apologyReplyConfig,
};
