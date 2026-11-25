import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MISS_YOU_THEMES } from "@/experiences/miss-you/themes";
import { MISS_YOU_PHOTO_LAYOUTS } from "@/experiences/miss-you/schema";
import { MissYouPhotoGallery } from "./MissYouPhotoGallery";

describe("MissYouPhotoGallery", () => {
  const photos = [
    { url: "/api/uploads/photo-1.webp", caption: "Station platform", width: 1200, height: 1600 },
    { url: "/api/uploads/photo-2.webp", caption: "Two cups", width: 1600, height: 1200 },
    { url: "/api/uploads/photo-3.webp", caption: "Late train", width: 1200, height: 1200 },
  ];

  const theme = MISS_YOU_THEMES[0]!;

  it("renders empty-state copy when there are no photographs", () => {
    render(<MissYouPhotoGallery photos={[]} theme={theme} />);
    expect(screen.getByText(/No photographs attached/i)).toBeInTheDocument();
  });

  it.each(MISS_YOU_PHOTO_LAYOUTS)("renders %s layout cleanly with normalized URL and object photos", (layout) => {
    const mixed = [
      "/api/uploads/legacy.jpg",
      { url: "/api/uploads/obj.webp", caption: "City lights", width: 800, height: 1000 },
    ];

    render(
      <MissYouPhotoGallery
        photos={mixed}
        layout={layout}
        theme={MISS_YOU_THEMES[1]!}
        animate={false}
      />,
    );

    const gallery = screen.getByTestId("miss-you-photo-gallery");
    expect(gallery).toHaveAttribute("data-layout", layout);
  });

  it("prioritizes the first visible photo and lazy-loads off-screen photos", () => {
    const { container } = render(
      <MissYouPhotoGallery
        photos={photos}
        layout="postcards"
        theme={theme}
        animate={false}
      />,
    );

    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(3);
    expect(imgs[0]).toHaveAttribute("loading", "eager");
    expect(imgs[0]).toHaveAttribute("fetchpriority", "high");
    expect(imgs[0]).toHaveAttribute("decoding", "async");

    expect(imgs[1]).toHaveAttribute("loading", "lazy");
    expect(imgs[1]).not.toHaveAttribute("fetchpriority", "high");
    expect(imgs[2]).toHaveAttribute("loading", "lazy");
  });

  it("keeps visited carousel slides mounted in DOM when stepping back and forth", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MissYouPhotoGallery
        photos={photos}
        layout="carousel"
        theme={MISS_YOU_THEMES[3]!}
        animate={false}
      />,
    );

    // Only first slide is mounted initially
    expect(container.querySelectorAll("img")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByText("Two cups")).toBeInTheDocument();

    // Stepping back keeps slide 2 mounted so the browser will not re-fetch it
    await user.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByText("Station platform")).toBeInTheDocument();
  });

  it("opens full-screen lightbox, supports keyboard navigation, and restores focus on close", async () => {
    const user = userEvent.setup();
    render(
      <MissYouPhotoGallery
        photos={photos}
        layout="polaroid"
        theme={theme}
        animate={false}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /View photo 1: Station platform in full screen/i,
    });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Photo gallery preview" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Photo 2 of 3")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: "Close photo preview" });
    expect(closeBtn).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Photo gallery preview" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("stops waiting placeholder when image fires onError in strips layout", () => {
    const { container } = render(
      <MissYouPhotoGallery
        photos={[{ url: "/api/uploads/missing.webp", caption: "Lost" }]}
        layout="strips"
        theme={MISS_YOU_THEMES[4]!}
        animate={false}
      />,
    );

    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  });

  it("renders updated empty state copy and clamps indices if photos shrink", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <MissYouPhotoGallery photos={[]} layout="postcards" theme={theme} animate={false} />,
    );
    expect(
      screen.getByText("No photographs attached yet — just these words for now."),
    ).toBeInTheDocument();

    rerender(
      <MissYouPhotoGallery photos={photos} layout="carousel" theme={theme} animate={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Jump to photo 3" }));
    expect(screen.getByText("Late train")).toBeInTheDocument();

    rerender(
      <MissYouPhotoGallery
        photos={[photos[0]!]}
        layout="carousel"
        theme={theme}
        animate={false}
      />,
    );
    expect(screen.getByText("Station platform")).toBeInTheDocument();
  });
});
