import { describe, expect, it } from "vitest";
import {
  DEFAULT_LINK_DAYS,
  MAX_LINK_DAYS,
  MIN_LINK_DAYS,
  computeExpiresAt,
  daysRemaining,
  formatDuration,
  formatExpiry,
  isExpired,
  isLinkLive,
  isResponseLive,
  normalizeDurationDays,
} from "./expiry";

const DAY = 24 * 60 * 60 * 1000;

describe("normalizeDurationDays", () => {
  it("keeps values inside the window", () => {
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

describe("computeExpiresAt", () => {
  it("adds exactly the requested number of days", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(computeExpiresAt(1, from)).toBe("2026-01-02T00:00:00.000Z");
    expect(computeExpiresAt(7, from)).toBe("2026-01-08T00:00:00.000Z");
  });

  it("clamps an out-of-range window rather than producing a long-lived link", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    expect(computeExpiresAt(99, from)).toBe("2026-01-08T00:00:00.000Z");
    expect(computeExpiresAt(0, from)).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("isExpired", () => {
  const now = Date.parse("2026-01-05T12:00:00.000Z");

  it("treats a future expiry as live", () => {
    expect(isExpired("2026-01-06T12:00:00.000Z", now)).toBe(false);
  });

  it("treats a past expiry as expired", () => {
    expect(isExpired("2026-01-04T12:00:00.000Z", now)).toBe(true);
  });

  it("treats the exact boundary as expired", () => {
    expect(isExpired("2026-01-05T12:00:00.000Z", now)).toBe(true);
  });

  it("treats a missing or malformed expiry as expired", () => {
    expect(isExpired(undefined, now)).toBe(true);
    expect(isExpired("not-a-date", now)).toBe(true);
  });
});

describe("isLinkLive", () => {
  it("treats published experiences as live permanently", () => {
    expect(isLinkLive("published")).toBe(true);
    expect(isLinkLive("published", undefined)).toBe(true);
    expect(isLinkLive("published", "2020-01-01T00:00:00.000Z")).toBe(true);
  });

  it("never treats drafts, revoked, or deleted records as live", () => {
    expect(isLinkLive("draft")).toBe(false);
    expect(isLinkLive("revoked")).toBe(false);
    expect(isLinkLive("deleted")).toBe(false);
    expect(isLinkLive(undefined)).toBe(false);
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

describe("daysRemaining", () => {
  const now = Date.parse("2026-01-05T00:00:00.000Z");

  it("rounds up so a partial day still reads as a day", () => {
    expect(daysRemaining(new Date(now + DAY * 1.2).toISOString(), now)).toBe(2);
    expect(daysRemaining(new Date(now + DAY * 3).toISOString(), now)).toBe(3);
  });

  it("is zero once expired", () => {
    expect(daysRemaining(new Date(now - DAY).toISOString(), now)).toBe(0);
    expect(daysRemaining(undefined, now)).toBe(0);
  });
});

describe("formatting", () => {
  it("labels a single day in the singular", () => {
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(3)).toBe("3 days");
  });

  it("renders a readable expiry and a dash when absent", () => {
    expect(formatExpiry(undefined)).toBe("—");
    expect(formatExpiry("nonsense")).toBe("—");
    expect(formatExpiry("2026-02-01T10:30:00.000Z", "en-GB")).toContain("Feb");
  });
});
