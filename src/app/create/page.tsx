import type { Metadata } from "next";
import Link from "next/link";
import { startDraftAction } from "./actions";

export const metadata: Metadata = {
  title: "Start an apology",
};

export const dynamic = "force-dynamic";

export default function CreatePage() {
  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col justify-center px-5 py-14">
        <p className="text-[0.66rem] uppercase tracking-[0.24em] text-[#a394b4]">before you begin</p>

        <h1
          className="mt-3 text-[clamp(2rem,8vw,2.8rem)] leading-[1.05] text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Say it properly,
          <br />
          in about five minutes.
        </h1>

        <p className="mt-4 max-w-[38ch] text-[0.94rem] leading-relaxed text-[#6b5580]">
          You&rsquo;ll need their first name, your first name, and three short messages. Photos
          and music are optional. Nothing is public and nothing is sent until you share the link.
        </p>

        <ul className="mt-7 space-y-2.5 text-[0.82rem] text-[#6b5580]">
          {[
            "Your words, never auto-written",
            "Eight themes, six character packs",
            "A private link you can revoke",
            "No payment, no signup",
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

        <form action={startDraftAction} className="mt-9">
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#6d3fa8] px-7 text-[0.95rem] font-semibold text-white shadow-[0_12px_28px_-16px_rgba(109,63,168,0.9)] transition active:scale-[0.99]"
          >
            Start writing
          </button>
        </form>

        <Link
          href="/"
          className="mt-5 text-center text-[0.75rem] text-[#8a7a9c] underline underline-offset-4"
        >
          Back to the themes
        </Link>
      </div>
    </main>
  );
}
