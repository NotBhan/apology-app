import type { ExperienceModule, ExperienceReplyConfig } from "../types";
import { birthdayContentSchema } from "./schema";
import { BIRTHDAY_THEMES } from "./themes";

export const birthdayReplyConfig: ExperienceReplyConfig = {
  enabled: true,
  inviteLabel: () => "Say Thank You",
  experienceInviteLabel: (senderName: string) => `Send a letter to ${senderName}`,
  allowExperienceReply: true,
  modalTitle: (senderName: string) => `Thank ${senderName}`,
  modalSubtitle: "Send a thank-you note, joyous wish, or celebration photos",
  messagePlaceholder: "Write a thank-you note, share a birthday wish, or describe your day...",
  emotions: [
    { key: "grateful", label: "So grateful", description: "Your wish made my day special" },
    { key: "touched", label: "Deeply touched", description: "This brought tears to my eyes" },
    { key: "joyful", label: "Filled with joy", description: "Smiling from ear to ear" },
    { key: "celebrating", label: "Party mode", description: "Ready to celebrate together!" },
  ],
  emotionBadgePrefix: "Vibe",
  presets: [
    "Thank you so much for the wonderful birthday wish!",
    "This was the sweetest surprise ever. You made my day!",
    "Can't wait to catch up and celebrate together soon!",
  ],
  accent: "#e8590c",
};

/**
 * The birthday experience.
 *
 * Shares the platform (auth, storage, publishing, expiry, deletion) but owns
 * its content schema, themes and scene vocabulary. It has no `hurt` or `sorry`
 * scene — that is the point of a module rather than a template switch.
 */
export const birthdayExperience: ExperienceModule = {
  id: "birthday",
  name: "Happy Birthday",
  tagline: "A celebration they can open, not just read.",
  category: "celebration",
  accent: "#e8590c",
  draftSchema: birthdayContentSchema,
  themeIds: BIRTHDAY_THEMES.map((theme) => theme.id),
  defaultThemeId: "confetti",
  sceneIds: ["opening", "wish", "message", "gallery", "finale"],
  replyConfig: birthdayReplyConfig,
};
