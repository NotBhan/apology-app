import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/security/owner", () => ({
  getOwner: vi.fn(),
}));

vi.mock("@/lib/security/creator", () => ({
  getCreator: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  getRepository: vi.fn(),
  getObjectStore: vi.fn(),
}));

vi.mock("@/lib/validation/publish", () => ({
  validateDraftForPublish: vi.fn(),
}));

import { getOwner } from "@/lib/security/owner";
import { getObjectStore, getRepository } from "@/lib/storage";
import { validateDraftForPublish } from "@/lib/validation/publish";
import { publishDraftAction } from "./actions";

describe("publishDraftAction ownership gate", () => {
  const mockRepo = {
    getDraft: vi.fn(),
    listAssets: vi.fn(),
    publish: vi.fn(),
  };
  const mockObjects = {
    head: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepository).mockReturnValue(mockRepo as never);
    vi.mocked(getObjectStore).mockReturnValue(mockObjects as never);
  });

  it("blocks non-owner before validating draft content or calling objectStore.head", async () => {
    vi.mocked(getOwner).mockResolvedValue({ key: "attacker-owner-key", hash: "attacker-owner-hash" });
    mockRepo.getDraft.mockResolvedValue({
      id: "draft-1",
      ownerKeyHash: "victim-owner-hash",
      experienceType: "apology",
      status: "published",
      recipientName: "Maya",
      senderName: "Kabir",
      situation: "other",
      situationCustom: "",
      language: "en",
      messages: { message1: "m1", message2: "m2", message3: "m3", personalNote: "" },
      themeId: "romantic",
      stickerPackId: "cats",
      customization: { audio: { source: "none", volume: 0.6 }, photos: [], memoryStyle: "polaroid" },
      linkDurationDays: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await publishDraftAction("draft-1");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("This draft belongs to another browser.");
    expect(validateDraftForPublish).not.toHaveBeenCalled();
    expect(mockRepo.listAssets).not.toHaveBeenCalled();
    expect(mockObjects.head).not.toHaveBeenCalled();
    expect(mockRepo.publish).not.toHaveBeenCalled();
  });
});
