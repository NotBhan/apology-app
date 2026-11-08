import type { Metadata } from "next";
import Link from "next/link";
import { getOwner } from "@/lib/security/owner";
import { getRepository } from "@/lib/storage";
import { ManageList } from "@/components/manage/ManageList";

export const metadata: Metadata = {
  title: "My letters",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const owner = await getOwner();
  const repo = await getRepository();
  const drafts = owner ? await repo.listByOwner(owner.hash) : [];

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
              Everything here is tied to this browser. Clearing site data removes access.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-[#6d3fa8] px-4 text-[0.8rem] font-semibold text-white"
          >
            New
          </Link>
        </div>

        <ManageList drafts={drafts} />
      </div>
    </main>
  );
}
