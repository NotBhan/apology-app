import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResponseManageClient } from "./ResponseManageClient";
import * as clientApi from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  manageResponse: vi.fn(),
}));

describe("ResponseManageClient", () => {
  const initialRecord = {
    id: "resp-123",
    status: "published" as const,
    content: {
      message: "Thank you for the note.",
      recipientEmotion: "forgive",
      photos: ["photo-1"],
    },
    publishedAt: "2026-11-20T10:00:00Z",
    createdAt: "2026-11-20T10:00:00Z",
  };

  const manageToken = "man-token-xyz-999";
  const publicToken = "pub-token-abc-111";

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("retrieves and displays the exact public URL from local capability store using publicToken", async () => {
    // Populate capability store with publicToken
    localStorage.setItem(
      "koi_reply_capabilities",
      JSON.stringify({
        [initialRecord.id]: {
          responseId: initialRecord.id,
          manageToken,
          publicToken,
          createdAt: new Date().toISOString(),
        },
      })
    );

    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    // Verify public URL is generated from actual public token
    const publicInput = screen.getByLabelText(/Public Link/i) as HTMLInputElement;
    expect(publicInput.value).toContain(`/response/${publicToken}`);
    // Confirm management token is NEVER part of public URL
    expect(publicInput.value).not.toContain(manageToken);
    expect(publicInput.value).not.toBe(`${window.location.origin}/response`);
  });

  it("shows clear unavailable state when publicToken is not in local storage without generating invalid URL", () => {
    // localStorage is empty (different device / browser)
    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    expect(screen.getByText("Public link is live")).toBeInTheDocument();
    expect(
      screen.getByText(/The public link was created on your original device/i)
    ).toBeInTheDocument();

    // Confirm no broken input with "/response" is rendered
    expect(screen.queryByLabelText(/Public Link/i)).not.toBeInTheDocument();
  });

  it("never exposes or leaks manageToken in public link", () => {
    localStorage.setItem(
      "koi_reply_capabilities",
      JSON.stringify({
        [initialRecord.id]: {
          responseId: initialRecord.id,
          manageToken,
          // Missing publicToken
          updatedAt: new Date().toISOString(),
        },
      })
    );

    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    expect(screen.queryByDisplayValue(new RegExp(manageToken))).not.toBeInTheDocument();
  });

  it("does not use publicToken from a different response stored in capabilities", () => {
    // Populate capability store with a different response's publicToken
    localStorage.setItem(
      "koi_reply_capabilities",
      JSON.stringify({
        "different-response-id": {
          responseId: "different-response-id",
          manageToken: "different-manage-token",
          publicToken: "different-public-token-999",
          createdAt: new Date().toISOString(),
        },
      })
    );

    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    // Should be scoped to initialRecord.id; different response should not be used
    expect(screen.queryByDisplayValue(/different-public-token-999/)).not.toBeInTheDocument();
    expect(screen.getByText("Public link is live")).toBeInTheDocument();
  });

  it("announces status feedback and updates UI when revoking and restoring link", async () => {
    const user = userEvent.setup();
    const manageSpy = vi.spyOn(clientApi, "manageResponse").mockResolvedValue({
      ok: true,
      status: "revoked",
    });

    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    const revokeBtn = screen.getByRole("button", { name: /Revoke Public Link/i });
    await user.click(revokeBtn);

    expect(manageSpy).toHaveBeenCalledWith(manageToken, "revoke");

    await waitFor(() => {
      expect(screen.getByText("Revoked")).toBeInTheDocument();
      expect(screen.getByText(/Public link revoked/i)).toBeInTheDocument();
      expect(screen.getByText("Public link is disabled")).toBeInTheDocument();
    });

    // Now restore
    manageSpy.mockResolvedValueOnce({
      ok: true,
      status: "published",
    });

    const restoreBtn = screen.getByRole("button", { name: /Restore Public Link/i });
    await user.click(restoreBtn);

    expect(manageSpy).toHaveBeenCalledWith(manageToken, "restore");

    await waitFor(() => {
      expect(screen.getByText("Live")).toBeInTheDocument();
      expect(screen.getByText(/Public link restored/i)).toBeInTheDocument();
    });
  });

  it("displays alertdialog semantics when confirming permanent deletion", async () => {
    const user = userEvent.setup();
    render(
      <ResponseManageClient
        initialRecord={initialRecord}
        manageToken={manageToken}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Delete Reply Permanently/i });
    await user.click(deleteBtn);

    const alertDialog = screen.getByRole("alertdialog");
    expect(alertDialog).toBeInTheDocument();
    expect(alertDialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Permanently delete this reply?")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelBtn);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
