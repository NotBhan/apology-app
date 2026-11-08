import type { Language, SituationKey } from "@/types/apology";

export type StarterField = "message1" | "message2" | "message3" | "personalNote";

export interface MessageStarter {
  id: string;
  field: StarterField;
  /** Which situations this starter suits; empty means all. */
  situations?: SituationKey[];
  text: Record<Language, string>;
}

/**
 * Starters are editable seeds. Selecting one APPENDS into the field and is
 * always reversible by the sender - nothing is auto-filled or forced.
 */
export const MESSAGE_STARTERS: MessageStarter[] = [
  {
    id: "m1-hurt",
    field: "message1",
    situations: ["said-hurtful", "fight"],
    text: {
      en: "I keep replaying what I said, and honestly, it wasn't fair to you.",
      hinglish:
        "Main baar baar soch raha hoon ki maine kya kaha, aur sach kahun to woh tumhare saath sahi nahi tha.",
    },
  },
  {
    id: "m1-missed",
    field: "message1",
    situations: ["not-there", "forgot-special"],
    text: {
      en: "You needed me there, and I wasn't. That's on me, not on you.",
      hinglish:
        "Tumhe meri zaroorat thi aur main wahan nahi tha. Yeh meri galti hai, tumhari nahi.",
    },
  },
  {
    id: "m1-promise",
    field: "message1",
    situations: ["broke-promise"],
    text: {
      en: "I made you a promise and I broke it. You had every reason to be disappointed.",
      hinglish:
        "Maine tumse ek vaada kiya tha aur maine tod diya. Tumhara disappoint hona bilkul jaayaz tha.",
    },
  },
  {
    id: "m1-open",
    field: "message1",
    text: {
      en: "I know sorry doesn't fix it on its own, so I wanted to say this properly.",
      hinglish:
        "Mujhe pata hai sirf sorry bolne se sab theek nahi hota, isliye main yeh theek se kehna chahta hoon.",
    },
  },
  {
    id: "m2-value",
    field: "message2",
    text: {
      en: "You matter more to me than one bad day, and I hate that I made you feel small.",
      hinglish:
        "Ek bura din tumse badi cheez nahi ho sakta. Mujhe bura lagta hai ki maine tumhe chhota feel karaya.",
    },
  },
  {
    id: "m2-miss",
    field: "message2",
    text: {
      en: "The last few days felt quieter than they should, and I noticed every bit of it.",
      hinglish:
        "Pichhle kuch din zaroorat se zyada shaant lage, aur maine woh har pal notice kiya.",
    },
  },
  {
    id: "m2-grateful",
    field: "message2",
    situations: ["forgot-special", "not-there"],
    text: {
      en: "I don't say it enough: I'm lucky you're in my life, and I don't take that for granted.",
      hinglish:
        "Main yeh kaafi nahi bolta: meri zindagi mein tumhara hona meri kismat hai, aur main ise halke mein nahi leta.",
    },
  },
  {
    id: "m3-change",
    field: "message3",
    text: {
      en: "Here's what I'm changing, not just saying: I'll think before I react, and I'll check in more.",
      hinglish:
        "Sirf keh nahi raha, main yeh badal raha hoon: react karne se pehle sochunga, aur zyada poochha karunga.",
    },
  },
  {
    id: "m3-time",
    field: "message3",
    text: {
      en: "If you need space, take it. I'll be here whenever you're ready, and I won't rush you.",
      hinglish:
        "Agar tumhe space chahiye to le lo. Jab bhi tum ready ho, main yahin hoon - koi jaldi nahi.",
    },
  },
  {
    id: "m3-listen",
    field: "message3",
    text: {
      en: "When we talk, I want to listen first, and stay quiet long enough to actually hear you.",
      hinglish:
        "Jab hum baat karein, pehle main sunna chahta hoon - itna chup rehkar ki tum sach mein sunaayi do.",
    },
  },
  {
    id: "note-tiny",
    field: "personalNote",
    text: {
      en: "I wrote this late at night, when I couldn't stop thinking about your side of it.",
      hinglish:
        "Yeh maine raat ko likha, jab main tumhare side ke baare mein sochna band nahi kar pa raha tha.",
    },
  },
  {
    id: "note-onething",
    field: "personalNote",
    text: {
      en: "One thing I always remember: the way you laugh when you think nobody's watching.",
      hinglish:
        "Ek baat main hamesha yaad rakhta hoon: jab tumhe koi dekh nahi raha hota, tab tum kaise hasti ho.",
    },
  },
];

export const STARTERS_BY_FIELD: Record<StarterField, MessageStarter[]> = {
  message1: MESSAGE_STARTERS.filter((s) => s.field === "message1"),
  message2: MESSAGE_STARTERS.filter((s) => s.field === "message2"),
  message3: MESSAGE_STARTERS.filter((s) => s.field === "message3"),
  personalNote: MESSAGE_STARTERS.filter((s) => s.field === "personalNote"),
};

export function pickStarters(
  field: StarterField,
  situation: SituationKey,
  language: Language,
  limit = 3,
): { id: string; text: string }[] {
  const relevant = MESSAGE_STARTERS.filter(
    (s) => s.field === field && (!s.situations || s.situations.includes(situation)),
  );
  return relevant.slice(0, limit).map((s) => ({ id: s.id, text: s.text[language] }));
}

export const FIELD_LIMITS: Record<StarterField, number> = {
  message1: 320,
  message2: 320,
  message3: 320,
  personalNote: 1200,
};
