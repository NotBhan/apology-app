import type { Metadata } from "next";
import Link from "next/link";
import { requirePageCreator } from "@/lib/security/creator";
import { signOutAction } from "@/lib/auth/actions";
import { getRepository } from "@/lib/storage";
import { isExpired } from "@/lib/expiry";
import { ManageList } from "@/components/manage/ManageList";

export const metadata: Metadata = {
  title: "My Experiences",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  // Server-side gate: the dashboard never renders without a verified session.
  const creator = await requirePageCreator("/my-letters");
  const repository = getRepository();

  const drafts = await repository.listByOwner(creator.key, creator.legacyKey);
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
              My Experiences
            </h1>
            <p className="mt-1 text-[0.82rem] text-[#8a7a9c]">
              Everything you've made lives here. Links last at most seven days; expired
              experiences are deleted, files and all.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#6d3fa8] px-4 text-[0.8rem] font-semibold text-white"
          >
            Create
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-full border border-[#d9c9ee] px-4 text-[0.8rem] font-semibold text-[#6d3fa8]"
            >
              Sign out
            </button>
          </form>
        </div>

        <ManageList
          drafts={drafts}
          tombstones={tombstones}
          pendingDeletionIds={pendingDeletionIds}
        />

        <p className="mt-6 text-center text-[0.68rem] leading-relaxed text-[#a394b4]">
          Deletion removes the experience, its messages and every uploaded file.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[#7a4fb0]">
            What we store
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
