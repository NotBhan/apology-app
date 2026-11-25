import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BirthdayEditor } from "./BirthdayEditor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

describe("birthday editor, anonymous path", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps an unauthenticated draft in this browser", async () => {
    const user = userEvent.setup();
    render(<BirthdayEditor />);

    await user.type(screen.getByLabelText(/headline/i), "Happy birthday");

    const stored = window.sessionStorage.getItem("koi.birthday.draft");
    expect(stored).toContain("Happy birthday");
    // Nothing was sent anywhere by typing.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("restores a stored draft on a later visit", () => {
    window.sessionStorage.setItem(
      "koi.birthday.draft",
      JSON.stringify({
        recipientName: "Riya",
        senderName: "Arjun",
        headline: "Restored headline",
        message: "Still here.",
        wish: "",
        themeId: "confetti",
      }),
    );

    render(<BirthdayEditor />);

    expect(screen.getByDisplayValue("Restored headline")).toBeInTheDocument();
    expect(screen.getByText(/Draft restored from this browser/i)).toBeInTheDocument();
  });

  it("previews locally without contacting the server", async () => {
    const user = userEvent.setup();
    render(<BirthdayEditor />);

    await user.type(screen.getByLabelText(/their name/i), "Riya");
    await user.type(screen.getByLabelText(/your name/i), "Arjun");
    await user.type(screen.getByLabelText(/headline/i), "Happy birthday");
    await user.type(screen.getByLabelText(/message/i), "Hope this year is kind.");

    expect(screen.getByRole("heading", { name: "Happy birthday" })).toBeInTheDocument();
    expect(screen.getByText(/Permanent gift link/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("supports theme selection across all six themes", async () => {
    const user = userEvent.setup();
    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
        }}
      />,
    );

    expect(screen.getByText("Confetti Celebration")).toBeInTheDocument();
    expect(screen.getByText("Midnight Gold")).toBeInTheDocument();
    expect(screen.getByText("Pastel Dream")).toBeInTheDocument();
    expect(screen.getByText("Botanical Bloom")).toBeInTheDocument();
    expect(screen.getByText("Vintage Postcard")).toBeInTheDocument();
    expect(screen.getByText("Doodle Scrapbook")).toBeInTheDocument();

    // Select Midnight Gold
    await user.click(screen.getByText("Midnight Gold"));
    const stored = window.sessionStorage.getItem("koi.birthday.draft");
    expect(stored).toContain("midnight-gold");
  });

  it("allows selecting candle count independently of age", async () => {
    const user = userEvent.setup();
    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
        }}
      />,
    );

    // Select 5 candles
    const candle5Btn = screen.getByRole("button", { name: "5" });
    await user.click(candle5Btn);
    expect(candle5Btn).toHaveAttribute("aria-pressed", "true");

    const stored = window.sessionStorage.getItem("koi.birthday.draft");
    expect(stored).toContain('"candleCount":5');
  });

  it("renders 'Publish Response' when in response mode and invokes onPublishResponse", async () => {
    const user = userEvent.setup();
    const handlePublish = vi.fn().mockResolvedValue({ path: "/response/test-path", publicToken: "tok-123" });

    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "ParentSender",
          senderName: "ParentRecipient",
          headline: "Warm wishes",
          message: "Thank you for thinking of me!",
        }}
        isResponse={true}
        onPublishResponse={handlePublish}
      />,
    );

    const publishBtn = screen.getByRole("button", { name: "Publish Response" });
    expect(publishBtn).toBeInTheDocument();

    await user.click(publishBtn);
    expect(handlePublish).toHaveBeenCalled();
  });

  it("supports adding and removing photos via URL", async () => {
    const user = userEvent.setup();
    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
        }}
      />,
    );

    // Open image link input
    await user.click(screen.getByRole("button", { name: /or add image url/i }));

    const urlInput = screen.getByPlaceholderText("https://example.com/photo.jpg");
    await user.type(urlInput, "https://images.example.com/moment1.jpg");
    await user.click(screen.getByRole("button", { name: /^add$/i }));

    expect(screen.getByAltText("Moment 1")).toBeInTheDocument();
    expect(screen.getByText("1 / 5 photos")).toBeInTheDocument();

    // Remove photo
    await user.click(screen.getByLabelText("Remove photo 1"));
    expect(screen.queryByAltText("Moment 1")).not.toBeInTheDocument();
    expect(screen.getByText("0 / 5 photos")).toBeInTheDocument();
  });

  it("uploads photo when onUploadPhoto is provided and updates gallery preview", async () => {
    const user = userEvent.setup();
    const imageMod = await import("@/lib/image");
    const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: "image/webp" });
    vi.spyOn(imageMod, "compressImage").mockResolvedValueOnce({
      blob: webpBlob,
      width: 1600,
      height: 1200,
      type: "image/webp",
      metrics: {
        originalBytes: 2_000_000,
        compressedBytes: 220_000,
        originalWidth: 4000,
        originalHeight: 3000,
        outputWidth: 1600,
        outputHeight: 1200,
        originalFormat: "image/jpeg",
        outputFormat: "image/webp",
        durationMs: 25,
        reductionBytes: 1_780_000,
        reductionPercent: 89,
        qualityUsed: 0.78,
        attempts: 1,
        wasRecompressed: true,
        preservedTransparency: false,
      },
    });
    const handleUpload = vi.fn().mockResolvedValue({ url: "/api/responses/assets/mock-asset-123" });

    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
        }}
        isResponse={true}
        onUploadPhoto={handleUpload}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(["dummy-img"], "moment.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);

    expect(handleUpload).toHaveBeenCalledTimes(1);
    const uploadedFileArg = handleUpload.mock.calls[0]?.[0] as File;
    expect(uploadedFileArg.type).toBe("image/webp");
    expect(uploadedFileArg.name).toBe("moment.webp");
    expect(await screen.findByAltText("Moment 1")).toBeInTheDocument();
  });

  it("rejects unsupported files during optimization without uploading broken originals", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const handleUpload = vi.fn().mockResolvedValue({ url: "/api/responses/assets/mock" });

    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
        }}
        isResponse={true}
        onUploadPhoto={handleUpload}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fakePdf = new File(["%PDF-1.7"], "bad.pdf", { type: "application/pdf" });
    await user.upload(fileInput, fakePdf);

    expect(handleUpload).not.toHaveBeenCalled();
    expect(await screen.findByText(/not a supported image/i)).toBeInTheDocument();
  });

  it("supports photo presentation style selection and persistence", async () => {
    const user = userEvent.setup();
    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
        }}
      />,
    );

    // Initial style is Theme Signature
    const scrapbookOption = screen.getByRole("button", { name: /^Scrapbook/i });
    expect(scrapbookOption).toBeInTheDocument();

    await user.click(scrapbookOption);
    expect(scrapbookOption).toHaveAttribute("aria-pressed", "true");

    const stored = window.sessionStorage.getItem("koi.birthday.draft");
    expect(stored).toContain('"photoLayout":"scrapbook"');

    // Select Polaroid style
    const polaroidOption = screen.getByRole("button", { name: /Polaroid/i });
    await user.click(polaroidOption);
    expect(polaroidOption).toHaveAttribute("aria-pressed", "true");

    const storedPolaroid = window.sessionStorage.getItem("koi.birthday.draft");
    expect(storedPolaroid).toContain('"photoLayout":"polaroid"');
  });

  it("supports editing captions and reordering attached photos", async () => {
    const user = userEvent.setup();
    render(
      <BirthdayEditor
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy birthday",
          message: "Have a wonderful year!",
          photos: [
            { url: "https://example.com/p1.jpg", caption: "Paris 2023" },
            { url: "https://example.com/p2.jpg", caption: "Tokyo 2024" },
          ],
        }}
      />,
    );

    // Verify initial photos and captions
    expect(screen.getByDisplayValue("Paris 2023")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tokyo 2024")).toBeInTheDocument();

    // Edit caption of first photo
    const captionInput1 = screen.getByDisplayValue("Paris 2023");
    await user.clear(captionInput1);
    await user.type(captionInput1, "Summer in Paris");

    let stored = window.sessionStorage.getItem("koi.birthday.draft");
    expect(stored).toContain("Summer in Paris");

    // Reorder: Move photo 1 later (down)
    const moveLaterBtn = screen.getByLabelText("Move photo 1 later");
    await user.click(moveLaterBtn);

    stored = window.sessionStorage.getItem("koi.birthday.draft");
    const parsed = JSON.parse(stored || "{}");
    // After moving photo 1 later, photo at index 0 should now be Tokyo 2024
    expect(parsed.photos[0].caption).toBe("Tokyo 2024");
    expect(parsed.photos[1].caption).toBe("Summer in Paris");
  });

  it("renders a sign in option for unauthenticated visitors", () => {
    render(<BirthdayEditor />);
    const signInLink = screen.getByRole("link", { name: /sign in to your account/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/auth/sign-in?callbackURL=%2Fcreate%2Fbirthday");
  });
});

