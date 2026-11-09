"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level boundary. Renders inside the root layout, so the design language
 * matches the rest of the app.
 *
 * Deliberately shows nothing from the error object except its digest: a
 * message here could contain a storage path, a Firestore operation name or a
 * fragment of someone's letter.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what correlates a server log line with this page. The
    // message itself is never sent anywhere from the client.
    if (process.env.NODE_ENV === "development") {
      console.error("[error-boundary]", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#faf6ff] px-5 py-16">
      <div className="w-full max-w-[420px] text-center">
        <p className="text-[0.62rem] uppercase tracking-[0.28em] text-[#a394b4]">
          something went wrong
        </p>

        <h1
          className="mt-4 text-[clamp(1.7rem,7vw,2.3rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          This page didn&rsquo;t load.
        </h1>

        <p className="mx-auto mt-3 max-w-[34ch] text-[0.88rem] leading-relaxed text-[#6b5580]">
          Nothing you wrote was lost. Try again, and if it keeps happening come back in a
          little while.
        </p>

        {error.digest ? (
          <p className="mt-3 text-[0.68rem] text-[#a394b4]">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#6d3fa8] px-6 text-[0.85rem] font-semibold text-white transition active:scale-[0.99] sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#ddcdea] bg-white px-6 text-[0.85rem] font-semibold text-[#4b2f6b] transition hover:border-[#c9b6dd] sm:w-auto"
          >
            Back to Koi Koi
          </Link>
        </div>
      </div>
    </main>
  );
}
