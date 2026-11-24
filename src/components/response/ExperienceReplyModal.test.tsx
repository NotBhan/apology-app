import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceReplyModal } from "./ExperienceReplyModal";
import * as clientApi from "@/lib/api/client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/image", () => ({
  compressImage: vi.fn().mockImplementation(async (file: File) => ({
    blob: file,
    width: 800,
    height: 600,
    type: file.type || "image/jpeg",
  })),
  readFileAsDataUrl: vi.fn().mockResolvedValue("data:image/jpeg;base64,123"),
}));

describe("ExperienceReplyModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    apologyId: "11111111-2222-3333-4444-555555555555",
    parentSenderName: "Jordan",
    parentRecipientName: "Taylor",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ExperienceReplyModal {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens on experience selection step by default", () => {
    render(<ExperienceReplyModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Create an experience for Jordan" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Happy Birthday/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /I'm Sorry/i })).toBeInTheDocument();
  });

  it("switches to Birthday editor with swapped recipient and sender names", async () => {
    const user = userEvent.setup();
    render(<ExperienceReplyModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Happy Birthday/i }));

    expect(screen.getByText("Birthday Response")).toBeInTheDocument();
    expect(screen.getByText(/Replying to/i)).toBeInTheDocument();

    // Check pre-filled inputs
    const recipientInput = screen.getByLabelText(/their name/i);
    const senderInput = screen.getByLabelText(/your name/i);
    expect(recipientInput).toHaveValue("Jordan");
    expect(senderInput).toHaveValue("Taylor");
  });

  it("publishes Birthday response and displays completion dialog with shareable link and capabilities", async () => {
    const user = userEvent.setup();
    const sendSpy = vi.spyOn(clientApi, "sendExperienceReply").mockResolvedValueOnce({
      ok: true,
      publicToken: "pub-bday-123",
      manageToken: "mgmt-bday-123",
      publicUrl: "/response/pub-bday-123",
      manageUrl: "/response/manage/mgmt-bday-123",
    });

    render(<ExperienceReplyModal {...defaultProps} />);

    // Select Birthday
    await user.click(screen.getByRole("button", { name: /Happy Birthday/i }));

    // Fill in required fields
    const headlineInput = screen.getByLabelText(/Headline/i);
    const messageInput = screen.getByLabelText(/Message/i);

    await user.type(headlineInput, "Happy 30th Birthday!");
    await user.type(messageInput, "Wishing you joy and wonderful moments all year long.");

    // Click Publish Response
    const publishBtn = screen.getByRole("button", { name: "Publish Response" });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        "11111111-2222-3333-4444-555555555555",
        expect.objectContaining({
          experienceType: "birthday",
          content: expect.objectContaining({
            recipientName: "Jordan",
            senderName: "Taylor",
            headline: "Happy 30th Birthday!",
          }),
        })
      );
    });

    // Check completion dialog renders
    expect(screen.getByText("Your Experience Reply is Published!")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\/response\/pub-bday-123/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show QR Code" })).toBeInTheDocument();

    // Verify localStorage capability saved
    const rawCapabilities = localStorage.getItem("koi_reply_capabilities");
    expect(rawCapabilities).not.toBeNull();
    const caps = JSON.parse(rawCapabilities!);
    expect(caps["mgmt-bday-123"]).toEqual(
      expect.objectContaining({
        publicToken: "pub-bday-123",
        manageToken: "mgmt-bday-123",
      })
    );
  });

  it("allows switching back to selection step from editor", async () => {
    const user = userEvent.setup();
    render(<ExperienceReplyModal {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /Happy Birthday/i }));
    expect(screen.getByText("Birthday Response")).toBeInTheDocument();

    const changeTypeBtn = screen.getByRole("button", { name: "Change Type" });
    await user.click(changeTypeBtn);

    expect(
      screen.getByRole("heading", { name: "Create an experience for Jordan" })
    ).toBeInTheDocument();
  });

  it("binds uploaded photo to the experience response draft and passes responseId on publish", async () => {
    const user = userEvent.setup();
    const uploadSpy = vi.spyOn(clientApi, "uploadResponsePhoto").mockResolvedValueOnce({
      asset: { id: "photo-asset-1", url: "https://example.com/photo-1.jpg" },
      responseId: "resp-draft-exp-123",
    });

    const sendSpy = vi.spyOn(clientApi, "sendExperienceReply").mockResolvedValueOnce({
      ok: true,
      publicToken: "pub-apol-123",
      manageToken: "mgmt-apol-123",
      publicUrl: "/response/pub-apol-123",
      manageUrl: "/response/manage/mgmt-apol-123",
    });

    render(<ExperienceReplyModal {...defaultProps} />);

    // Select Apology
    await user.click(screen.getByRole("button", { name: /I'm Sorry/i }));
    expect(screen.getByText("Apology Response")).toBeInTheDocument();

    // Advance wizard through steps to Customise step
    // Step 0: Names -> Continue
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 1: Situation -> select a situation and Continue
    await user.click(screen.getByRole("radio", { name: /I said something hurtful/i }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2: Words -> fill message1, message2, message3 -> Continue
    await user.type(screen.getByLabelText(/Acknowledge what happened/i), "I understand now.");
    await user.type(screen.getByLabelText(/Say what they mean to you/i), "You matter a lot to me.");
    await user.type(screen.getByLabelText(/Say what you'll do differently/i), "I will listen first.");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3: Theme -> Use theme
    await user.click(screen.getByRole("button", { name: /Use /i }));

    // Step 4: Characters -> Continue
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 5: Customise -> switch to photos tab and upload
    await user.click(screen.getByRole("tab", { name: /Photos/i }));
    const file = new File(["dummy"], "memory.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(
        "11111111-2222-3333-4444-555555555555",
        expect.any(File),
        undefined,
        "experience"
      );
    });

    // Advance through customize tabs (photos -> colours -> publish)
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 6: Publish -> Publish Response (permanent link)
    const publishBtn = screen.getByRole("button", { name: /Publish Response/i });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(
        "11111111-2222-3333-4444-555555555555",
        expect.objectContaining({
          experienceType: "apology",
          responseId: "resp-draft-exp-123",
        })
      );
    });
  });
});
