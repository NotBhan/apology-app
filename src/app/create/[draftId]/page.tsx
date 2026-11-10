import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { CreatorWizardClient } from "@/components/creator/CreatorWizardClient";

export const metadata: Metadata = {
  title: "Edit your apology",
};

export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const creator = await requirePageCreator(`/create/${draftId}`);

  const repo = await getRepository();
  const record = await repo.getDraft(draftId);
  if (!record) notFound();

  // Ownership check happens here, before any draft data reaches the client.
  // A legacy row is reachable while the browser still holds its cookie;
  // claiming it rewrites the hash to the account scope key.
  if (record.ownerKeyHash !== creator.key && record.ownerKeyHash !== creator.legacyKey) {
    notFound();
  }

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <CreatorWizardClient draft={toCreatorDraft(record)} />
    </main>
  );
}
