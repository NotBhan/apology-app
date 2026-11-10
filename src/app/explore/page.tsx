import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/platform/brand";
import { PLATFORM_COPY } from "@/platform/content";
import { listCategories } from "@/experiences/categories";

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
      <div className="mx-auto w-full max-w-[900px] px-5 py-10">
        <Link href="/" className="text-xs uppercase tracking-[0.16em] text-[#a394b4]">
          ← {BRAND.name}
        </Link>

        <header className="mt-4 max-w-[46ch]">
          <h1
            className="text-[clamp(1.8rem,6vw,2.6rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.explore.title}
          </h1>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-[#6b5580]">
            {PLATFORM_COPY.explore.description}
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {listCategories().map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-[#eadff3] bg-white/80 p-5"
              style={{ borderTopColor: category.accent, borderTopWidth: 3 }}
            >
              <p
                className="text-[0.62rem] uppercase tracking-[0.18em]"
                style={{ color: category.accent }}
              >
                {category.status === "implemented" ? "available now" : "coming soon"}
              </p>
              <h2 className="mt-2 text-lg text-[#33203f]">{category.label}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#6b5580]">{category.description}</p>

              {category.status === "implemented" ? (
                <Link
                  href={category.href}
                  className="mt-4 inline-block text-sm font-semibold text-[#6d3fa8] underline"
                >
                  {PLATFORM_COPY.experiences.start} →
                </Link>
              ) : (
                <p className="mt-4 text-xs text-[#a394b4]">{PLATFORM_COPY.experiences.upcoming}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
