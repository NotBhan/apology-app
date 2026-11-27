import { describe, expect, it } from "vitest";
import {
  DEFAULT_LINK_DAYS,
  MAX_LINK_DAYS,
  MIN_LINK_DAYS,
  isLinkLive,
  isResponseLive,
  normalizeDurationDays,
} from "./expiry";

describe("normalizeDurationDays", () => {
  it("keeps legacy values inside the historical window", () => {
    expect(normalizeDurationDays(1)).toBe(MIN_LINK_DAYS);
    expect(normalizeDurationDays(4)).toBe(4);
    expect(normalizeDurationDays(7)).toBe(MAX_LINK_DAYS);
  });

  it("clamps values outside the window", () => {
    expect(normalizeDurationDays(0)).toBe(MIN_LINK_DAYS);
    expect(normalizeDurationDays(-5)).toBe(MIN_LINK_DAYS);
    expect(normalizeDurationDays(30)).toBe(MAX_LINK_DAYS);
  });

  it("falls back to the default for missing or non-numeric input", () => {
    expect(normalizeDurationDays(undefined)).toBe(DEFAULT_LINK_DAYS);
    expect(normalizeDurationDays(null)).toBe(DEFAULT_LINK_DAYS);
    expect(normalizeDurationDays("3")).toBe(DEFAULT_LINK_DAYS);
    expect(normalizeDurationDays(Number.NaN)).toBe(DEFAULT_LINK_DAYS);
  });

  it("floors fractional days", () => {
    expect(normalizeDurationDays(3.9)).toBe(3);
  });
});

describe("isLinkLive", () => {
  it("treats a published record as live", () => {
    expect(isLinkLive("published")).toBe(true);
  });

  it("never treats drafts, revoked, or deleted records as live", () => {
    expect(isLinkLive("draft")).toBe(false);
    expect(isLinkLive("revoked")).toBe(false);
    expect(isLinkLive("deleted")).toBe(false);
    expect(isLinkLive(undefined)).toBe(false);
  });

  it("takes no expiry argument at all, so elapsed time cannot revoke a link", () => {
    // The signature is the guarantee: there is nothing for a caller to pass
    // that would make a published link read as dead.
    expect(isLinkLive.length).toBe(1);
  });
});

describe("isResponseLive", () => {
  it("returns true only when both response and parent are published", () => {
    expect(isResponseLive("published", "published")).toBe(true);
  });

  it("returns false if response is not published", () => {
    expect(isResponseLive("draft", "published")).toBe(false);
    expect(isResponseLive("revoked", "published")).toBe(false);
    expect(isResponseLive("deleted", "published")).toBe(false);
  });

  it("returns false if parent is not published (revoked, deleted, draft)", () => {
    expect(isResponseLive("published", "draft")).toBe(false);
    expect(isResponseLive("published", "revoked")).toBe(false);
    expect(isResponseLive("published", "deleted")).toBe(false);
    expect(isResponseLive("published", undefined)).toBe(false);
  });
});
