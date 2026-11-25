import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissYouEditor } from "./MissYouEditor";
import { compressImage } from "@/lib/image";
import { uploadFile } from "@/lib/upload";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/lib/image", () => ({
  compressImage: vi.fn(),
}));

vi.mock("@/lib/upload", () => ({
  toOptimizedUploadFile: vi.fn((blob: Blob, name: string, type: string) => {
    const base = name.replace(/\.[^.]+$/, "") || "photo";
    const ext = type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${base}.${ext}`, { type });
  }),
  uploadFile: vi.fn(),
}));

describe("MissYouEditor", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves anonymous progress locally in sessionStorage and restores on reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<MissYouEditor />);

    await user.type(screen.getByLabelText(/Their name/i), "Maya");
    await user.type(screen.getByLabelText(/Headline/i), "Miles cannot dim this");

    const stored = window.sessionStorage.getItem("koi.miss_you.draft");
    expect(stored).toContain("Miles cannot dim this");
    expect(fetch).not.toHaveBeenCalled();

    unmount();
    render(<MissYouEditor />);
    expect(screen.getByDisplayValue("Miles cannot dim this")).toBeInTheDocument();
    expect(screen.getByText(/Draft restored from this browser/i)).toBeInTheDocument();
  });

  it("renders signed-in, loading, and signed-out account indicators accurately", () => {
    const { rerender } = render(<MissYouEditor isLoadingSession={true} />);
    expect(screen.getByTestId("auth-status-loading")).toBeInTheDocument();

    rerender(<MissYouEditor signedIn={false} isLoadingSession={false} />);
    expect(screen.getByTestId("auth-status-sign-in")).toBeInTheDocument();

    rerender(<MissYouEditor signedIn={true} isLoadingSession={false} />);
    expect(screen.getByTestId("auth-status-signed-in")).toHaveTextContent("Signed in to account");
  });

  it("supports all 5 Miss You themes, 4 photo layouts, and up to 3 everyday reminders", async () => {
    const user = userEvent.setup();
    render(<MissYouEditor signedIn={true} />);

    expect(screen.getByRole("button", { name: /Airmail at Dusk/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rain on the Windowpane/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Empty Chair Across the Table/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Under the Same Sky/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pressed Wildflower/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Rain on the Windowpane/i }));
    await user.click(screen.getByRole("button", { name: /Filmstrip/i }));

    const reminderInput = screen.getByPlaceholderText(/Someone ordered your favorite tea/i);
    await user.type(reminderInput, "Passed our bookstore");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    expect(screen.getByText("Passed our bookstore")).toBeInTheDocument();

    const stored = window.sessionStorage.getItem("koi.miss_you.draft");
    expect(stored).toContain("midnight-window");
    expect(stored).toContain("strips");
    expect(stored).toContain("Passed our bookstore");
  });

  it("compresses photo before uploading to account draft and reports metrics without falling back to raw file on error", async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ draft: { id: "draft-miss-1" } }), { status: 201 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ draft: { id: "draft-miss-1" } }), { status: 200 }));

    vi.mocked(compressImage).mockResolvedValueOnce({
      blob: new Blob(["webp-bytes"], { type: "image/webp" }),
      width: 1200,
      height: 1600,
      type: "image/webp",
      metrics: {
        originalBytes: 2_000_000,
        compressedBytes: 250_000,
        reductionBytes: 1_750_000,
        reductionPercent: 87.5,
        originalFormat: "image/jpeg",
        outputFormat: "image/webp",
        originalWidth: 3000,
        originalHeight: 4000,
        outputWidth: 1200,
        outputHeight: 1600,
        durationMs: 42,
        qualityUsed: 0.78,
        attempts: 1,
        wasRecompressed: true,
        preservedTransparency: false,
      },
    });

    vi.mocked(uploadFile).mockResolvedValueOnce({
      id: "asset-miss-1",
      url: "/api/uploads/asset-miss-1",
    });

    render(
      <MissYouEditor
        signedIn={true}
        initialValues={{ recipientName: "Maya", senderName: "Kabir" }}
      />,
    );

    const fileInput = document.getElementById("missyou-photo-upload") as HTMLInputElement;
    const rawFile = new File(["raw-bytes"], "vacation.JPG", { type: "image/jpeg" });
    await user.upload(fileInput, rawFile);

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalledWith(rawFile, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "vacation.webp", type: "image/webp" }),
        "photo",
        "vacation.webp",
        "draft-miss-1",
        expect.any(AbortSignal),
      );
    });

    expect(screen.getByText(/Optimized: 1953 KB → 244 KB \(WEBP, -87.5%\)/i)).toBeInTheDocument();

    // Verify rejected image never falls back to raw upload
    vi.mocked(compressImage).mockRejectedValueOnce(new Error("Animated GIFs are not supported."));
    const badFile = new File(["GIF89a"], "loop.gif", { type: "image/gif" });
    await user.upload(fileInput, badFile);

    expect(await screen.findByText("Animated GIFs are not supported.")).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalledTimes(1);
  });

  it("saves and publishes a complete I Miss You experience when authenticated", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ draft: { id: "draft-miss-pub" } }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ path: "/letter/tok-miss-pub", token: "tok-miss-pub" }), {
          status: 200,
        }),
      );

    render(<MissYouEditor signedIn={true} />);

    await user.type(screen.getByLabelText(/Their name/i), "Maya");
    await user.type(screen.getByLabelText(/Your name/i), "Kabir");
    await user.type(screen.getByLabelText(/Headline/i), "Counting hours");
    await user.type(screen.getByLabelText(/Personal Note/i), "See you on Friday evening.");

    const publishBtn = screen.getByRole("button", { name: "Publish Experience" });
    await user.click(publishBtn);

    expect(await screen.findByText("/letter/tok-miss-pub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open experience" })).toHaveAttribute(
      "href",
      "/letter/tok-miss-pub",
    );
  });

  it("shows prominent Step 4 photo dropzone and allows authenticated upload before Step 1 names are filled", async () => {
    const user = userEvent.setup({ applyAccept: false });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ draft: { id: "draft-seed-1" } }), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ draft: { id: "draft-seed-1" } }), { status: 200 }),
      );

    vi.mocked(compressImage).mockResolvedValueOnce({
      blob: new Blob(["webp-bytes"], { type: "image/webp" }),
      width: 1000,
      height: 1200,
      type: "image/webp",
      metrics: {
        originalBytes: 500_000,
        compressedBytes: 120_000,
        reductionBytes: 380_000,
        reductionPercent: 76,
        originalFormat: "image/jpeg",
        outputFormat: "image/webp",
        originalWidth: 2000,
        originalHeight: 2400,
        outputWidth: 1000,
        outputHeight: 1200,
        durationMs: 25,
        qualityUsed: 0.78,
        attempts: 1,
        wasRecompressed: true,
        preservedTransparency: false,
      },
    });

    vi.mocked(uploadFile).mockResolvedValueOnce({
      id: "asset-seed-1",
      url: "/api/uploads/asset-seed-1",
    });

    render(<MissYouEditor signedIn={true} />);

    expect(screen.getByText("Attach photographs to this note")).toBeInTheDocument();
    expect(screen.getByText("Choose photos from device")).toBeInTheDocument();

    const fileInput = document.getElementById("missyou-photo-upload") as HTMLInputElement;
    await user.upload(fileInput, new File(["img"], "snap.jpg", { type: "image/jpeg" }));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "snap.webp", type: "image/webp" }),
        "photo",
        "snap.webp",
        "draft-seed-1",
        expect.any(AbortSignal),
      );
    });

    const firstFetchInit = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(firstFetchInit?.body))).toMatchObject({
      experienceType: "miss-you",
      content: expect.objectContaining({
        recipientName: "Friend",
        senderName: "Me",
      }),
    });
  });

  it("shows upfront signed-out guidance and image URL input on Step 4", () => {
    render(<MissYouEditor signedIn={false} />);
    expect(
      screen.getByText(/Sign in to upload files from your device, or paste an image URL below/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Image URL")).toBeInTheDocument();
  });
});
