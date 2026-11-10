import type { Metadata } from "next";
import Link from "next/link";
import { requirePageCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { isExpired } from "@/lib/expiry";
import { ManageList } from "@/components/manage/ManageList";

export const metadata: Metadata = {
  title: "My letters",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  // Server-side gate: the dashboard never renders without a verified session.
  const creator = await requirePageCreator("/my-letters");
  const repository = getRepository();

  const drafts = await repository.listByOwner(creator.key);
  const tombstones = await repository.tombstonesForOwner(creator.key);

  // Only expired or already-queued letters can be mid-cleanup.
  const pendingDeletionIds = (
    await Promise.all(
      drafts
        .filter((draft) => draft.status === "deleted" || isExpired(draft.expiresAt))
        .map(async (draft) => ((await repository.isDeletionPending(draft.id)) ? draft.id : null)),
    )
  ).filter((id): id is string => Boolean(id));

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[640px] px-5 py-8">
        <div className="mb-7 flex items-start justify-between gap-3">
          <div>
            <Link
              href="/"
              className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#a394b4] hover:text-[#7a4fb0]"
            >
              ← Koi Koi
            </Link>
            <h1
              className="mt-2 text-[clamp(1.7rem,6vw,2.2rem)] leading-tight text-[#33203f]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              My letters
            </h1>
            <p className="mt-1 text-[0.82rem] text-[#8a7a9c]">
              Links last at most seven days. Expired letters are deleted, files and all.
              Everything here is tied to this browser.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#6d3fa8] px-4 text-[0.8rem] font-semibold text-white"
          >
            New
          </Link>
        </div>

        <ManageList
          drafts={drafts}
          tombstones={tombstones}
          pendingDeletionIds={pendingDeletionIds}
        />

        <p className="mt-6 text-center text-[0.68rem] leading-relaxed text-[#a394b4]">
          Deletion removes the letter, its messages and every uploaded file.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[#7a4fb0]">
            What we store
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
