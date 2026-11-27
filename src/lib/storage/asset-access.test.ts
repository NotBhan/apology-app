import { describe, expect, it } from "vitest";
import { canServeAsset } from "./asset-access";

function asset(patch: Partial<Parameters<typeof canServeAsset>[0]["asset"]> = {}) {
  return {
    ownerKeyHash: "owner-1",
    apologyStatus: "published",
    state: "uploaded" as const,
    ...patch,
  };
}

describe("canServeAsset", () => {
  it("always serves an uploaded asset to its owner", () => {
    expect(canServeAsset({ asset: asset(), ownerKeyHash: "owner-1" })).toBe(true);
  });

  it("serves to recipients permanently while published", () => {
    // No expiry input exists: a published asset never stops being servable
    // because time passed.
    expect(canServeAsset({ asset: asset() })).toBe(true);
  });

  it("refuses revoked, deleted and draft apologies to strangers", () => {
    for (const status of ["revoked", "deleted", "draft"]) {
      expect(canServeAsset({ asset: asset({ apologyStatus: status }) })).toBe(false);
    }
  });

  it("refuses an asset whose upload never completed", () => {
    for (const state of ["pending", "failed"] as const) {
      expect(canServeAsset({ asset: asset({ state }), ownerKeyHash: "owner-1" })).toBe(false);
    }
  });

  it("does not treat a different owner as the owner", () => {
    expect(
      canServeAsset({
        asset: asset({ apologyStatus: "deleted" }),
        ownerKeyHash: "owner-2",
      }),
    ).toBe(false);
  });
});

describe("canServeAsset deleted parent exclusion", () => {
  it("blocks even the owner when the owning apology status is deleted", () => {
    expect(
      canServeAsset({
        asset: {
          ownerKeyHash: "owner-1",
          apologyStatus: "deleted",
          state: "uploaded",
        },
        ownerKeyHash: "owner-1",
      }),
    ).toBe(false);
  });
});
