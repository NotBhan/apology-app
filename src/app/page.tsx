import type { Metadata } from "next";
import Link from "next/link";
import { ThemeShowcase } from "@/components/theme-selector/ThemeShowcase";
import { startDraftAction } from "./create/actions";

export const metadata: Metadata = {
  title: "Koi Koi — say it properly",
  description:
    "A private, animated apology you can make in minutes. Pick a world, write three messages, seal it with a letter.",
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
              Koi Koi
            </span>
            <span className="text-[0.62rem] uppercase tracking-[0.18em] text-[#a394b4]">
              apologies
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-[0.78rem] font-semibold text-[#6b5580]">
            <Link href="/manage" className="hover:text-[#4b2f6b]">
              My letters
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto w-full max-w-[760px] px-5 pb-16 pt-8 text-center sm:pt-14">
          <p className="text-[0.64rem] uppercase tracking-[0.3em] text-[#a394b4]">
            a private animated apology
          </p>

          <h1
            className="mx-auto mt-4 max-w-[16ch] text-balance text-[clamp(2.4rem,9vw,4rem)] leading-[1.02] text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Some things deserve more than a text.
          </h1>

          <p
            className="mx-auto mt-4 max-w-[30ch] text-[1.15rem] text-[#7a4fb0]"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            Three messages, a sealed letter, and a little world you can hand to them.
          </p>

          <p className="mx-auto mt-5 max-w-[42ch] text-[0.92rem] leading-relaxed text-[#6b5580]">
            Build it in minutes. Preview every scene. Send one private link. No signup, no
            payment, no pressure on the person opening it.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <form action={startDraftAction} className="w-full sm:w-auto">
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#6d3fa8] px-8 text-[0.95rem] font-semibold text-white shadow-[0_14px_32px_-16px_rgba(109,63,168,0.9)] transition active:scale-[0.99] sm:w-auto"
              >
                Start an apology
              </button>
            </form>
            <Link
              href="#themes"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#ddcdea] bg-white/70 px-8 text-[0.9rem] font-semibold text-[#4b2f6b] transition hover:border-[#c9b6dd] sm:w-auto"
            >
              See the eight worlds
            </Link>
          </div>
        </section>
      </div>

      <section id="themes" className="mx-auto w-full max-w-[1080px] scroll-mt-8 px-5 py-14">
        <div className="mb-7 max-w-[46ch]">
          <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#a394b4]">the worlds</p>
          <h2
            className="mt-2 text-[clamp(1.6rem,5vw,2.2rem)] leading-tight text-[#33203f]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Eight ways to say the same true thing.
          </h2>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-[#7c6892]">
            Each one is its own art direction — not a recoloured template. The characters are
            chosen separately, so a midnight confession can star a very earnest capybara.
          </p>
        </div>

        <ThemeShowcase />
      </section>

      <section className="mx-auto w-full max-w-[1080px] px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Write it",
              body: "Three short messages plus an optional personal note. Starters exist; nothing is forced.",
            },
            {
              step: "02",
              title: "Dress it",
              body: "Pick a world, a character pack, music, photos and colours. Preview every scene.",
            },
            {
              step: "03",
              title: "Send one link",
              body: "A private URL, unguessable, revocable. Search engines never index it.",
            },
          ].map((item) => (
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
                the other side
              </p>
              <h2
                className="mt-2 text-[clamp(1.45rem,4.6vw,2rem)] leading-tight text-[#33203f]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Built to be opened, not to pressure.
              </h2>
              <p className="mt-3 text-[0.88rem] leading-relaxed text-[#7c6892]">
                The recipient can stop at any scene, replay it, and leave without answering. Their
                response stays on their device unless they choose to copy it themselves.
              </p>
            </div>

            <ul className="space-y-3 text-[0.84rem] text-[#5b4a6d]">
              {[
                "No forced forgiveness and no score",
                "Responses never leave the recipient’s device",
                "Links are unguessable, unindexed and revocable",
                "Music can be muted or turned off entirely",
                "Reduced-motion is respected throughout",
              ].map((item) => (
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

      <footer className="mx-auto w-full max-w-[1080px] px-5 pb-10 pt-4">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#ece2f6] pt-6 text-[0.72rem] text-[#a394b4] sm:flex-row">
          <p className="max-w-[52ch]">
            Original characters and artwork. Links last at most seven days, then the letter
            and its files are deleted.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#7a4fb0]">
              What we store
            </Link>
            .
          </p>
          <Link href="/create" className="font-semibold text-[#7a4fb0]">
            Start an apology →
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
