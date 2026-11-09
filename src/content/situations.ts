import type { SituationKey } from "@/types/apology";
import type { IconName } from "@/components/ui/icons";

export interface SituationOption {
  key: SituationKey;
  label: string;
  hint: string;
  /** Functional symbol id, documented in `src/lib/design/symbols.ts`. */
  icon: IconName;
}

export const SITUATIONS: SituationOption[] = [
  {
    key: "said-hurtful",
    label: "I said something hurtful",
    hint: "Words I can't take back.",
    icon: "message-circle-off",
  },
  {
    key: "fight",
    label: "We had a fight",
    hint: "It got louder than it should have.",
    icon: "heart-crack",
  },
  {
    key: "not-there",
    label: "I wasn't there for them",
    hint: "I missed the moment that mattered.",
    icon: "clock",
  },
  {
    key: "broke-promise",
    label: "I broke a promise",
    hint: "I said I would, and I didn't.",
    icon: "link-off",
  },
  {
    key: "forgot-special",
    label: "I forgot something special",
    hint: "A date I should have remembered.",
    icon: "calendar-off",
  },
  {
    key: "other",
    label: "Anything else",
    hint: "I'll explain it in my own words.",
    icon: "pen-line",
  },
];

export const SITUATION_LABELS: Record<SituationKey, string> = {
  "said-hurtful": "Something I said",
  fight: "A fight we had",
  "not-there": "A moment I missed",
  "broke-promise": "A promise I broke",
  "forgot-special": "A date I forgot",
  other: "Something I need to say",
};

export function resolveSituationLabel(situation: SituationKey, custom?: string): string {
  if (situation === "other" && custom?.trim()) return custom.trim();
  return SITUATION_LABELS[situation];
}
