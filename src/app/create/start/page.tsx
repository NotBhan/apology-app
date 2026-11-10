import type { Metadata } from "next";
import Link from "next/link";
import { getCreator } from "@/lib/security/creator";
import { redirect } from "next/navigation";
import { AnonymousWizard } from "@/components/creator/AnonymousWizard";

export const metadata: Metadata = { title: "Start an apology · Koi Koi" };
export const dynamic = "force-dynamic";

export default async function StartApologyPage() {
  // Signed-in creators keep the persisted wizard; this route exists for the
  // anonymous path, which stores nothing until sign-in.
  const creator = await getCreator();
  if (creator) redirect("/create");

  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6">
        <Link href="/create" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
          ← Koi Koi
        </Link>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You can write and preview now. Nothing is saved to an account until you sign in.
        </p>
      </div>
      <AnonymousWizard />
    </main>
  );
}
