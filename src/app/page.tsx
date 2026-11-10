import type { Metadata } from "next";
import { BRAND } from "@/platform/brand";
import { PLATFORM_COPY } from "@/platform/content";
import Link from "next/link";
import { ThemeShowcase } from "@/components/theme-selector/ThemeShowcase";
import { CategorySections } from "@/components/experiences/CategorySections";
import { BIRTHDAY_THEMES } from "@/experiences/birthday/themes";

export const metadata: Metadata = {
  title: "Make Something Meaningful",
  description:
    "Create personalised digital experiences for apologies, birthdays, celebrations, love, and life's meaningful moments. Make something special and share it privately.",
  openGraph: {
    title: "Koi Koi — Make Something Meaningful",
    description:
      "Personalised, interactive experiences for apologies, birthdays, celebrations and the moments worth remembering.",
  },
};

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-svh bg-[#faf6ff]">
      <div className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#efe0f7] blur-3xl" />
          <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-[#fbe4ee] blur-3xl" />
          <Heart className="absolute left-[12%] top-[18%] h-5 w-5 text-[#c99adf]" />
          <Heart className="absolute right-[16%] top-[30%] h-4 w-4 text-[#e58fb6]" />
          <Heart className="absolute left-[26%] top-[62%] h-3.5 w-3.5 text-[#d9bde8]" />
          <span className="absolute right-[28%] top-[12%] h-1.5 w-1.5 rounded-full bg-[#b98fd6]" />
          <span className="absolute left-[42%] top-[8%] h-1 w-1 rounded-full bg-[#e58fb6]" />
        </div>

        <header className="relative mx-auto flex w-full max-w-[1080px] items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span
              className="text-[1.25rem] font-semibold tracking-tight text-[#33203f]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {BRAND.name}
            </span>
            <span className="text-[0.62rem] uppercase tracking-[0.18em] text-[#a394b4]">
              experiences
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-[0.78rem] font-semibold text-[#6b5580]">
            <Link href="/explore" className="hover:text-[#4b2f6b]">
              {PLATFORM_COPY.nav.explore}
            </Link>
            <Link href="/my-letters" className="hover:text-[#4b2f6b]">
              {PLATFORM_COPY.nav.collection}
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto w-full max-w-[760px] px-5 pb-16 pt-8 text-center sm:pt-14">
          <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#a394b4]">
            {PLATFORM_COPY.hero.eyebrow}
          </p>

          <h1
            className="mx-auto mt-4 max-w-[16ch] text-balance text-[clamp(2.4rem,9vw,4rem)] leading-[1.02] text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.hero.headline}
          </h1>

          <p className="mx-auto mt-5 max-w-[46ch] text-[0.95rem] leading-relaxed text-[#6b5580]">
            {PLATFORM_COPY.hero.supporting}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/explore"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#6d3fa8] px-8 text-[0.95rem] font-semibold text-white shadow-[0_14px_32px_-16px_rgba(109,63,168,0.9)] transition active:scale-[0.99] sm:w-auto"
            >
              {PLATFORM_COPY.hero.primaryCta}
            </Link>
            <Link
              href="#experiences"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#ddcdea] bg-white/70 px-8 text-[0.9rem] font-semibold text-[#4b2f6b] transition hover:border-[#c9b6dd] sm:w-auto"
            >
              {PLATFORM_COPY.hero.secondaryCta}
            </Link>
          </div>

          <p className="mx-auto mt-4 max-w-[42ch] text-[0.76rem] text-[#a394b4]">
            {PLATFORM_COPY.hero.reassurance}
          </p>
        </section>
      </div>

      <section id="experiences" className="mx-auto w-full max-w-[1080px] px-5 py-12">
        <div className="mb-6 max-w-[46ch]">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">
            {PLATFORM_COPY.experiences.eyebrow}
          </p>
          <h2
            className="mt-2 text-[clamp(1.4rem,4.6vw,2rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.experiences.heading}
          </h2>
          <p className="mt-2 text-[0.86rem] leading-relaxed text-[#7c6892]">
            {PLATFORM_COPY.experiences.supporting}
          </p>
        </div>

        <CategorySections />
      </section>

      <section id="themes" className="mx-auto w-full max-w-[1080px] scroll-mt-8 px-5 py-14">
        <div className="mb-7 max-w-[50ch]">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">
            {PLATFORM_COPY.worlds.eyebrow}
          </p>
          <h2
            className="mt-2 text-[clamp(1.6rem,5vw,2.2rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.worlds.heading}
          </h2>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-[#7c6892]">
            {PLATFORM_COPY.worlds.supporting}
          </p>
        </div>

        <div className="space-y-10">
          <div>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[1rem] font-semibold text-[#33203f]">
                {PLATFORM_COPY.worlds.apologyGroup}
              </h3>
              <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[#a394b4]">
                for the apology experience
              </p>
            </div>
            <ThemeShowcase />
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[1rem] font-semibold text-[#33203f]">
                {PLATFORM_COPY.worlds.birthdayGroup}
              </h3>
              <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[#a394b4]">
                for the birthday experience
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {BIRTHDAY_THEMES.map((theme) => (
                <article
                  key={theme.id}
                  className="rounded-2xl border p-5"
                  style={{
                    background: theme.palette.background,
                    borderColor: theme.palette.surface,
                    color: theme.palette.text,
                  }}
                >
                  <p
                    className="text-[0.6rem] uppercase tracking-[0.18em]"
                    style={{ color: theme.palette.accent }}
                  >
                    birthday
                  </p>
                  <h4 className="mt-2 text-[1rem] font-semibold">{theme.name}</h4>
                  <p className="mt-1 text-[0.82rem] leading-relaxed opacity-80">{theme.tagline}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1080px] px-5 py-10">
        <div className="mb-6 max-w-[46ch]">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">
            {PLATFORM_COPY.howItWorks.eyebrow}
          </p>
          <h2
            className="mt-2 text-[clamp(1.4rem,4.6vw,2rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.howItWorks.heading}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PLATFORM_COPY.howItWorks.steps.map((item) => (
            <div
              key={item.step}
              className="rounded-3xl border border-[#ece2f6] bg-white/70 p-5 backdrop-blur"
            >
              <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#b3a5c2]">
                {item.step}
              </p>
              <h3 className="mt-2 text-[1rem] font-semibold text-[#33203f]">{item.title}</h3>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[#7c6892]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1080px] px-5 py-10">
        <div className="rounded-[28px] border border-[#ece2f6] bg-white p-6 sm:p-9">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">
                {PLATFORM_COPY.recipient.eyebrow}
              </p>
              <h2
                className="mt-2 text-[clamp(1.45rem,4.6vw,2rem)] leading-tight text-[#33203f]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {PLATFORM_COPY.recipient.heading}
              </h2>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-[#7c6892]">
                {PLATFORM_COPY.recipient.description}
              </p>
            </div>

            <ul className="space-y-3 text-[0.84rem] text-[#5b4a6d]">
              {PLATFORM_COPY.recipient.points.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a5bc4]"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1080px] px-5 py-10">
        <div className="mb-6 max-w-[46ch]">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">
            {PLATFORM_COPY.personalisation.eyebrow}
          </p>
          <h2
            className="mt-2 text-[clamp(1.4rem,4.6vw,2rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {PLATFORM_COPY.personalisation.heading}
          </h2>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-[#7c6892]">
            {PLATFORM_COPY.personalisation.description}
          </p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_COPY.personalisation.items.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-[#ece2f6] bg-white/70 px-4 py-3 text-[0.84rem] text-[#5b4a6d]"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-[760px] px-5 py-14 text-center">
        <h2
          className="text-[clamp(1.7rem,5.4vw,2.4rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {PLATFORM_COPY.closing.heading}
        </h2>
        <p className="mx-auto mt-3 max-w-[36ch] text-[0.9rem] leading-relaxed text-[#7c6892]">
          {PLATFORM_COPY.closing.supporting}
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#6d3fa8] px-8 text-[0.95rem] font-semibold text-white shadow-[0_14px_32px_-16px_rgba(109,63,168,0.9)] transition active:scale-[0.99]"
        >
          {PLATFORM_COPY.closing.cta}
        </Link>
      </section>

      <footer className="mx-auto w-full max-w-[1080px] px-5 pb-10 pt-4">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#ece2f6] pt-6 text-[0.72rem] text-[#a394b4] sm:flex-row">
          <p className="max-w-[52ch]">
            {PLATFORM_COPY.footer.description} {PLATFORM_COPY.footer.retention}{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#7a4fb0]">
              {PLATFORM_COPY.footer.privacyLink}
            </Link>
            .
          </p>
          <Link href="/explore" className="font-semibold text-[#7a4fb0]">
            {PLATFORM_COPY.closing.cta} →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Heart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 21s-7.5-4.6-9.3-9A4.9 4.9 0 0 1 12 6.4 4.9 4.9 0 0 1 21.3 12c-1.8 4.4-9.3 9-9.3 9Z" />
    </svg>
  );
}
