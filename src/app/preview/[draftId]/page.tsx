import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePageCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { getTheme } from "@/themes/registry";
import { PreviewClient } from "@/components/creator/PreviewClient";
import { BirthdayLetter } from "@/components/presentation/BirthdayLetter";
import { MissYouLetter } from "@/components/presentation/MissYouLetter";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { missYouContentSchema } from "@/experiences/miss-you/schema";

export const metadata: Metadata = {
  title: "Preview",
};

export const dynamic = "force-dynamic";

function PreviewHeader({ editHref }: { editHref: string }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#ece2f6] bg-white/95 px-4 py-2.5 text-xs backdrop-blur-sm">
      <Link
        href="/manage"
        className="font-semibold text-[#5b3f7d] hover:text-[#33203f] transition-colors"
      >
        ← My Experiences
      </Link>
      <span className="rounded-full bg-[#f4effa] px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#6d3fa8]">
        Draft preview
      </span>
      <Link
        href={editHref}
        className="rounded-full bg-[#6d3fa8] px-3 py-1 font-semibold text-white hover:bg-[#5b3290] transition-colors"
      >
        Edit draft
      </Link>
    </div>
  );
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;
  const creator = await requirePageCreator(`/preview/${draftId}`);

  const repo = await getRepository();
  const record = await repo.getDraft(draftId);
  if (!record) notFound();
  // A legacy row is reachable while the browser still holds its cookie;
  // claiming it rewrites the hash to the account scope key.
  if (record.ownerKeyHash !== creator.key && record.ownerKeyHash !== creator.legacyKey) {
    notFound();
  }

  if (record.experienceType === "birthday") {
    const parsed = birthdayContentSchema.safeParse(record.content);
    if (!parsed.success) redirect(`/create/birthday?draftId=${draftId}`);
    return (
      <div className="min-h-svh flex flex-col">
        <PreviewHeader editHref={`/create/birthday?draftId=${draftId}`} />
        <main className="flex-1">
          <BirthdayLetter content={parsed.data} />
        </main>
      </div>
    );
  }

  if (record.experienceType === "miss-you") {
    const parsed = missYouContentSchema.safeParse(record.content);
    if (!parsed.success) redirect(`/create/miss-you?draftId=${draftId}`);
    return (
      <div className="min-h-svh flex flex-col">
        <PreviewHeader editHref={`/create/miss-you?draftId=${draftId}`} />
        <main className="flex-1">
          <MissYouLetter content={parsed.data} />
        </main>
      </div>
    );
  }

  return <PreviewClient draft={toCreatorDraft(record)} theme={getTheme(record.themeId)} />;
}
