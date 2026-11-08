/**
 * Two contracts live here, both client-safe (no Node or server-only imports):
 *
 * 1. The recipient's optional response — copy + types only. Nothing in this
 *    file is persisted: a recipient's answer stays in their own browser state
 *    and is never transmitted. There is deliberately no endpoint that accepts
 *    it, so it can never be used to pressure anyone into answering.
 * 2. The JSON envelope every route handler returns (`ApiError` and friends),
 *    shared with `@/lib/api/client` so the wire format has one definition.
 */
import type { CharacterState } from "@/types/sticker";
import type { EmotionOption, ResponseOption } from "@/types/scene";
import { EMOTION_OPTIONS, RESPONSE_OPTIONS } from "@/types/scene";

/* -------------------------------------------------------------------------- */
/* Recipient response contract (client-side state only)                        */
/* -------------------------------------------------------------------------- */

export interface RecipientResponseDraft {
  response: ResponseOption;
  emotion?: EmotionOption;
  /** Only ever true when the recipient chooses to copy the text themselves. */
  share: boolean;
}

export interface ResponseCopy {
  title: string;
  body: string;
  characterState: CharacterState;
  celebratory: boolean;
}

/**
 * Copy for each answer, written so that every option is a complete answer and
 * none of them is treated as the "right" one.
 *
 * `celebratory` is false for all four answers, including forgiveness: an
 * apology is not a win, and confetti would put a party where the recipient's
 * feelings are. Warmth is carried by `characterState` and the words instead.
 */
export const RESPONSE_COPY: Record<ResponseOption, ResponseCopy> = {
  time: {
    title: "Thank you for being honest.",
    body: "Needing space is a real answer, and it is allowed. There is no timer on this and nothing is expected from you. I will leave the door open — you decide whether and when it gets used.",
    characterState: "hopeful",
    celebratory: false,
  },
  talk: {
    title: "I would like that.",
    body: "Whenever you are ready, I am glad to talk properly. No script, no pressure, and you can stop whenever you need to. Say as much or as little as you want.",
    characterState: "hopeful",
    celebratory: false,
  },
  appreciate: {
    title: "Thank you for reading it.",
    body: "I hear you, and I am glad the words reached you. You do not owe me an answer or a decision — reading it was already more than I asked for.",
    characterState: "idle",
    celebratory: false,
  },
  forgive: {
    title: "That means a lot.",
    body: "Thank you for the kindness in that. I will not treat it as a clean slate or a finish line — trust comes back in small, ordinary days, and I will keep showing up for them.",
    characterState: "heart",
    // Gentle warmth, never confetti: a soft sparkle layer only.
    celebratory: true,
  },
};

/** Narrowing helper for values that cross the network or storage boundary. */
export function isResponseOption(value: unknown): value is ResponseOption {
  return typeof value === "string" && (RESPONSE_OPTIONS as readonly string[]).includes(value);
}

export function isEmotionOption(value: unknown): value is EmotionOption {
  return typeof value === "string" && (EMOTION_OPTIONS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* JSON envelope shared by every route handler                                 */
/* -------------------------------------------------------------------------- */

/** Body of every error response. `fields` is present only for validation errors. */
export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

/**
 * Private data, so nothing may be reused by a browser cache or a CDN. Mirrored
 * in the `Cache-Control` header of every route response.
 */
export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
};

const JSON_HEADERS: Record<string, string> = {
  ...NO_STORE_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
};

export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export function jsonError(
  status: number,
  error: string,
  fields?: Record<string, string>,
): Response {
  const body: ApiError =
    fields && Object.keys(fields).length > 0 ? { error, fields } : { error };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/**
 * Maps the repository's error vocabulary onto HTTP semantics.
 * Unknown failures become a generic 500: the message and stack stay in the
 * server log so nothing internal can leak to a client.
 */
export function repositoryErrorResponse(error: unknown): Response {
  const code = error instanceof Error ? error.message : "";

  switch (code) {
    case "NOT_FOUND":
      return jsonError(404, "We could not find that letter.");
    case "FORBIDDEN":
      return jsonError(403, "You do not have access to this letter.");
    case "REVOKED":
      return jsonError(410, "This letter has been revoked.");
    default:
      console.error("[api] unexpected failure:", error);
      return jsonError(500, "Something went wrong on our side. Please try again.");
  }
}

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; response: Response };

/** Reads a JSON body without letting a parse error become a 500. */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, response: jsonError(400, "Send a JSON request body.") };
  }
}
