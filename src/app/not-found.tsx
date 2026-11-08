import Link from "next/link";

export const metadata = {
  title: "Not available",
  robots: { index: false, follow: false },
};

/**
 * Deliberately uniform: an expired link, a revoked link, a mistyped token and a
 * draft that never existed all land here, so the page cannot be used to work out
 * whether a token was ever real.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#faf6ff] px-5 py-16">
      <div className="w-full max-w-[420px] text-center">
        <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#a394b4]">link unavailable</p>

        <h1
          className="mt-4 text-[clamp(1.7rem,7vw,2.3rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          This letter isn&rsquo;t open right now.
        </h1>

        <p className="mx-auto mt-3 max-w-[34ch] text-[0.88rem] leading-relaxed text-[#6b5580]">
          Apology links are temporary, and this one may have expired or been closed by the person
          who made it. If someone sent it to you, ask them for a fresh link.
        </p>

        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-[#ddcdea] bg-white px-6 text-[0.85rem] font-semibold text-[#4b2f6b] transition hover:border-[#c9b6dd]"
        >
          Back to Koi Koi
        </Link>
      </div>
    </main>
  );
}
