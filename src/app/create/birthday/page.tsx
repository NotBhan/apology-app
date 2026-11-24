import type { Metadata } from "next";
import Link from "next/link";
import { getCreator } from "@/lib/security/creator";
import { BirthdayEditor } from "@/components/creator/BirthdayEditor";

export const metadata: Metadata = { title: "New birthday · Koi Koi" };
export const dynamic = "force-dynamic";

export default async function NewBirthdayPage() {
  const creator = await getCreator();

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
          Start now — nothing is saved until you sign in to publish.
        </p>
        <div className="mt-8">
          <BirthdayEditor />
        </div>
      </div>
    </main>
  );
}
