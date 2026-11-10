import type { ApologyDraft, PublishedApology } from "@/types/apology";
import type { PresentationScene } from "@/types/scene";
import type { ApologyTheme } from "@/types/theme";

/** Both a creator draft and a published apology can drive the engine. */
export type ApologyContent = ApologyDraft | PublishedApology;

type Tone = "tender" | "warm" | "solemn" | "restrained";

function toneFor(themeId: string): Tone {
  switch (themeId) {
    case "romantic":
    case "cute":
    case "heartfelt":
      return "tender";
    case "friendship":
    case "fresh-start":
      return "warm";
    case "midnight":
    case "regret":
      return "solemn";
    default:
      return "restrained";
  }
}

interface ToneCopy {
  openingEyebrow: string;
  openingTitle: string;
  hurt: { eyebrow: string; title: string; cta: string };
  meaning: { eyebrow: string; title: string; cta: string };
  sorry: { eyebrow: string; title: string; cta: string };
  letter: { eyebrow: string; title: string; cta: string };
  envelope: { eyebrow: string; title: string; cta: string };
  memory: { eyebrow: string; title: string; cta: string };
  closing: { eyebrow: string; title: string; cta: string };
  response: { eyebrow: string; title: string; body: string };
}

const TONE_COPY: Record<Tone, ToneCopy> = {
  tender: {
    openingEyebrow: "a little something from me",
    openingTitle: "Hear me out?",
    hurt: { eyebrow: "the part I got wrong", title: "I know I hurt you", cta: "Keep going" },
    meaning: { eyebrow: "before anything else", title: "You mean everything", cta: "There's more" },
    sorry: { eyebrow: "no excuses", title: "I'm truly sorry", cta: "One more thing" },
    letter: { eyebrow: "for your eyes only", title: "A letter for you", cta: "Now open this" },
    envelope: { eyebrow: "sealed with care", title: "There's a note in here", cta: "Open it" },
    memory: { eyebrow: "the good parts", title: "Things I keep", cta: "I remember these" },
    closing: { eyebrow: "before you go", title: "Whatever you decide", cta: "I understand" },
    response: {
      eyebrow: "no pressure, ever",
      title: "Can you forgive me?",
      body: "You don't have to answer. And your answer stays with you unless you choose to share it.",
    },
  },
  warm: {
    openingEyebrow: "made just for you",
    openingTitle: "Got a minute?",
    hurt: { eyebrow: "being honest", title: "I got this wrong", cta: "Next" },
    meaning: { eyebrow: "for the record", title: "You're kind of a big deal to me", cta: "Still here?" },
    sorry: { eyebrow: "for real though", title: "I am sorry", cta: "One last bit" },
    letter: { eyebrow: "handwritten-ish", title: "A note for you", cta: "Something's waiting" },
    envelope: { eyebrow: "you'll want this", title: "Open it when you're ready", cta: "Tap the seal" },
    memory: { eyebrow: "our greatest hits", title: "Some of my favourites", cta: "Keep scrolling" },
    closing: { eyebrow: "last thing, promise", title: "However you feel is okay", cta: "Got it" },
    response: {
      eyebrow: "your call",
      title: "Where do you want to leave this?",
      body: "Pick whatever is true. Nothing is sent anywhere unless you explicitly share it.",
    },
  },
  solemn: {
    openingEyebrow: "something I couldn't say out loud",
    openingTitle: "Will you listen?",
    hurt: { eyebrow: "i", title: "I know I hurt you", cta: "Continue" },
    meaning: { eyebrow: "ii", title: "You mattered before this", cta: "Continue" },
    sorry: { eyebrow: "iii", title: "I'm sorry", cta: "Continue" },
    letter: { eyebrow: "iv", title: "What I couldn't finish saying", cta: "There is one more" },
    envelope: { eyebrow: "v", title: "Sealed, and still yours", cta: "Break the seal" },
    memory: { eyebrow: "vi", title: "What I keep coming back to", cta: "Continue" },
    closing: { eyebrow: "vii", title: "I'll leave the rest to you", cta: "I understand" },
    response: {
      eyebrow: "no expectation",
      title: "Is there anything left for us?",
      body: "You can close this and say nothing. That is a complete answer.",
    },
  },
  restrained: {
    openingEyebrow: "a private note",
    openingTitle: "If you have a moment",
    hurt: { eyebrow: "i", title: "I was wrong", cta: "Continue" },
    meaning: { eyebrow: "ii", title: "You are not small to me", cta: "Continue" },
    sorry: { eyebrow: "iii", title: "I am sorry", cta: "Continue" },
    letter: { eyebrow: "iv", title: "A letter", cta: "Continue" },
    envelope: { eyebrow: "v", title: "For you", cta: "Open" },
    memory: { eyebrow: "vi", title: "Some moments", cta: "Continue" },
    closing: { eyebrow: "vii", title: "That's everything", cta: "Close" },
    response: {
      eyebrow: "yours to decide",
      title: "Can you forgive me?",
      body: "There is no right answer, and no obligation to give one.",
    },
  },
};

