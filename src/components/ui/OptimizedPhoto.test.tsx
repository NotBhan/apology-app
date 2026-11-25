import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptimizedPhoto } from "./OptimizedPhoto";

describe("OptimizedPhoto", () => {
  it("renders eager high-priority decoding hints for hero images", () => {
    render(<OptimizedPhoto src="/api/uploads/hero.webp" alt="Hero shot" priority />);
    const img = screen.getByAltText("Hero shot");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("renders lazy decoding hints for off-screen images and clears skeleton on load", () => {
    render(<OptimizedPhoto src="/api/uploads/gallery-2.webp" alt="Gallery tile" />);
    const img = screen.getByAltText("Gallery tile");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("fetchpriority", "auto");
    expect(img).toHaveClass("opacity-0");

    fireEvent.load(img);
    expect(img).toHaveClass("opacity-100");
  });

  it("renders a calm fallback placeholder when image loading fails", () => {
    render(
      <OptimizedPhoto
        src="/api/uploads/missing.webp"
        alt="Missing photo"
        fallbackLabel="Could not load memory"
      />,
    );
    const img = screen.getByAltText("Missing photo");
    fireEvent.error(img);

    expect(screen.getByText("Could not load memory")).toBeInTheDocument();
  });
});
