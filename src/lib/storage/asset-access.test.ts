import { describe, expect, it } from "vitest";
import { canServeAsset } from "./asset-access";

const NOW = Date.parse("2026-03-01T12:00:00.000Z");
const live = { status: "published" as const, expiresAt: new Date(NOW + 60_000).toISOString() };
const expired = { status: "published" as const, expiresAt: new Date(NOW - 1).toISOString() };

describe("canServeAsset", () => {
  it("always serves an asset to its owner", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        ownerKeyHash: "owner-1",
        record: expired,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("serves to a stranger only while the letter is live", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        ownerKeyHash: undefined,
        record: live,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("stops serving the moment the window closes", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: expired,
        now: NOW,
      }),
    ).toBe(false);

    // The boundary itself is closed, not open.
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: { status: "published", expiresAt: new Date(NOW).toISOString() },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses after revocation", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: { status: "revoked", expiresAt: live.expiresAt },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses an unpublished draft to a stranger", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: { status: "draft", expiresAt: live.expiresAt },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses an asset with no apology binding", () => {
    expect(
      canServeAsset({
        asset: { ownerKeyHash: "owner-1" },
        record: live,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses when the apology has been deleted", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: undefined,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not treat a different owner as the owner", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        ownerKeyHash: "owner-2",
        record: undefined,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("refuses a published record with no expiry at all", () => {
    expect(
      canServeAsset({
        asset: { apologyId: "a1", ownerKeyHash: "owner-1" },
        record: { status: "published", expiresAt: undefined },
        now: NOW,
      }),
    ).toBe(false);
  });
});
