import Link from "next/link";
import type { ExperienceCategory } from "@/experiences/categories";
import { PLATFORM_COPY } from "@/platform/content";
import { CategoryArt } from "./CategoryArt";

/** Large, illustrated card for an experience you can start right now. */
export function FeaturedCategoryCard({
  category,
}: {
  category: Extract<ExperienceCategory, { status: "implemented" }>;
}) {
  return (
    <article className="group overflow-hidden rounded-[26px] border border-white/70 bg-white shadow-[0_18px_50px_-32px_rgba(64,32,96,0.55)]">
      <div
        className="relative flex h-[168px] items-center justify-center"
        style={{ background: `linear-gradient(135deg, #ffffff 0%, ${category.accent}1f 100%)` }}
      >
        <CategoryArt id={category.id} accent={category.accent} className="h-full w-full" />
      </div>

      <div className="p-6">
        <p
          className="text-[0.6rem] font-semibold uppercase tracking-[0.2em]"
          style={{ color: category.accent }}
        >
          available now
        </p>
        <h3
          className="mt-2 text-[1.6rem] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {category.label}
        </h3>
        <p className="mt-2 text-[0.86rem] leading-relaxed text-[#6b5580]">{category.description}</p>
        <Link
          href={category.href}
          className="mt-5 inline-flex min-h-10 items-center rounded-full px-5 text-[0.82rem] font-semibold text-white transition active:scale-[0.99]"
          style={{ background: category.accent }}
        >
          {PLATFORM_COPY.experiences.start} →
        </Link>
      </div>
    </article>
  );
}

/** Compact strip for a category that is not yet available. */
export function UpcomingCategoryRow({ category }: { category: ExperienceCategory }) {
  if (category.status !== "upcoming") return null;

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-[#eee6f6] bg-white/55 p-3">
      <div
        className="h-12 w-12 shrink-0 rounded-xl"
        style={{ background: `linear-gradient(135deg, #ffffff, ${category.accent}22)` }}
      >
        <CategoryArt id={category.id} accent={category.accent} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <h4 className="truncate text-[0.88rem] font-semibold text-[#4b3a5c]">{category.label}</h4>
        <p className="truncate text-[0.74rem] text-[#8a7a9c]">{category.description}</p>
      </div>
      <span className="ml-auto shrink-0 text-[0.62rem] uppercase tracking-[0.14em] text-[#b3a5c2]">
        soon
      </span>
    </article>
  );
}
