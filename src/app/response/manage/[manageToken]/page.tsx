import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResponseRepository } from "@/lib/storage";
import type { QuickReplyPayload } from "@/types/response";
import { ResponseManageClient } from "./ResponseManageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Reply",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ManageResponsePage({
  params,
}: {
  params: Promise<{ manageToken: string }>;
}) {
  const { manageToken } = await params;
  const repository = getResponseRepository();
  const record = await repository.getByManageToken(manageToken);

  if (!record || record.status === "deleted") {
    notFound();
  }

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <ResponseManageClient
        initialRecord={{
          id: record.id,
          status: record.status,
          content: record.content as QuickReplyPayload,
          publishedAt: record.publishedAt,
          createdAt: record.createdAt,
        }}
        manageToken={manageToken}
      />
    </main>
  );
}
