import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { toCreatorDraft } from "@/lib/storage/types";
import { CreatorWizardClient } from "@/components/creator/CreatorWizardClient";

export const metadata: Metadata = {
  title: "Edit your apology",
};

export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const owner = await getOwner();
  if (!owner) redirect("/create");

  const repo = await getRepository();
  const record = await repo.getDraft(draftId);
  if (!record) notFound();

  // Ownership check happens here, before any draft data reaches the client.
  if (record.ownerKeyHash !== owner.hash) notFound();

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <CreatorWizardClient draft={toCreatorDraft(record)} />
    </main>
  );
}
