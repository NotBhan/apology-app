import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { getTheme } from "@/themes/registry";
import { PreviewClient } from "@/components/creator/PreviewClient";

export const metadata: Metadata = {
  title: "Preview",
};

export const dynamic = "force-dynamic";

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

  return <PreviewClient draft={toCreatorDraft(record)} theme={getTheme(record.themeId)} />;
}
