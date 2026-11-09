"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type AuthFormState } from "@/lib/auth/actions";

const initial: AuthFormState = {};

/**
 * Branded credential form.
 *
 * The official `@neondatabase/auth-ui` package was evaluated and rejected: it
 * is not installable at the top level (the copy it pulls in conflicts on a
 * `better-call` peer), and its prebuilt screens would replace this app's own
 * visual language. This form posts to the same Neon Auth endpoints through a
 * server action, so the provider is unchanged.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "sign-up" ? (
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Your name</span>
          <input
            name="name"
            autoComplete="name"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500"
          />
        </label>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs uppercase tracking-[0.15em] text-stone-500">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-500"
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
