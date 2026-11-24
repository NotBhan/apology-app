import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BirthdayPhotoGallery } from "./BirthdayPhotoGallery";
import { resolveBirthdayTheme } from "@/experiences/birthday/themes";

const mockPhotos = [
  { url: "https://example.com/photo1.jpg", caption: "Trip to Paris" },
  { url: "https://example.com/photo2.jpg", caption: "Birthday dinner celebration" },
  { url: "https://example.com/photo3.jpg" },
];

describe("BirthdayPhotoGallery", () => {
  it("renders empty state placeholder when no photos are provided", () => {
    const theme = resolveBirthdayTheme("confetti");
    render(<BirthdayPhotoGallery photos={[]} theme={theme} />);

    expect(
      screen.getByText(/No photos this time — the words are the gift./i),
    ).toBeInTheDocument();
  });

  it("renders photos with theme-adaptive layout across all themes", () => {
    const themes = ["confetti", "midnight-gold", "pastel", "floral", "vintage", "playful"] as const;

    for (const themeId of themes) {
      const theme = resolveBirthdayTheme(themeId);
      const { unmount } = render(
        <BirthdayPhotoGallery
          photos={mockPhotos}
          layout="theme-adaptive"
          theme={theme}
        />,
      );

      expect(screen.getByText("Trip to Paris")).toBeInTheDocument();
      expect(screen.getByText("Birthday dinner celebration")).toBeInTheDocument();
      unmount();
    }
  });

  it("renders photos in scrapbook layout with captions", () => {
    const theme = resolveBirthdayTheme("confetti");
    render(
      <BirthdayPhotoGallery
        photos={mockPhotos}
        layout="scrapbook"
        theme={theme}
      />,
    );

    expect(screen.getByText("Trip to Paris")).toBeInTheDocument();
    expect(screen.getByText("Birthday dinner celebration")).toBeInTheDocument();
  });

  it("renders photos in polaroid layout with captions", () => {
    const theme = resolveBirthdayTheme("pastel");
    render(
      <BirthdayPhotoGallery
        photos={mockPhotos}
        layout="polaroid"
        theme={theme}
      />,
    );

    expect(screen.getByText("Trip to Paris")).toBeInTheDocument();
    expect(screen.getByText("Birthday dinner celebration")).toBeInTheDocument();
  });

  it("renders photos in slideshow layout and navigates through carousel", async () => {
    const user = userEvent.setup();
    const theme = resolveBirthdayTheme("midnight-gold");
    render(
      <BirthdayPhotoGallery
        photos={mockPhotos}
        layout="slideshow"
        theme={theme}
      />,
    );

    // Initial photo caption
    expect(screen.getByText("Trip to Paris")).toBeInTheDocument();

    // Next photo
    await user.click(screen.getByRole("button", { name: /Next photo/i }));
    expect(screen.getByText("Birthday dinner celebration")).toBeInTheDocument();

    // Previous photo
    await user.click(screen.getByRole("button", { name: /Previous photo/i }));
    expect(screen.getByText("Trip to Paris")).toBeInTheDocument();
  });

  it("opens accessible lightbox modal when a photo is clicked, allows navigation, and closes on Escape", async () => {
    const user = userEvent.setup();
    const theme = resolveBirthdayTheme("confetti");
    render(
      <BirthdayPhotoGallery
        photos={mockPhotos}
        layout="theme-adaptive"
        theme={theme}
      />,
    );

    // Click photo 1
    const photo1Btn = screen.getByRole("button", { name: /View photo 1/i });
    await user.click(photo1Btn);

    // Lightbox dialog should open
    const dialog = screen.getByRole("dialog", { name: /Photo gallery preview/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Photo 1 of 3")).toBeInTheDocument();

    // Navigate to next photo in lightbox
    const nextBtn = screen.getByRole("button", { name: /Next photo/i });
    await user.click(nextBtn);
    expect(screen.getByText("Photo 2 of 3")).toBeInTheDocument();

    // Press Escape key to close lightbox
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes lightbox modal when the close button is clicked", async () => {
    const user = userEvent.setup();
    const theme = resolveBirthdayTheme("confetti");
    render(
      <BirthdayPhotoGallery
        photos={mockPhotos}
        layout="theme-adaptive"
        theme={theme}
      />,
    );

    const photo1Btn = screen.getByRole("button", { name: /View photo 1/i });
    await user.click(photo1Btn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close photo preview/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
