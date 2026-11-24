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

    expect(handleUpload).toHaveBeenCalled();
    expect(await screen.findByAltText("Moment 1")).toBeInTheDocument();
  });
});
