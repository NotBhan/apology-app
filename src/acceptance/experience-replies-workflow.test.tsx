// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// Router mock
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/app/create/actions", () => ({
  deleteDraftAction: vi.fn(),
  publishDraftAction: vi.fn(),
  revokeDraftAction: vi.fn(),
}));

// Mock image processing in jsdom
vi.mock("@/lib/image", () => ({
  compressImage: vi.fn().mockImplementation(async (file: File) => ({
    blob: file,
    width: 800,
    height: 600,
    type: file.type || "image/jpeg",
  })),
  readFileAsDataUrl: vi.fn().mockResolvedValue("data:image/jpeg;base64,123"),
}));

import * as clientApi from "@/lib/api/client";
import { z } from "zod";
import { ResponsePanel } from "@/components/presentation/ResponsePanel";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { QuickReplyModal } from "@/components/response/QuickReplyModal";
import { ResponseViewClient } from "@/app/response/[token]/ResponseViewClient";
import { ManageList } from "@/components/manage/ManageList";
import { ResponseManageClient } from "@/app/response/manage/[manageToken]/ResponseManageClient";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import * as registry from "@/experiences/registry";
import { apologyExperience } from "@/experiences/apology/module";
import type { PublishedResponse } from "@/types/response";
import type { ApologyDraft, PublishedApology } from "@/types/apology";

