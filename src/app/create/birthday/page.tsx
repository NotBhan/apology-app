import type { Metadata } from "next";
import Link from "next/link";
import { getCreator } from "@/lib/security/creator";
import { getRepository } from "@/lib/storage";
import { birthdayContentSchema } from "@/experiences/birthday/schema";
import { BirthdayEditor, type BirthdayEditorValues } from "@/components/creator/BirthdayEditor";

export const metadata: Metadata = { title: "New birthday · Koi Koi" };
export const dynamic = "force-dynamic";

export default async function NewBirthdayPage({
  searchParams,
}: {
  searchParams?: Promise<{ draftId?: string }>;
} = {}) {
  const creator = await getCreator();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const draftIdParam = resolvedSearchParams?.draftId;

  let initialValues: Partial<BirthdayEditorValues> | undefined;
  let initialDraftId: string | undefined;

  if (draftIdParam && creator) {
    try {
      const repo = await getRepository();
      const record = await repo.getDraft(draftIdParam);
      if (
        record &&
        record.experienceType === "birthday" &&
        (record.ownerKeyHash === creator.key || record.ownerKeyHash === creator.legacyKey)
      ) {
        initialDraftId = record.id;
        const parsed = birthdayContentSchema.safeParse(record.content);
        if (parsed.success) {
          initialValues = parsed.data;
        }
      }
    } catch {
      // If draft cannot be read, start clean
    }
  }

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[640px] px-5 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
            ← Koi Koi
          </Link>
          {!creator && (
            <Link
              href="/auth/sign-in?callbackURL=%2Fcreate%2Fbirthday"
              className="rounded-full bg-[#6d3fa8]/10 px-3 py-1 text-xs font-semibold text-[#6d3fa8] hover:bg-[#6d3fa8]/20 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
        <h1 className="mt-3 text-[clamp(1.8rem,6vw,2.4rem)] text-[#33203f]">Make a birthday</h1>
        <p className="mt-1 text-sm text-[#6b5580]">
          {creator
            ? "Save as draft to your account anytime, or publish when ready."
            : "Start now — nothing is saved until you sign in to publish."}
        </p>
        <div className="mt-8">
          <BirthdayEditor
            signedIn={Boolean(creator)}
            initialDraftId={initialDraftId}
            initialValues={initialValues}
          />
        </div>
      </div>
    </main>
  );
}
