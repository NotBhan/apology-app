import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResponseRepository } from "@/lib/storage";
import { ResponseViewClient } from "./ResponseViewClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A reply for you",
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: "A reply for you", description: "A personal response on Koi Koi." },
};

export default async function PublicResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const repository = getResponseRepository();
  const result = await repository.getByPublicToken(token);

  if (!result) {
    notFound();
  }

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <ResponseViewClient
        response={result.response}
        parent={{
          recipientName: result.parent.recipientName,
          senderName: result.parent.senderName,
          publishedAt: result.parent.publishedAt,
          experienceType: result.parent.experienceType,
        }}
        token={token}
      />
    </main>
  );
}
