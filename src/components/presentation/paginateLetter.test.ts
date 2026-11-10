import { describe, expect, it } from "vitest";
import { LETTER_PAGE_CHARS, paginateLetter } from "./paginateLetter";

describe("letter pagination", () => {
  it("keeps a short note on one page", () => {
    expect(paginateLetter("Thank you for everything.")).toEqual(["Thank you for everything."]);
  });

  it("treats an empty note as a single empty page", () => {
    expect(paginateLetter("   ")).toEqual([""]);
  });

  it("splits a long note into several pages without losing words", () => {
    const words = Array.from({ length: 400 }, (_, index) => `word${index}`);
    const pages = paginateLetter(words.join(" "));

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      expect(page.length).toBeLessThanOrEqual(LETTER_PAGE_CHARS);
    }

    // Nothing dropped, nothing reordered.
    expect(pages.join(" ").split(/\s+/)).toEqual(words);
  });

  it("prefers paragraph breaks when the paragraphs fit", () => {
    const paragraph = "a".repeat(100);
    const pages = paginateLetter(`${paragraph}\n\n${paragraph}\n\n${paragraph}`);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe(`${paragraph}\n\n${paragraph}`);
  });

  it("never splits a word across pages", () => {
    const pages = paginateLetter("x".repeat(50) + " " + "y".repeat(50));
    for (const page of pages) {
      expect(page.startsWith("x") || page.startsWith("y")).toBe(true);
    }
  });
});
