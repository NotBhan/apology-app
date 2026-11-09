import { describe, expect, it } from "vitest";
import { canServeAsset } from "./asset-access";

const NOW = Date.parse("2026-03-01T12:00:00.000Z");
const future = new Date(NOW + 60_000).toISOString();
const past = new Date(NOW - 1).toISOString();

function asset(patch: Partial<Parameters<typeof canServeAsset>[0]["asset"]> = {}) {
  return {
    ownerKeyHash: "owner-1",
    apologyStatus: "published",
    expiresAt: future,
    state: "uploaded" as const,
    ...patch,
  };
}

describe("canServeAsset", () => {
  it("always serves an uploaded asset to its owner", () => {
    expect(
      canServeAsset({ asset: asset({ expiresAt: past }), ownerKeyHash: "owner-1", now: NOW }),
    ).toBe(true);
  });

  it("serves to a stranger only while the letter is live", () => {
    expect(canServeAsset({ asset: asset(), now: NOW })).toBe(true);
  });

  it("stops the moment the window closes, including the boundary", () => {
    expect(canServeAsset({ asset: asset({ expiresAt: past }), now: NOW })).toBe(false);
    expect(
      canServeAsset({
        asset: asset({ expiresAt: new Date(NOW).toISOString() }),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses revoked, deleted and draft apologies to strangers", () => {
    for (const status of ["revoked", "deleted", "draft"]) {
      expect(canServeAsset({ asset: asset({ apologyStatus: status }), now: NOW })).toBe(false);
    }
  });

  it("refuses an asset whose upload never completed", () => {
    for (const state of ["pending", "failed"] as const) {
      expect(
        canServeAsset({ asset: asset({ state }), ownerKeyHash: "owner-1", now: NOW }),
      ).toBe(false);
    }
  });

  it("refuses a missing expiry", () => {
    expect(canServeAsset({ asset: asset({ expiresAt: null }), now: NOW })).toBe(false);
  });

  it("does not treat a different owner as the owner", () => {
    expect(
      canServeAsset({
        asset: asset({ apologyStatus: "deleted", expiresAt: null }),
        ownerKeyHash: "owner-2",
        now: NOW,
      }),
    ).toBe(false);
  });
});
