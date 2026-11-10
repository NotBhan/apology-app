import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/platform/brand";
import { PLATFORM_COPY } from "@/platform/content";
import { CategorySections } from "@/components/experiences/CategorySections";

export const metadata: Metadata = {
  title: "Explore · Koi Koi",
  description: PLATFORM_COPY.experiences.supporting,
};

export const dynamic = "force-dynamic";

/**
 * Experience selection.
 *
 * Generic "create" actions land here rather than on the apology flow, so the
 * platform never assumes what someone came to make.
 */
export default function ExplorePage() {
  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#efe0f7] blur-3xl" />
        <div className="absolute right-0 top-24 h-64 w-64 rounded-full bg-[#fbe4ee] blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-[940px] px-5 pb-20 pt-10">
        <Link href="/" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
          ← {BRAND.name}
        </Link>

        <header className="mt-5 max-w-[52ch]">
          <p className="text-[0.62rem] uppercase tracking-[0.24em] text-[#a394b4]">
            {PLATFORM_COPY.experiences.eyebrow}
          </p>
          <h1
            className="mt-3 text-[clamp(2rem,6.4vw,3rem)] leading-[1.05] text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.explore.title}
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[#6b5580]">
            {PLATFORM_COPY.explore.description}
          </p>
        </header>

        <div className="mt-10">
          <CategorySections />
        </div>

        <section className="mt-14 rounded-[26px] border border-[#ece2f6] bg-white/70 p-6 text-center sm:p-8">
          <h2
            className="text-[clamp(1.3rem,4vw,1.7rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.closing.heading}
          </h2>
          <p className="mx-auto mt-2 max-w-[40ch] text-[0.86rem] leading-relaxed text-[#7c6892]">
            {PLATFORM_COPY.hero.reassurance}
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[#d9c9ee] px-6 text-[0.84rem] font-semibold text-[#6d3fa8]"
          >
            Back to {BRAND.name}
          </Link>
        </section>
      </div>
    </main>
  );
}
