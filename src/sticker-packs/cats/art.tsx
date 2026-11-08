"use client";

import type { CharacterState } from "@/types/sticker";
import type { StickerArtProps, StickerPackArt } from "../types";

type CharacterProps = StickerArtProps & { state: CharacterState };

type EyeStyle = "open" | "blink" | "happy" | "sad" | "closed" | "up" | "content";
type MouthStyle = "neutral" | "smile" | "grin" | "frown" | "wobble" | "tiny" | "sing";

interface CatPose {
  /** transform attribute for the body + paws group */
  body: string;
  /** transform attribute for the head group (ears ride along) */
  head: string;
  earL: string;
  earR: string;
  tail: string;
  tip: readonly [number, number];
  arms: readonly string[];
  eyes: EyeStyle;
  mouth: MouthStyle;
}

const POSE: Record<CharacterState, CatPose> = {
  idle: {
    body: "",
    head: "",
    earL: "rotate(-5 78 58)",
    earR: "rotate(5 122 58)",
    tail: "M132 156 C156 164 172 146 166 124 C162 110 150 106 144 114",
    tip: [144, 114],
    arms: ["M80 130 C72 140 71 150 75 157", "M120 130 C128 140 129 150 125 157"],
    eyes: "open",
    mouth: "neutral",
  },
  blink: {
    body: "",
    head: "",
    earL: "rotate(-5 78 58)",
    earR: "rotate(5 122 58)",
    tail: "M132 156 C156 164 172 146 166 124 C162 110 150 106 144 114",
    tip: [144, 114],
    arms: ["M80 130 C72 140 71 150 75 157", "M120 130 C128 140 129 150 125 157"],
    eyes: "blink",
    mouth: "neutral",
  },
  happy: {
    body: "translate(0 -2)",
    head: "translate(0 -4) rotate(-4 100 118)",
    earL: "rotate(-12 78 58)",
    earR: "rotate(12 122 58)",
    tail: "M132 156 C162 158 176 132 160 112 C152 102 140 104 138 114",
    tip: [138, 114],
    arms: ["M80 128 C66 128 57 116 58 104", "M120 128 C134 128 143 116 142 104"],
    eyes: "happy",
    mouth: "grin",
  },
  sad: {
    body: "translate(0 4)",
    head: "translate(0 7) rotate(3 100 118)",
    earL: "rotate(-26 78 58)",
    earR: "rotate(26 122 58)",
    tail: "M132 164 C150 176 168 172 172 160",
    tip: [172, 160],
    arms: ["M78 132 C73 144 76 153 83 156", "M122 132 C127 144 124 153 117 156"],
    eyes: "sad",
    mouth: "frown",
  },
  crying: {
    body: "translate(0 5)",
    head: "translate(0 9) rotate(2 100 118)",
    earL: "rotate(-32 78 58)",
    earR: "rotate(32 122 58)",
    tail: "M132 166 C148 178 164 174 166 164",
    tip: [166, 164],
    arms: ["M80 132 C69 124 68 110 75 101", "M120 132 C131 124 132 110 125 101"],
    eyes: "closed",
    mouth: "wobble",
  },
  hugging: {
    body: "translate(0 1)",
    head: "translate(0 2) rotate(-12 100 118)",
    earL: "rotate(-8 78 58)",
    earR: "rotate(8 122 58)",
    tail: "M132 160 C152 172 170 158 158 144",
    tip: [158, 144],
    arms: ["M74 126 C82 150 118 150 126 126"],
    eyes: "content",
    mouth: "smile",
  },
  apologizing: {
    body: "translate(0 4)",
    head: "translate(0 12)",
    earL: "rotate(-40 78 58)",
    earR: "rotate(40 122 58)",
    tail: "M132 166 C146 176 160 174 162 166",
    tip: [162, 166],
    arms: ["M80 130 C88 142 93 146 99 147", "M120 130 C112 142 107 146 101 147"],
    eyes: "closed",
    mouth: "tiny",
  },
  flowers: {
    body: "translate(0 1)",
    head: "translate(0 1) rotate(-6 100 118)",
    earL: "rotate(-4 78 58)",
    earR: "rotate(10 122 58)",
    tail: "M132 158 C156 162 170 148 164 130",
    tip: [164, 130],
    arms: ["M80 128 C80 140 84 147 90 150", "M120 128 C120 140 116 147 110 150"],
    eyes: "happy",
    mouth: "smile",
  },
  heart: {
    body: "",
    head: "translate(0 1) rotate(4 100 118)",
    earL: "rotate(4 78 58)",
    earR: "rotate(-4 122 58)",
    tail: "M132 158 C156 164 170 148 162 132",
    tip: [162, 132],
    arms: ["M76 128 C77 142 84 147 91 143", "M124 128 C123 142 116 147 109 143"],
    eyes: "content",
    mouth: "smile",
  },
  hopeful: {
    body: "translate(0 -1)",
    head: "translate(0 -8) rotate(-2 100 118)",
    earL: "rotate(-10 78 58)",
    earR: "rotate(10 122 58)",
    tail: "M132 158 C158 156 168 132 154 116",
    tip: [154, 116],
    arms: ["M80 130 C74 140 74 150 78 156", "M120 130 C126 140 126 150 122 156"],
    eyes: "up",
    mouth: "tiny",
  },
  celebrate: {
    body: "translate(0 -3)",
    head: "translate(0 -6) rotate(-3 100 118)",
    earL: "rotate(-14 78 58)",
    earR: "rotate(14 122 58)",
    tail: "M132 154 C164 152 178 124 156 108",
    tip: [156, 108],
    arms: ["M78 126 C64 118 55 102 58 90", "M122 126 C136 118 145 102 142 90"],
    eyes: "happy",
    mouth: "sing",
  },
};

