import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The real Link needs the app-router context, which does not exist in a unit
// test. Stubbing it keeps the assertion on what the boundary renders.
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import ErrorBoundary from "./error";

const SECRET_ERROR = Object.assign(
  new Error(
    "postgres query failed: relation 'apologies' permission denied; at Object.query (/app/src/db/client.ts:42); token=SECRET-TOKEN-VALUE",
  ),
  { digest: "abc123digest" },
);

describe("route error boundary", () => {
  it("offers a recovery path instead of a dead end", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();

    render(<ErrorBoundary error={SECRET_ERROR} reset={reset} />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to koi koi/i })).toHaveAttribute("href", "/");

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("never renders the error message or a stack trace", () => {
    const { container } = render(<ErrorBoundary error={SECRET_ERROR} reset={() => {}} />);
    const text = container.textContent ?? "";

    expect(text).not.toContain("postgres query failed");
    expect(text).not.toContain("PERMISSION_DENIED");
    expect(text).not.toContain("SECRET-TOKEN-VALUE");
    expect(text).not.toContain("/app/src/db/client.ts");
    expect(text).not.toContain("at ");
  });

  it("shows only the digest as a support reference", () => {
    render(<ErrorBoundary error={SECRET_ERROR} reset={() => {}} />);
    expect(screen.getByText("abc123digest")).toBeInTheDocument();
  });

  it("works without a digest", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={() => {}} />);
    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
  });
});
