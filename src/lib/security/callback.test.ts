import { describe, expect, it } from "vitest";
import { safeCallback } from "./callback";

describe("safeCallback", () => {
  it("keeps internal destinations", () => {
    expect(safeCallback("/my-letters")).toBe("/my-letters");
    expect(safeCallback("/create")).toBe("/create");
    expect(safeCallback("/preview/abc")).toBe("/preview/abc");
  });

  it("falls back for external, protocol-relative and backslash destinations", () => {
    const rejected = [
      "//attacker.example",
      "https://attacker.example",
      "/\\attacker.example",
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ];
    for (const value of rejected) {
      expect(safeCallback(value)).toBe("/my-letters");
    }
  });
});