describe("birthday editor, authentication flows and regression coverage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1. Authenticated user opens Birthday experience → authenticated creator state is displayed", () => {
    window.sessionStorage.setItem(
      "koi.birthday.draft",
      JSON.stringify({
        recipientName: "Aria",
        senderName: "Leo",
        headline: "Restored headline",
        message: "Still here.",
        themeId: "confetti",
      }),
    );

    render(<BirthdayEditor signedIn={true} />);

    // Authenticated status is shown
    expect(screen.getByTestId("auth-status-signed-in")).toBeInTheDocument();
    expect(screen.getByText("Signed in to account")).toBeInTheDocument();

    // No unauthenticated sign-in link is shown
    expect(screen.queryByRole("link", { name: /sign in to your account/i })).not.toBeInTheDocument();

    // Restored banner does not tell the user to sign in
    expect(screen.getByText(/Draft restored from this browser. Ready to save to your account./i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });

  it("2. Authenticated user saves a Birthday experience → save succeeds with visual confirmation and sets draftId", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ draft: { id: "draft-bday-456", experienceType: "birthday" } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <BirthdayEditor
        signedIn={true}
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy Birthday Riya",
          message: "Hope you have an amazing day!",
        }}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save to my account" });
    await user.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/drafts",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"experienceType":"birthday"'),
      }),
    );

    // Shows save confirmation
    expect(await screen.findByText("Saved to account")).toBeInTheDocument();

    // Subsequent save calls PATCH on the saved draft ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ draft: { id: "draft-bday-456", experienceType: "birthday" } }),
    });

    await user.click(saveButton);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/experiences/birthday/draft-bday-456",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });

  it("3. Unauthenticated user opens Birthday experience → sign-in prompt is displayed", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem(
      "koi.birthday.draft",
      JSON.stringify({
        recipientName: "Aria",
        senderName: "Leo",
        headline: "Restored headline",
        message: "Still here.",
        themeId: "confetti",
      }),
    );

    render(<BirthdayEditor signedIn={false} />);

    // Bottom bar has sign in link
    const signInLink = screen.getByRole("link", { name: /sign in to your account/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute("href", "/auth/sign-in?callbackURL=%2Fcreate%2Fbirthday");

    // Restored banner has sign in link
    expect(screen.getByText(/Draft restored from this browser./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/auth/sign-in?callbackURL=%2Fcreate%2Fbirthday",
    );

    // Photo upload attempts prompt sign-in
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(fileInput, file);
    expect(screen.getByText(/Sign in to save uploaded photos with your gift/i)).toBeInTheDocument();
  });

  it("4. Session is still loading → unauthenticated prompt is not prematurely displayed", () => {
    render(<BirthdayEditor isLoadingSession={true} />);

    // Loading indicator is present
    expect(screen.getByTestId("auth-status-loading")).toBeInTheDocument();

    // No sign-in link is prematurely shown
    expect(screen.queryByRole("link", { name: /sign in to your account/i })).not.toBeInTheDocument();
  });

  it("5. Session expires → protected save operations are rejected appropriately", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Sign in to continue." }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <BirthdayEditor
        signedIn={true}
        initialValues={{
          recipientName: "Riya",
          senderName: "Arjun",
          headline: "Happy Birthday Riya",
          message: "Hope you have an amazing day!",
        }}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save to my account" });
    await user.click(saveButton);

    // Error message displayed
    expect(await screen.findByText("Your session has expired. Sign in to save your gift.")).toBeInTheDocument();

    // UI transitions to unauthenticated state
    expect(screen.getByTestId("auth-status-sign-in")).toBeInTheDocument();
  });

  it("7. Refreshing the Birthday editor preserves the authenticated state when session remains valid", () => {
    // Initial mount as authenticated
    const { rerender } = render(<BirthdayEditor signedIn={true} />);
    expect(screen.getByTestId("auth-status-signed-in")).toBeInTheDocument();

    // Simulated refresh (re-mounting with valid session)
    rerender(<BirthdayEditor signedIn={true} />);
    expect(screen.getByTestId("auth-status-signed-in")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in to your account/i })).not.toBeInTheDocument();
  });
});