const CSS = `
.cats-breathe { animation: cc-breathe 4.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 98%; }
.cats-blink { animation: cc-blink 5.4s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.cats-settle { animation: cats-settle 720ms cubic-bezier(.22,1.1,.36,1) both; transform-box: fill-box; transform-origin: 50% 98%; }
.cats-sparkle { animation: cats-sparkle 1.1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 50%; }
@keyframes cats-settle { from { transform: translateY(-5px) scale(.982); opacity: .55 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes cats-sparkle { 0%, 100% { transform: scale(.8); opacity: .3 } 50% { transform: scale(1.06); opacity: 1 } }
@media (prefers-reduced-motion: reduce) { .cats-breathe, .cats-blink, .cats-settle, .cats-sparkle { animation: none } }
`;

const INK = "#3a2618";

function CatEyes({ mode, animate }: { mode: EyeStyle; animate: boolean }) {
  const blinkClass = animate ? "cats-blink" : undefined;
  if (mode === "open" || mode === "up") {
    const dy = mode === "up" ? -4 : 0;
    return (
      <g>
        <path d="M75 84 Q84 71 93 84 Q84 94 75 84 Z" fill={INK} />
        <path d="M107 84 Q116 71 125 84 Q116 94 107 84 Z" fill={INK} />
        <circle cx="84" cy={85 + dy} r="5.1" fill="#b4762f" />
        <circle cx="116" cy={85 + dy} r="5.1" fill="#b4762f" />
        <ellipse cx="84" cy={85 + dy} rx="2.5" ry="4.2" fill="#2b1a11" />
        <ellipse cx="116" cy={85 + dy} rx="2.5" ry="4.2" fill="#2b1a11" />
        <circle cx="86.5" cy={80 + dy} r="2.1" fill="#fff" opacity="0.9" />
        <circle cx="118.5" cy={80 + dy} r="2.1" fill="#fff" opacity="0.9" />
      </g>
    );
  }
  if (mode === "blink") {
    return (
      <g className={blinkClass}>
        <path d="M75 86 Q84 90 93 86" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M107 86 Q116 90 125 86" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mode === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path d="M75 87 Q84 74 93 87" />
        <path d="M107 87 Q116 74 125 87" />
      </g>
    );
  }
  if (mode === "content") {
    return (
      <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
        <path d="M76 87 Q84 79 92 87" />
        <path d="M108 87 Q116 79 124 87" />
      </g>
    );
  }
  if (mode === "sad") {
    return (
      <g>
        {/* outer corners droop, inner corners lift */}
        <path d="M75 87 Q85 79 93 85 Q84 93 75 87 Z" fill={INK} />
        <path d="M107 85 Q115 79 125 87 Q116 93 107 85 Z" fill={INK} />
        <circle cx="86" cy="87.5" r="1.9" fill="#fff" opacity="0.8" />
        <circle cx="118" cy="87.5" r="1.9" fill="#fff" opacity="0.8" />
      </g>
    );
  }
  // closed — used for crying and apologising
  return (
    <g fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round">
      <path d="M75 85 Q84 93 93 85" />
      <path d="M107 85 Q116 93 125 85" />
    </g>
  );
}

