import { describe, expect, it } from "vitest";
import { resolveEmotionBadge } from "./emotion";

describe("resolveEmotionBadge", () => {
  it("returns null for empty, undefined, or whitespace-only emotion", () => {
    expect(resolveEmotionBadge("apology", undefined)).toBeNull();
    expect(resolveEmotionBadge("apology", null)).toBeNull();
    expect(resolveEmotionBadge("apology", "")).toBeNull();
    expect(resolveEmotionBadge("apology", "   ")).toBeNull();
    expect(resolveEmotionBadge(undefined, null)).toBeNull();
    expect(resolveEmotionBadge("unknown-experience", "")).toBeNull();
  });

  it("resolves configured apology emotions to display label and Feeling prefix", () => {
    expect(resolveEmotionBadge("apology", "forgive")).toEqual({
      label: "I forgive you",
      prefix: "Feeling",
    });
    expect(resolveEmotionBadge("apology", "time")).toEqual({
      label: "I need some time",
      prefix: "Feeling",
    });
    expect(resolveEmotionBadge("apology", "talk")).toEqual({
      label: "Let's talk properly",
      prefix: "Feeling",
    });
    expect(resolveEmotionBadge("apology", "appreciate")).toEqual({
      label: "I appreciate this",
      prefix: "Feeling",
    });
  });

  it("resolves configured birthday emotions to display label and Vibe prefix", () => {
    expect(resolveEmotionBadge("birthday", "grateful")).toEqual({
      label: "So grateful",
      prefix: "Vibe",
    });
    expect(resolveEmotionBadge("birthday", "touched")).toEqual({
      label: "Deeply touched",
      prefix: "Vibe",
    });
    expect(resolveEmotionBadge("birthday", "joyful")).toEqual({
      label: "Filled with joy",
      prefix: "Vibe",
    });
    expect(resolveEmotionBadge("birthday", "celebrating")).toEqual({
      label: "Party mode",
      prefix: "Vibe",
    });
  });

  it("preserves historical Apology fallback when experienceId is omitted (undefined)", () => {
    // Configured key on legacy record
    expect(resolveEmotionBadge(undefined, "forgive")).toEqual({
      label: "I forgive you",
      prefix: "Feeling",
    });
    // Unconfigured legacy text on legacy record
    expect(resolveEmotionBadge(undefined, "Warm")).toEqual({
      label: "Warm",
      prefix: "Feeling",
    });
  });

  it("preserves original text with experience prefix for legacy text on known experiences", () => {
    // Legacy text on apology
    expect(resolveEmotionBadge("apology", "Warm")).toEqual({
      label: "Warm",
      prefix: "Feeling",
    });
    // Legacy text on birthday
    expect(resolveEmotionBadge("birthday", "Excited")).toEqual({
      label: "Excited",
      prefix: "Vibe",
    });
  });

  it("preserves stored emotion text without assigning an incorrect prefix for unknown experiences", () => {
    // Arbitrary emotion text on unknown experience
    expect(resolveEmotionBadge("non-existent-module", "Touched")).toEqual({
      label: "Touched",
    });
    expect(resolveEmotionBadge("custom-exp", "Excited")).toEqual({
      label: "Excited",
    });
    // Configured Apology key on unknown experience must NOT resolve to Apology label or prefix
    expect(resolveEmotionBadge("non-existent-module", "forgive")).toEqual({
      label: "forgive",
    });
    // Configured Birthday key on unknown experience must NOT resolve to Birthday label or prefix
    expect(resolveEmotionBadge("non-existent-module", "grateful")).toEqual({
      label: "grateful",
    });
  });
});
