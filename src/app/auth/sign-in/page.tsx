import Link from "next/link";
import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in · Koi Koi",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SignInPage() {
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
  if (data?.user) redirect("/manage");

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-6">
      <header className="space-y-2">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Koi Koi
        </Link>
        <h1 className="text-3xl">Welcome back</h1>
        <p className="text-sm text-stone-600">Sign in to see the letters you have written.</p>
      </header>
      <AuthForm mode="sign-in" />
      <p className="text-sm text-stone-600">
        No account yet?{" "}
        <Link href="/auth/sign-up" className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
