/**
 * Platform copy.
 *
 * Everything the platform says about itself lives here. Experience-specific
 * wording stays in the module that owns it (`experiences/apology`,
 * `experiences/birthday`), so adding a category never means editing the
 * homepage's voice.
 */
export const PLATFORM_COPY = {
  nav: {
    home: "Home",
    explore: "Explore",
    collection: "My Experiences",
    account: "Sign in",
  },

  hero: {
    eyebrow: "A LITTLE SOMETHING FOR SOMEONE SPECIAL",
    headline: "Some things deserve more than a message.",
    supporting:
      "Turn what you feel into something they can experience. Create personalised surprises, heartfelt messages, celebrations, and moments worth remembering.",
    primaryCta: "Create something",
    secondaryCta: "Explore experiences",
    reassurance: "Create freely. Preview everything. Share a private link when you're ready.",
  },

  experiences: {
    eyebrow: "FIND YOUR MOMENT",
    heading: "Whatever you want to say, there's a way to make it special.",
    supporting:
      "From heartfelt apologies to birthday surprises and important questions, choose what you want to express.",
    start: "Start this one",
    upcoming: "Coming soon",
  },

  worlds: {
    eyebrow: "MAKE IT YOURS",
    heading: "Every feeling has its own kind of world.",
    supporting:
      "Choose an atmosphere that feels right. From playful and colourful to intimate, cinematic, and understated, every experience can have its own visual personality.",
    apologyGroup: "Apology worlds",
    birthdayGroup: "Birthday worlds",
  },

  howItWorks: {
    eyebrow: "THOUGHTFULLY SIMPLE",
    heading: "From a little idea to a moment they'll remember.",
    steps: [
      {
        step: "01",
        title: "Choose your moment",
        body: "Decide what you want to express, celebrate, or ask.",
      },
      {
        step: "02",
        title: "Make it yours",
        body: "Choose a visual world, add your words, photos, music, and personal touches. Preview every scene as you go.",
      },
      {
        step: "03",
        title: "Send something special",
        body: "Create a private link and share it directly with someone who matters.",
      },
    ],
  },

  recipient: {
    eyebrow: "ON THE OTHER SIDE",
    heading: "Made to be experienced, not just opened.",
    description:
      "Every experience is designed to feel personal. Whether it's a celebration, an apology, or a question that changes everything, the person receiving it gets a moment created especially for them.",
    /** Only claims verified in the implementation. */
    points: [
      "Personalised presentation and interactive scenes",
      "Music can be muted or turned off entirely",
      "Links are unguessable, unindexed and revocable",
      "No account needed to open a link",
      "Responses never leave the recipient's device",
      "Reduced-motion is respected throughout",
    ],
    fallbackTitle: "A little something for you",
    fallbackBody: "This little experience was made for you.",
  },

  personalisation: {
    eyebrow: "THE LITTLE DETAILS",
    heading: "Make it unmistakably yours.",
    description:
      "Bring your own memories, colours, music, words, and personality into the experience.",
    items: [
      "Personal photos",
      "Music",
      "Custom colours",
      "Themes and visual styles",
      "Animated stickers and decorative elements",
      "Personalised text",
    ],
  },

  closing: {
    heading: "There's always something worth saying.",
    supporting: "Make the moment a little more memorable.",
    cta: "Create something",
  },

  footer: {
    description:
      "Koi Koi is a place to create thoughtful, personalised experiences for the people who matter.",
    retention:
      "Links last at most seven days, then the experience and its files are deleted.",
    privacyLink: "What we store",
  },

  dashboard: {
    title: "My Experiences",
    description:
      "Everything you've made lives here. Links last at most seven days; expired experiences are deleted, files and all.",
    emptyHeading: "Nothing here just yet.",
    emptyBody:
      "Your creations will find a home here. Start with something you want to say, celebrate, or share.",
    emptyCta: "Create your first experience",
    newCta: "Create something",
  },

  auth: {
    signInHeading: "Welcome back",
    signInBody: "Sign in to see the experiences you've made.",
    signUpHeading: "Create your account",
    signUpBody: "Keep every experience you create in one place.",
  },

  notFound: {
    title: "This little experience isn't open right now.",
    body: "Links like this are temporary, and this one may have expired or been closed by the person who shared it.",
  },

  explore: {
    title: "What would you like to create?",
    description: "Pick the feeling first. You can preview everything before you share it.",
  },
} as const;

/** Neutral creator terminology, used wherever chrome is shared. */
export const CREATOR_TERMS = {
  item: "experience",
  items: "experiences",
  collection: "My Experiences",
  create: "Create something",
} as const;