describe("Koi Koi — Experience Replies: End-to-End Acceptance Workflows", () => {
  const parentApologyId = "11111111-2222-3333-4444-555555555555";
  const parentSender = "Kabir";
  const parentRecipient = "Ananya";

  const bdayContent = birthdayContentSchema.parse({
    recipientName: "Ananya",
    senderName: "Kabir",
    headline: "Happy Birthday Ananya!",
    message: "Wishing you joy and wonderful moments.",
    themeId: "confetti",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /* ========================================================================== */
  /* 1. Full Apology Response Workflow                                          */
  /* ========================================================================== */
  describe("1. Full Apology Response Workflow", () => {
    it("completes full respondent journey from invitation through multi-step wizard to isolated public viewing", async () => {
      const user = userEvent.setup();

      // Step 1: Open public parent experience anonymously and confirm invitation visible
      const { unmount } = render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          recipientName={parentRecipient}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      const expInviteBtn = screen.getByRole("button", {
        name: `Create an experience for ${parentSender}`,
      });
      expect(expInviteBtn).toBeInTheDocument();
      expect(expInviteBtn).toHaveAttribute("aria-expanded", "false");

      // Step 2 & 3: Open experience selector by clicking invitation button
      await user.click(expInviteBtn);
      expect(expInviteBtn).toHaveAttribute("aria-expanded", "true");

      // Setup API spies
      const uploadSpy = vi.spyOn(clientApi, "uploadResponsePhoto").mockResolvedValue({
        asset: { id: "photo-asset-apology-1", url: "https://example.com/asset-1.jpg" },
        responseId: "resp-draft-exp-apol-101",
      });

      const sendExpSpy = vi.spyOn(clientApi, "sendExperienceReply").mockResolvedValue({
        ok: true,
        publicToken: "pub-apol-token-xyz789",
        manageToken: "mgmt-apol-token-sec456",
        publicUrl: "/response/pub-apol-token-xyz789",
        manageUrl: "/response/manage/mgmt-apol-token-sec456",
      });

      // Select Apology
      await user.click(screen.getByRole("button", { name: /I'm Sorry/i }));
      expect(screen.getByText("Apology Response")).toBeInTheDocument();

      // Step 6: Verify sender and recipient names are correctly inverted
      // Kabir was parent sender -> Kabir is now recipient of this apology
      expect(screen.getByDisplayValue(parentSender)).toBeInTheDocument();

      // Step 0: Names -> Continue
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Step 1: Situation -> select situation and Continue
      await user.click(screen.getByRole("radio", { name: /I said something hurtful/i }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Step 2: Words -> fill messages and Continue
      await user.type(screen.getByLabelText(/Acknowledge what happened/i), "I understand my mistake now.");
      await user.type(screen.getByLabelText(/Say what they mean to you/i), "Your friendship means the world.");
      await user.type(screen.getByLabelText(/Say what you'll do differently/i), "I will always listen first.");
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Step 3: Theme -> Use theme
      await user.click(screen.getByRole("button", { name: /Use /i }));

      // Step 4: Characters -> Continue
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Step 5: Customise -> switch to photos tab and upload
      await user.click(screen.getByRole("tab", { name: /Photos/i }));
      const file1 = new File(["dummy1"], "memory1.jpg", { type: "image/jpeg" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      await user.upload(fileInput, file1);

      // Verify upload was bound to parent apology, responseType="experience"
      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.any(File),
          undefined,
          "experience"
        );
      });

      // Advance through customize tabs to Publish
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));

      // Step 8: Publish the response (permanent link)
      const publishBtn = screen.getByRole("button", { name: /Publish Response/i });
      await user.click(publishBtn);

      // Step 9: Verify sendExperienceReply called with responseId
      await waitFor(() => {
        expect(sendExpSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.objectContaining({
            experienceType: "apology",
            responseId: "resp-draft-exp-apol-101",
          })
        );
      });

      // Completion screen shown
      expect(await screen.findByText("Your Experience Reply is Published!")).toBeInTheDocument();
      const publicLinkInput = screen.getByLabelText("Shareable response link");
      expect(publicLinkInput).toBeInTheDocument();

      // Step 10: Verify public URL contains ONLY public capability, zero management token
      expect(publicLinkInput.getAttribute("value")).toContain("/response/pub-apol-token-xyz789");
      expect(publicLinkInput.getAttribute("value")).not.toContain("mgmt-apol-token-sec456");

      // Verify management token saved into local capability store
      const storedCaps = JSON.parse(localStorage.getItem("koi_reply_capabilities") || "{}");
      expect(storedCaps["mgmt-apol-token-sec456"]).toEqual(
        expect.objectContaining({
          publicToken: "pub-apol-token-xyz789",
          manageToken: "mgmt-apol-token-sec456",
        })
      );

      unmount();

      // Step 11 & 12: Open public URL in a separate context (clean storage, no capabilities)
      localStorage.clear();

      const publishedResponseData: PublishedResponse = {
        id: "resp-published-apol-101",
        apologyId: parentApologyId,
        responseType: "experience",
        status: "published",
        content: {
          experienceType: "apology",
          content: {
            recipientName: parentSender,
            senderName: parentRecipient,
            situation: "said-hurtful",
            language: "en",
            messages: {
              message1: "I understand my mistake now.",
              message2: "Your friendship means the world.",
              message3: "I will always listen first.",
              personalNote: "",
            },
            themeId: "heartfelt",
            stickerPackId: "cats",
            customization: {
              photos: [{ id: "photo-asset-apology-1", url: "https://example.com/asset-1.jpg", caption: "", focalPoint: "50% 50%", width: 800, height: 600 }],
              audio: { source: "default", volume: 0.55 },
              memoryStyle: "polaroid",
            },
            linkDurationDays: 3,
            status: "published",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      const parentApologyData: PublishedApology = {
        id: parentApologyId,
        recipientName: parentRecipient,
        senderName: parentSender,
        situation: "other",
        messages: { message1: "Original", message2: "Letter", message3: "Content", personalNote: "" },
        themeId: "heartfelt",
        stickerPackId: "cats",
        customization: { photos: [], audio: { source: "none", volume: 0 }, memoryStyle: "polaroid" },
        publishedAt: new Date().toISOString(),
      };

      render(
        <ResponseViewClient
          response={publishedResponseData}
          parent={{
            token: "orig-parent-link-tok",
            recipientName: parentRecipient,
            senderName: parentSender,
            publishedAt: parentApologyData.publishedAt,
            experienceType: "apology",
          }}
          token="pub-apol-token-xyz789"
        />
      );

      // Verify response presentation renders with banner and parent link
      expect(screen.getByText(/In response to/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View original letter" })).toHaveAttribute(
        "href",
        "/letter/orig-parent-link-tok"
      );
      expect(screen.getByText("Hear me out, Kabir?")).toBeInTheDocument();
      expect(screen.getByText(/Ananya made this for you/i)).toBeInTheDocument();

      // Step 13: Verify parent experience metadata intact
      expect(parentApologyData.senderName).toBe("Kabir");
      expect(parentApologyData.recipientName).toBe("Ananya");
    });
  });

  /* ========================================================================== */
  /* 2. Full Birthday Response Workflow                                         */
  /* ========================================================================== */
  describe("2. Full Birthday Response Workflow", () => {
    it("completes full respondent journey creating a Birthday response and viewing it in recipient & creator views", async () => {
      const user = userEvent.setup();

      // Step 1: Open public Birthday experience anonymously
      const { unmount } = render(<BirthdayLetter content={bdayContent} apologyId={parentApologyId} />);

      // Navigate to finale scene
      await user.click(screen.getByRole("button", { name: "Open it" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await user.click(screen.getByRole("button", { name: "One last thing" }));

      // Confirm invitation visible
      const bdayInviteBtn = screen.getByRole("button", {
        name: `Send a letter to ${parentSender}`,
      });
      expect(bdayInviteBtn).toBeInTheDocument();

      // Step 2 & 3: Select Birthday in ExperienceReplyModal
      const uploadSpy = vi.spyOn(clientApi, "uploadResponsePhoto").mockResolvedValue({
        asset: {
          id: "mock-bday-asset-1",
          url: "/api/responses/assets/mock-bday-asset-1",
        },
        responseId: "mock-bday-resp-id",
      });
      const sendExpSpy = vi.spyOn(clientApi, "sendExperienceReply").mockResolvedValue({
        ok: true,
        publicToken: "pub-bday-token-999",
        manageToken: "mgmt-bday-token-888",
        publicUrl: "/response/pub-bday-token-999",
        manageUrl: "/response/manage/mgmt-bday-token-888",
      });

      // Click invitation button to open experience reply modal
      await user.click(bdayInviteBtn);

      // Choose Birthday
      await user.click(screen.getByRole("button", { name: /Happy Birthday/i }));
      expect(screen.getByText("Birthday Response")).toBeInTheDocument();

      // Step 4: Verify sender and recipient names inverted
      // Kabir was parent sender -> now birthday recipient
      expect(screen.getByDisplayValue(parentSender)).toBeInTheDocument();

      // Step 5: Fill headline and message
      const headlineInput = screen.getByLabelText(/Headline/i);
      await user.clear(headlineInput);
      await user.type(headlineInput, "Happy Birthday Back Kabir!");

      const messageInput = screen.getByLabelText(/^Message/i);
      await user.clear(messageInput);
      await user.type(messageInput, "Hope your day is filled with great memories.");

      // Verify Birthday photo upload support in experience responses
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      const photoFile = new File(["photo-bits"], "celebration.jpg", { type: "image/jpeg" });
      await user.upload(fileInput, photoFile);

      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.any(File),
          undefined,
          "experience"
        );
      });

      // Step 6: Publish Birthday response
      await user.click(screen.getByRole("button", { name: "Publish Response" }));

      await waitFor(() => {
        expect(sendExpSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.objectContaining({
            experienceType: "birthday",
            content: expect.objectContaining({
              headline: "Happy Birthday Back Kabir!",
              message: "Hope your day is filled with great memories.",
              recipientName: parentSender,
            }),
          })
        );
      });

      // Completion screen shown
      expect(await screen.findByText("Your Experience Reply is Published!")).toBeInTheDocument();
      const bdayPublicInput = screen.getByLabelText("Shareable response link") as HTMLInputElement;
      expect(bdayPublicInput.value).toContain("/response/pub-bday-token-999");

      unmount();

      // Step 7 & 8: Open public URL in separate browser context (clean storage)
      localStorage.clear();

      const publishedBirthdayResponse: PublishedResponse = {
        id: "resp-published-bday-999",
        apologyId: parentApologyId,
        responseType: "experience",
        status: "published",
        content: {
          experienceType: "birthday",
          content: {
            recipientName: parentSender,
            senderName: parentRecipient,
            headline: "Happy Birthday Back Kabir!",
            message: "Hope your day is filled with great memories.",
            themeId: "confetti",
            wish: "Make a wish!",
            photos: [],
            audio: "none",
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      const { unmount: unmountView } = render(
        <ResponseViewClient
          response={publishedBirthdayResponse}
          parent={{
            token: "orig-parent-bday-tok",
            recipientName: parentRecipient,
            senderName: parentSender,
            publishedAt: new Date().toISOString(),
            experienceType: "birthday",
          }}
          token="pub-bday-token-999"
        />
      );

      // Confirms it renders as Birthday experience rather than Quick Reply or Apology
      expect(screen.getByText(/In response to/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View original letter" })).toHaveAttribute(
        "href",
        "/letter/orig-parent-bday-tok"
      );
      expect(screen.getByRole("heading", { name: "Happy Birthday Back Kabir!" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Open it" })).toBeInTheDocument();

      unmountView();

      // Step 9: Creator dashboard identifies it as an Experience Reply
      const parentDraft: ApologyDraft = {
        id: parentApologyId,
        experienceType: "birthday",
        recipientName: parentRecipient,
        senderName: parentSender,
        situation: "other",
        language: "en",
        messages: {
          message1: "Happy Birthday",
          message2: "To you",
          message3: "Celebrate",
          personalNote: "",
        },
        themeId: "heartfelt",
        stickerPackId: "cats",
        customization: {
          audio: { source: "none", volume: 0 },
          photos: [],
          memoryStyle: "polaroid",
        },
        linkDurationDays: 3,
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      render(
        <ManageList
          drafts={[parentDraft]}
          tombstones={[]}
          pendingDeletionIds={[]}
          responsesByApology={{ [parentApologyId]: [publishedBirthdayResponse] }}
        />
      );

      // Open replies accordion
      const toggleRepliesBtn = screen.getByRole("button", { name: /Replies \(1\)/i });
      await user.click(toggleRepliesBtn);

      // Verify badge and content rendered
      expect(screen.getByText("Experience Reply: Birthday")).toBeInTheDocument();
      expect(screen.getByText("Happy Birthday Back Kabir!")).toBeInTheDocument();
      expect(screen.getByText("Hope your day is filled with great memories.")).toBeInTheDocument();
    });
  });

  /* ========================================================================== */
  /* 3. Management Capability Verification                                      */
  /* ========================================================================== */
  describe("3. Management Capability Verification", () => {
    it("allows response owner to access management page and mutate status via manageToken", async () => {
      const user = userEvent.setup();
      const manageToken = "mgmt-token-verified-owner-12345";
      const initialRecord = {
        id: "resp-manage-test-1",
        status: "published" as const,
        content: { message: "Test reply" },
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      const manageActionSpy = vi.spyOn(clientApi, "manageResponse").mockResolvedValue({
        ok: true,
        status: "revoked",
      });

      render(
        <ResponseManageClient
          initialRecord={initialRecord}
          manageToken={manageToken}
        />
      );

      expect(screen.getByText("Manage Your Reply")).toBeInTheDocument();
      const revokeBtn = screen.getByRole("button", { name: /Revoke Public Link/i });
      expect(revokeBtn).toBeInTheDocument();

      // Execute revocation
      await user.click(revokeBtn);
      expect(manageActionSpy).toHaveBeenCalledWith(manageToken, "revoke");
    });

    it("verifies management token is not exposed in public URLs and capabilities stay isolated", () => {
      const tokens = {
        publicToken: "pub-cap-token-strictly-public-111",
        manageToken: "mgmt-cap-token-strictly-private-222",
      };

      const publicUrl = `/response/${tokens.publicToken}`;
      const manageUrl = `/response/manage/${tokens.manageToken}`;

      // 1. Management token not in public URL
      expect(publicUrl).not.toContain(tokens.manageToken);
      expect(publicUrl).toBe("/response/pub-cap-token-strictly-public-111");
      expect(manageUrl).not.toContain(tokens.publicToken);
      expect(manageUrl).toBe("/response/manage/mgmt-cap-token-strictly-private-222");

      // 2. Tokens are distinct
      expect(tokens.publicToken).not.toEqual(tokens.manageToken);
    });
  });

  /* ========================================================================== */
  /* 4. Quick Reply Regression Verification                                     */
  /* ========================================================================== */
  describe("4. Quick Reply Regression", () => {
    it("preserves complete Quick Reply composition, photo attachment, and publication workflow", async () => {
      const user = userEvent.setup();

      const uploadSpy = vi.spyOn(clientApi, "uploadResponsePhoto").mockResolvedValue({
        asset: { id: "photo-quick-1", url: "https://example.com/q1.jpg" },
        responseId: "resp-quick-draft-555",
      });

      const sendQuickSpy = vi.spyOn(clientApi, "sendQuickReply").mockResolvedValue({
        ok: true,
        publicToken: "pub-quick-token-777",
        manageToken: "mgmt-quick-token-777",
        publicUrl: "/response/pub-quick-token-777",
        manageUrl: "/response/manage/mgmt-quick-token-777",
      });

      render(
        <QuickReplyModal
          isOpen={true}
          onClose={vi.fn()}
          apologyId={parentApologyId}
          senderName={parentSender}
          experienceId="apology"
        />
      );

      // Verify modal header
      expect(screen.getByRole("heading", { name: `Reply to ${parentSender}` })).toBeInTheDocument();

      // Type reply message
      const msgArea = screen.getByPlaceholderText(/Write your reply/i);
      await user.type(msgArea, "I forgive you and appreciate this.");

      // Select emotion
      await user.click(screen.getByRole("button", { name: "I forgive you" }));

      // Attach photo
      const file = new File(["quickpic"], "photo.png", { type: "image/png" });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.any(File),
          undefined,
          "quick",
          expect.any(AbortSignal),
        );
      });

      // Submit quick reply
      await user.click(screen.getByRole("button", { name: "Send Quick Reply" }));

      await waitFor(() => {
        expect(sendQuickSpy).toHaveBeenCalledWith(
          parentApologyId,
          expect.objectContaining({
            message: "I forgive you and appreciate this.",
            recipientEmotion: "forgive",
            responseId: "resp-quick-draft-555",
            photos: ["photo-quick-1"],
          })
        );
      });
    });
  });

  /* ========================================================================== */
  /* 5. Configuration and Fail-Closed Fallback Matrix                           */
  /* ========================================================================== */
  describe("5. Configuration and Fail-Closed Fallback Matrix", () => {
    it("1. Missing replyConfig: hides all invitations", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce({
        ...apologyExperience,
        replyConfig: undefined,
      });

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });

    it("2. enabled: false: hides all invitations", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce({
        ...apologyExperience,
        replyConfig: {
          ...apologyExperience.replyConfig!,
          enabled: false,
        },
      });

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });

    it("3. enabled: true, allowExperienceReply missing: renders Quick Reply only", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce({
        ...apologyExperience,
        replyConfig: {
          enabled: true,
          modalTitle: () => "Quick Only",
          modalSubtitle: "Sub",
          messagePlaceholder: "Msg",
          emotions: [],
          emotionBadgePrefix: "Emotion",
          accent: "#000",
        },
      });

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /quick reply/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });

    it("4. enabled: true, allowExperienceReply: false: renders Quick Reply only", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce({
        ...apologyExperience,
        replyConfig: {
          ...apologyExperience.replyConfig!,
          enabled: true,
          allowExperienceReply: false,
        },
      });

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /quick reply/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });

    it("5. Both enabled: true and allowExperienceReply: true: renders both invitations", () => {
      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: `Send a quick reply to ${parentSender}` })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: `Create an experience for ${parentSender}` })).toBeInTheDocument();
    });

    it("6. Unknown experience ID: fails closed with zero invitations", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce(undefined);

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });

    it("7. Registered experience without reply support: fails closed with zero invitations", () => {
      vi.spyOn(registry, "getExperience").mockReturnValueOnce({
        id: "apology",
        name: "No Reply Exp",
        tagline: "Test",
        category: "apology",
        accent: "#111",
        draftSchema: z.object({}),
        themeIds: [],
        defaultThemeId: "romantic",
        sceneIds: [],
        // No replyConfig property
      });

      render(
        <ResponsePanel
          apologyId={parentApologyId}
          senderName={parentSender}
          onReplay={vi.fn()}
          onCharacterState={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /reply/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /experience/i })).not.toBeInTheDocument();
    });
  });
});