/**
 * Builds the ordered scene list for a given apology + theme.
 * Scene order comes from the theme; content comes from the sender.
 * Every branch is data-driven so new themes need no engine changes.
 */
export function buildScenes(content: ApologyContent, theme: ApologyTheme): PresentationScene[] {
  const tone = TONE_COPY[toneFor(theme.id)];
  const hasPhotos = content.customization.photos.length > 0;
  const note = content.messages.personalNote.trim();
  const scenes: PresentationScene[] = [];

  for (const sceneId of theme.sceneIds) {
    switch (sceneId) {
      case "opening":
        scenes.push({
          id: "opening",
          type: "opening",
          eyebrow: tone.openingEyebrow,
          title: tone.openingTitle,
          ctaLabel: "Hear me out",
          characterState: "apologizing",
          animationPreset: theme.motion.preset,
        });
        break;

      case "hurt":
        scenes.push({
          id: "hurt",
          type: "message",
          eyebrow: tone.hurt.eyebrow,
          title: tone.hurt.title,
          body: content.messages.message1,
          content: { messageKey: "message1" },
          characterState: theme.characterStates.hurt ?? "sad",
          ctaLabel: tone.hurt.cta,
        });
        break;

      case "meaning":
        scenes.push({
          id: "meaning",
          type: "message",
          eyebrow: tone.meaning.eyebrow,
          title: tone.meaning.title,
          body: content.messages.message2,
          content: { messageKey: "message2" },
          characterState: theme.characterStates.meaning ?? "heart",
          ctaLabel: tone.meaning.cta,
        });
        break;

      case "sorry":
        scenes.push({
          id: "sorry",
          type: "message",
          eyebrow: tone.sorry.eyebrow,
          title: tone.sorry.title,
          body: content.messages.message3,
          content: { messageKey: "message3" },
          characterState: theme.characterStates.sorry ?? "apologizing",
          ctaLabel: tone.sorry.cta,
        });
        break;

      case "letter":
        // The envelope scene reveals this same note. Rendering both showed the
        // letter twice, so the envelope is the letter moment whenever a theme
        // has one; themes without an envelope keep this scene.
        if (theme.sceneIds.includes("envelope")) break;
        scenes.push({
          id: "letter",
          type: "letter",
          eyebrow: tone.letter.eyebrow,
          title: tone.letter.title,
          body: note,
          content: { personalNote: true, signature: true },
          characterState: "idle",
          ctaLabel: tone.letter.cta,
          optional: !note,
        });
        break;

      case "envelope":
        scenes.push({
          id: "envelope",
          type: "envelope",
          eyebrow: tone.envelope.eyebrow,
          title: tone.envelope.title,
          ctaLabel: tone.envelope.cta,
          characterState: "hugging",
          animationPreset: "envelope",
        });
        break;

      case "memory":
        // Only render when the sender supplied photos, unless the theme wants
        // a non-photo memory scene.
        if (!hasPhotos) break;
        scenes.push({
          id: "memory",
          type: "memory",
          eyebrow: tone.memory.eyebrow,
          title: tone.memory.title,
          content: { memoryStyle: content.customization.memoryStyle },
          ctaLabel: tone.memory.cta,
        });
        break;

      case "closing":
        scenes.push({
          id: "closing",
          type: "closing",
          eyebrow: tone.closing.eyebrow,
          title: tone.closing.title,
          // Not the personal note: that was delivered by the envelope.
          body: content.messages.message3,
          content: { signature: true },
          characterState: "flowers",
          ctaLabel: tone.closing.cta,
        });
        break;

      case "response":
        scenes.push({
          id: "response",
          type: "response",
          eyebrow: tone.response.eyebrow,
          title: tone.response.title,
          body: tone.response.body,
          characterState: "hopeful",
        });
        break;
    }
  }

  const visible = scenes.filter((s) => !s.optional || Boolean(s.body?.trim()));
  return visible.length > 0 ? visible : scenes;
}

export function sceneCountLabel(index: number, total: number): string {
  return `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}
