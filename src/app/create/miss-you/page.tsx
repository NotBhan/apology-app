import type { Metadata } from "next";
import Link from "next/link";
import { getCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { missYouContentSchema } from "@/experiences/miss-you/schema";
import { MissYouEditor, type MissYouEditorValues } from "@/components/creator/MissYouEditor";

export const metadata: Metadata = { title: "I Miss You · Koi Koi" };
export const dynamic = "force-dynamic";

export default async function NewMissYouPage({
  searchParams,
}: {
  searchParams?: Promise<{ draftId?: string }>;
} = {}) {
  const creator = await getCreator();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const draftIdParam = resolvedSearchParams?.draftId;

  let initialValues: Partial<MissYouEditorValues> | undefined;
  let initialDraftId: string | undefined;

  if (draftIdParam && creator) {
    try {
      const repo = getRepository();
      const record = await repo.getDraft(draftIdParam);
      if (
        record &&
        record.experienceType === "miss-you" &&
        (record.ownerKeyHash === creator.key || record.ownerKeyHash === creator.legacyKey)
      ) {
        initialDraftId = record.id;
        const parsed = missYouContentSchema.safeParse(record.content);
        if (parsed.success) {
          initialValues = {
            ...parsed.data,
            distanceNote: parsed.data.distanceNote ?? "",
            reunionWish: parsed.data.reunionWish ?? "",
          };
        }
      }
    } catch {
      // Start clean if draft cannot be loaded
    }
  }

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6 pb-14 pt-6 sm:pt-8">
        <div className="flex items-center justify-between">
          <Link href="/explore" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
            ← Experiences
          </Link>
          {!creator && (
            <Link
              href="/auth/sign-in?callbackURL=%2Fcreate%2Fmiss-you"
              className="rounded-full bg-[#9f3e67]/10 px-3 py-1 text-xs font-semibold text-[#9f3e67] hover:bg-[#9f3e67]/20 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
        <h1
          className="mt-3 text-[clamp(1.8rem,6vw,2.4rem)] text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Send an I Miss You
        </h1>
        <p className="mt-1 text-sm text-[#6b5580]">
          {creator
            ? "Save as draft to your account anytime, or publish when ready."
            : "Start now — nothing is saved until you sign in to publish."}
        </p>
        <div className="mt-6">
          <MissYouEditor
            signedIn={Boolean(creator)}
            initialDraftId={initialDraftId}
            initialValues={initialValues}
          />
        </div>
      </div>
    </main>
  );
}