function CatMouth({ mode }: { mode: MouthStyle }) {
  if (mode === "grin") {
    return (
      <g>
        <path d="M90 101 Q100 117 110 101 Z" fill="#8d4a4a" />
        <ellipse cx="100" cy="109" rx="4.6" ry="3" fill="#f08a92" />
      </g>
    );
  }
  if (mode === "sing") {
    return (
      <g>
        <ellipse cx="100" cy="106" rx="6" ry="7" fill="#8d4a4a" />
        <ellipse cx="100" cy="110" rx="3.6" ry="2.4" fill="#f08a92" />
      </g>
    );
  }
  if (mode === "smile") {
    return <path d="M91 102 Q100 111 109 102" fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round" />;
  }
  if (mode === "frown") {
    return <path d="M92 106 Q100 99 108 106" fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round" />;
  }
  if (mode === "wobble") {
    return (
      <path d="M92 105 q4 -4 8 0 q4 4 8 -1" fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round" />
    );
  }
  if (mode === "tiny") {
    return <path d="M96 104 q4 4 8 0" fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round" />;
  }
  return (
    <g fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round">
      <path d="M100 98 L100 101" />
      <path d="M100 101 q-5 4 -9 0" />
      <path d="M100 101 q5 4 9 0" />
    </g>
  );
}

function Bouquet() {
  return (
    <g>
      <g fill="none" stroke="#7fa14c" strokeWidth="3" strokeLinecap="round">
        <path d="M90 152 C88 144 84 136 82 128" />
        <path d="M97 152 C97 144 97 134 97 126" />
        <path d="M104 152 C106 144 108 138 110 132" />
        <path d="M111 152 C114 146 118 142 121 138" />
      </g>
      <ellipse cx="86" cy="142" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(-34 86 142)" />
      <ellipse cx="108" cy="145" rx="7" ry="3.4" fill="#8fb45a" transform="rotate(32 108 145)" />
      {/* daisy */}
      <g transform="translate(80 126)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <ellipse key={a} cx="0" cy="-9" rx="4" ry="7" fill="#fffaf2" transform={`rotate(${a})`} />
        ))}
        <circle cx="0" cy="0" r="4.4" fill="#f6c25a" />
        <circle cx="-1.2" cy="-1.4" r="1.4" fill="#fbe6a8" />
      </g>
      {/* rose */}
      <g transform="translate(97 122)">
        <circle cx="0" cy="0" r="10" fill="#ef9aa7" stroke="#dd8394" strokeWidth="1.2" />
        <path d="M-5 0 q5 -6 10 0 q-5 6 -10 0" fill="none" stroke="#d97b8b" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="2.8" fill="#d97b8b" />
      </g>
      {/* tulip */}
      <g transform="translate(113 130)">
        <path d="M-8 -2 q0 -11 8 -11 q8 0 8 11 q-8 6 -16 0 Z" fill="#f2b45f" stroke="#d99543" strokeWidth="1.2" />
        <path d="M0 -13 L0 -2" stroke="#d99543" strokeWidth="1.6" />
      </g>
      {/* bud */}
      <circle cx="122" cy="140" r="5.4" fill="#f6c9a8" stroke="#e0a887" strokeWidth="1.1" />
      {/* paper wrap */}
      <path d="M84 148 h28 l-5 20 h-18 Z" fill="#f7ddc9" stroke="#dcbfa6" strokeWidth="1.5" />
      <path d="M98 148 L98 168" stroke="#dcbfa6" strokeWidth="1.2" />
      <path d="M85 150 h26" stroke="#e6cbb4" strokeWidth="2" />
    </g>
  );
}

