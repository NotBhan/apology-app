import { describe, expect, it } from "vitest";
import { createFakeBackend, makeRecord } from "@/test/adapters/fake-backend";

const LEGACY = "legacy-hash-of-this-browser";
const A = { userId: "user-a", scopeKey: "scope-a" };
const B = { userId: "user-b", scopeKey: "scope-b" };

describe("legacy ownership claim", () => {
  it("binds unclaimed rows for the presented legacy hash and is idempotent", async () => {
    const backend = createFakeBackend();
    const mine = makeRecord({ ownerKeyHash: LEGACY });
    const unrelated = makeRecord({ ownerKeyHash: "someone-elses-hash" });
    backend.state.apologies.set(mine.id, mine);
    backend.state.apologies.set(unrelated.id, unrelated);

    expect(await backend.repository.claimLegacyRecords({ ...A, legacyKeyHash: LEGACY })).toBe(1);
    // A second call must not re-claim anything.
    expect(await backend.repository.claimLegacyRecords({ ...A, legacyKeyHash: LEGACY })).toBe(0);

    // The claimed row is now reachable through the account scope key…
    const listed = await backend.repository.listByOwner(A.scopeKey, LEGACY);
    expect(listed.map((draft: { id: string }) => draft.id)).toEqual([mine.id]);

    // …and a different account cannot see it, even while presenting the hash.
    const otherAccount = await backend.repository.listByOwner(B.scopeKey, LEGACY);
    expect(otherAccount).toHaveLength(0);

    // Records belonging to someone else are untouched.
    expect(unrelated.ownerKeyHash).toBe("someone-elses-hash");
  });

  it("cannot reassign a row another account already claimed", async () => {
    const backend = createFakeBackend();
    const claimedByA = makeRecord({ ownerKeyHash: LEGACY });
    backend.state.apologies.set(claimedByA.id, claimedByA);

    expect(await backend.repository.claimLegacyRecords({ ...A, legacyKeyHash: LEGACY })).toBe(1);
    // B presents the same cookie hash, but the row now has a user_id.
    expect(await backend.repository.claimLegacyRecords({ ...B, legacyKeyHash: LEGACY })).toBe(0);

    const bListing = await backend.repository.listByOwner(B.scopeKey, LEGACY);
    expect(bListing).toHaveLength(0);
  });

  it("claims nothing without a matching legacy hash", async () => {
    const backend = createFakeBackend();
    const record = makeRecord({ ownerKeyHash: "different-hash" });
    backend.state.apologies.set(record.id, record);

    expect(await backend.repository.claimLegacyRecords({ ...A, legacyKeyHash: LEGACY })).toBe(0);
    expect(record.ownerKeyHash).toBe("different-hash");
  });
});
