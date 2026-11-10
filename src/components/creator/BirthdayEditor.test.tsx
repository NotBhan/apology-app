import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BirthdayEditor } from "./BirthdayEditor";

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
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Happy birthday" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
