import Link from "next/link";
import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { safeCallback } from "@/lib/security/creator";
import { AuthForm } from "../sign-in/AuthForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create account · Koi Koi",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  const destination = safeCallback(callbackURL);
  if (!authConfigured()) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl">Sign-in is not configured</h1>
        <p className="text-sm text-stone-600">
          This deployment is missing its auth configuration. Please try again later.
        </p>
        <Link href="/" className="text-sm underline">
          Back home
        </Link>
      </main>
    );
  }

  const { data } = await getAuth().getSession();
  if (data?.user) redirect(destination);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-6">
      <header className="space-y-2">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Koi Koi
        </Link>
        <h1 className="text-3xl">Create your account</h1>
        <p className="text-sm text-stone-600">Keep every experience you create in one place.</p>
      </header>
      <AuthForm mode="sign-up" callbackURL={destination} />
      <p className="text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
