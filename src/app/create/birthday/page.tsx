import type { Metadata } from "next";
import Link from "next/link";
import { requirePageCreator } from "@/lib/security/creator";
import { BirthdayEditor } from "@/components/creator/BirthdayEditor";

export const metadata: Metadata = { title: "New birthday · Koi Koi" };
export const dynamic = "force-dynamic";

export default async function NewBirthdayPage() {
  await requirePageCreator("/create/birthday");

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[640px] px-5 py-10">
        <Link href="/" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
          ← Koi Koi
        </Link>
        <h1 className="mt-3 text-[clamp(1.8rem,6vw,2.4rem)] text-[#33203f]">Make a birthday</h1>
        <p className="mt-1 text-sm text-[#6b5580]">
          A headline, a message and one wish. It opens as its own experience.
        </p>
        <div className="mt-8">
          <BirthdayEditor />
        </div>
      </div>
    </main>
  );
}
