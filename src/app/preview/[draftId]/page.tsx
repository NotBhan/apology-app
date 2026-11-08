import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOwner } from "@/lib/security/owner";
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
  const owner = await getOwner();
  if (!owner) redirect("/create");

  const repo = await getRepository();
  const record = await repo.getDraft(draftId);
  if (!record) notFound();
  if (record.ownerKeyHash !== owner.hash) notFound();

  return <PreviewClient draft={toCreatorDraft(record)} theme={getTheme(record.themeId)} />;
}
