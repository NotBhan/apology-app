import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/storage";
import { getTheme } from "@/themes/registry";
import { PresentationEngine } from "@/components/presentation/PresentationEngine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A letter for you",
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: "A letter for you", description: "Open it when you're ready." },
};

export default async function LetterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const repo = await getRepository();
  const letter = await repo.getPublishedByToken(token);

  // Unpublished, revoked, unknown and malformed tokens are indistinguishable
  // to the recipient — no oracle for guessing tokens.
  if (!letter) notFound();

  const theme = getTheme(letter.themeId);

  return (
    <main className="min-h-svh">
      <PresentationEngine
        content={letter}
        theme={theme}
        mode="live"
        className="h-svh w-full"
      />
    </main>
  );
}