function HeartProp() {
  return (
    <g transform="translate(100 138)">
      <path
        d="M0 -7 C-5 -16 -18 -13 -18 -2 C-18 9 -5 16 0 22 C5 16 18 9 18 -2 C18 -13 5 -16 0 -7 Z"
        fill="url(#cats-heart)"
        stroke="#d96b7c"
        strokeWidth="1.6"
      />
      <path d="M-9 -4 q3 -4 6 -1" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Sparkles({ animate }: { animate: boolean }) {
  return (
    <g className={animate ? "cats-sparkle" : undefined}>
      <g fill="#f6c56a">
        <path d="M50 52 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 Z" />
        <path d="M152 44 l2 5.4 5.4 2 -5.4 2 -2 5.4 -2 -5.4 -5.4 -2 5.4 -2 Z" />
        <path d="M34 92 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z" />
        <path d="M168 88 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z" />
      </g>
      <g stroke="#f0b34f" strokeWidth="2.6" strokeLinecap="round">
        <path d="M58 30 l6 4" />
        <path d="M142 30 l-6 4" />
        <path d="M24 66 l7 2" />
        <path d="M176 66 l-7 2" />
      </g>
    </g>
  );
}

function Character({ state, className, animate = true }: CharacterProps) {
  const p = POSE[state];
  const loopClass = animate ? (state === "idle" || state === "blink" ? "cats-breathe" : "cats-settle") : undefined;
  const blush = state === "happy" || state === "heart" || state === "celebrate" ? 0.75 : 0.5;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="presentation"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cats-fur" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe8c6" />
          <stop offset="0.55" stopColor="#f7c884" />
          <stop offset="1" stopColor="#e2a45c" />
        </linearGradient>
        <linearGradient id="cats-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#ffe4bd" />
        </linearGradient>
        <linearGradient id="cats-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a3b0" />
          <stop offset="1" stopColor="#e4697f" />
        </linearGradient>
      </defs>
      {animate ? <style>{CSS}</style> : null}

      <ellipse cx="100" cy="181" rx="46" ry="7" fill="#3a2412" opacity="0.1" />

      <g className={loopClass}>
        {/* tail */}
        <path d={p.tail} fill="none" stroke="#e0a45e" strokeWidth="13" strokeLinecap="round" />
        <circle cx={p.tip[0]} cy={p.tip[1]} r="7" fill="#fff2dc" />

        {/* body */}
        <g transform={p.body}>
          <path
            d="M100 106 C126 106 136 130 136 152 C136 173 122 180 100 180 C78 180 64 173 64 152 C64 130 74 106 100 106 Z"
            fill="url(#cats-fur)"
            stroke="#8b5a2b"
            strokeWidth="2"
          />
          <ellipse cx="100" cy="153" rx="24" ry="23" fill="url(#cats-belly)" />
          <path d="M93 139 q7 -3 14 0" fill="none" stroke="#eccfa4" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
          <ellipse cx="82" cy="174" rx="12" ry="7" fill="#ffe6c2" stroke="#8b5a2b" strokeWidth="1.6" />
          <ellipse cx="118" cy="174" rx="12" ry="7" fill="#ffe6c2" stroke="#8b5a2b" strokeWidth="1.6" />
          <path d="M78 173 v3 M86 173 v3 M114 173 v3 M122 173 v3" stroke="#c98f52" strokeWidth="1.3" strokeLinecap="round" />
        </g>

        {/* head */}
        <g transform={p.head}>
          <g transform={p.earL}>
            <path d="M72 68 L62 26 L100 54 Z" fill="url(#cats-fur)" stroke="#8b5a2b" strokeWidth="2" strokeLinejoin="round" />
            <path d="M75 62 L69 36 L92 54 Z" fill="#f4a7ae" opacity="0.85" />
          </g>
          <g transform={p.earR}>
            <path d="M128 68 L138 26 L100 54 Z" fill="url(#cats-fur)" stroke="#8b5a2b" strokeWidth="2" strokeLinejoin="round" />
            <path d="M125 62 L131 36 L108 54 Z" fill="#f4a7ae" opacity="0.85" />
          </g>
          <ellipse cx="100" cy="86" rx="37" ry="32" fill="url(#cats-fur)" stroke="#8b5a2b" strokeWidth="2" />
          <path d="M100 58 v9 M89 59 l-2 8 M111 59 l2 8" stroke="#d99a54" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="71" cy="98" rx="9" ry="5" fill="#f49aa4" opacity={blush} />
          <ellipse cx="129" cy="98" rx="9" ry="5" fill="#f49aa4" opacity={blush} />
          {/* whiskers */}
          <g stroke="#8b5a2b" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" fill="none">
            <path d="M68 88 C58 85 49 83 41 82" />
            <path d="M68 94 C58 94 49 95 41 96" />
            <path d="M69 100 C59 103 51 106 45 109" />
            <path d="M132 88 C142 85 151 83 159 82" />
            <path d="M132 94 C142 94 151 95 159 96" />
            <path d="M131 100 C141 103 149 106 155 109" />
          </g>
          <CatEyes mode={p.eyes} animate={animate} />
          {(state === "sad" || state === "apologizing" || state === "hopeful") && (
            <g fill="none" stroke="#8b5a2b" strokeWidth="2.2" strokeLinecap="round" opacity="0.75">
              <path d="M74 76 Q83 70 91 71" />
              <path d="M126 76 Q117 70 109 71" />
            </g>
          )}
          {/* nose */}
          <path d="M94 90 h12 l-6 7 Z" fill="#ef8f9c" stroke="#c9707d" strokeWidth="1" strokeLinejoin="round" />
          <path d="M97 92 h3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <CatMouth mode={p.mouth} />
          {state === "crying" && (
            <g fill="#9adcf2">
              <path transform="translate(80 92)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              <path transform="translate(120 92)" d="M0 0 C-4 7 -3 12 1 12 C5 12 5 7 0 0 Z" />
              <circle cx="80" cy="106" r="4" fill="#c9eefb" opacity="0.9" />
              <circle cx="120" cy="106" r="4" fill="#c9eefb" opacity="0.9" />
            </g>
          )}
        </g>

        {/* held props, in front of the body and under the paws */}
        {state === "flowers" ? <Bouquet /> : null}
        {state === "heart" ? <HeartProp /> : null}

        {/* arms / paws, drawn over the head so they can cover the face */}
        <g transform={p.body} fill="none" stroke="#e3a962" strokeWidth="11" strokeLinecap="round">
          {p.arms.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {state === "celebrate" ? <Sparkles animate={animate} /> : null}
      </g>
    </svg>
  );
}

const art: StickerPackArt = {
  render: (state) => (props) => <Character state={state} {...props} />,
  Decorative: ({ className, animate }) => (
    <svg viewBox="0 0 200 200" className={className} role="presentation" aria-hidden xmlns="http://www.w3.org/2000/svg">
      {animate ? <style>{CSS}</style> : null}
      <g className={animate ? "cats-sparkle" : undefined} fill="#e8a33d">
        <g transform="translate(62 118) rotate(-14)">
          <ellipse cx="0" cy="2" rx="10" ry="8" />
          <circle cx="-10" cy="-8" r="3.6" />
          <circle cx="-3.5" cy="-12" r="3.6" />
          <circle cx="4" cy="-12" r="3.6" />
          <circle cx="10.5" cy="-8" r="3.6" />
        </g>
        <g transform="translate(130 78) rotate(12)" opacity="0.7">
          <ellipse cx="0" cy="1.6" rx="7.5" ry="6" />
          <circle cx="-7.5" cy="-6" r="2.8" />
          <circle cx="-2.6" cy="-9" r="2.8" />
          <circle cx="3" cy="-9" r="2.8" />
          <circle cx="8" cy="-6" r="2.8" />
        </g>
      </g>
      <g stroke="#e8a33d" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M92 58 q10 -12 22 -4" />
        <path d="M150 132 q12 6 6 18" />
      </g>
    </svg>
  ),
};

export default art;
