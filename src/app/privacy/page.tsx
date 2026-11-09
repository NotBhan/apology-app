import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  robots: { index: false, follow: false },
};

/**
 * Plain-language notice. It describes what the code actually does, including
 * the fact that deletion is asynchronous — promising instant erasure would be
 * untrue.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-[#faf6ff]">
      <div className="mx-auto w-full max-w-[620px] px-5 py-10">
        <Link
          href="/"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#a394b4] hover:text-[#7a4fb0]"
        >
          ← Koi Koi
        </Link>

        <h1
          className="mt-3 text-[clamp(1.8rem,7vw,2.4rem)] leading-tight text-[#33203f]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What we store, and for how long
        </h1>

        <p className="mt-3 text-[0.9rem] leading-relaxed text-[#6b5580]">
          This page describes what the application actually does. There are no accounts, no
          analytics, no advertising and no third-party trackers.
        </p>

        <Section title="What a letter contains">
          The recipient&rsquo;s first name and yours, the situation you chose, the three messages
          and optional note, your theme and character choices, any photos or audio you uploaded,
          and a random link token. No email, phone number, location or device information.
        </Section>

        <Section title="Links are temporary">
          You choose a window of one to seven days when you publish; there is no way to make a
          link permanent. The deadline is calculated on the server, so a client cannot extend it.
          At that moment the link stops opening and the recipient sees the same page as for a link
          that never existed. Photos and audio stop being served at the same time, so a saved
          image URL does not outlive the letter.
        </Section>

        <Section title="Deletion is automatic, and asynchronous">
          A cleanup job runs hourly. It permanently deletes the letter, both names, the messages,
          the note, the theme and sticker settings, the token, and every uploaded photo and audio
          file belonging to it.
          <br />
          <br />
          Deletion is <strong className="font-semibold text-[#4b2f6b]">not instant</strong> at the
          expiry second. Access stops immediately; data removal follows on the next run — normally
          within about an hour. If storage deletion fails, the job is recorded and retried on the
          next run rather than silently forgotten.
        </Section>

        <Section title="What remains afterwards">
          A minimal record: an internal id, a hashed creator key, a timestamp and a file count. It
          exists so your Manage page can show that a letter was deleted instead of quietly losing
          it. It contains no names, no messages, no media and no usable token.
        </Section>

        <Section title="Deleting it yourself">
          &ldquo;Delete now&rdquo; in Manage runs exactly the same pipeline as expiry: files first,
          then the record. If storage is briefly unavailable the deletion is queued and retried,
          and the interface will not claim it finished.
        </Section>

        <Section title="Your responses stay with you">
          The optional answer at the end of a letter is never transmitted. It lives in the
          recipient&rsquo;s browser and there is no endpoint that accepts it.
        </Section>

        <Section title="Cookies">
          One httpOnly cookie identifies this browser as the creator so your drafts can be listed.
          It holds a random key, not personal information. Clearing site data removes access to
          letters created from that browser.
        </Section>

        <p className="mt-8 text-[0.75rem] leading-relaxed text-[#8a7a9c]">
          Questions about a specific letter can be answered from Manage, which is the only place
          that can identify it.
        </p>

        <Link
          href="/manage"
          className="mt-5 inline-flex min-h-10 items-center rounded-full border border-[#ddcdea] bg-white px-5 text-[0.82rem] font-semibold text-[#4b2f6b]"
        >
          Go to my letters
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-[1rem] font-semibold text-[#33203f]">{title}</h2>
      <p className="mt-1.5 text-[0.86rem] leading-relaxed text-[#6b5580]">{children}</p>
    </section>
  );
}
