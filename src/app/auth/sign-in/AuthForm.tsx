"use client";

import { useState } from "react";

/**
 * Credential form.
 *
 * Posts straight to the deployed auth proxy (`/api/auth/*`) — the same handler
 * that answers in ~2 s when called directly. The Server Action path was
 * removed because it intermittently never settled in production: the action
 * awaited the SDK, and the browser waited on the action.
 *
 * A hard 20 s abort means a stalled request surfaces as a message instead of a
 * button stuck on "Working…" indefinitely.
 */
const ABORT_MS = 20_000;

export function AuthForm({
  mode,
  callbackURL,
}: {
  mode: "sign-in" | "sign-up";
  callbackURL: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    if (!email || !password) {
      setError("Email and password are required.");
      setPending(false);
      return;
    }
    if (mode === "sign-up" && password.length < 8) {
      setError("Use at least 8 characters.");
      setPending(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ABORT_MS);

    try {
      const response = await fetch(
        mode === "sign-in" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            mode === "sign-in"
              ? { email, password }
              : { email, password, name: name || email },
          ),
          signal: controller.signal,
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "That did not work. Check your details.");
        return;
      }

      // Full navigation so the server sees the new cookie on its first render.
      window.location.assign(callbackURL);
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "AbortError"
          ? "Sign-in took too long. Please try again."
          : "Could not reach the server. Please try again.",
      );
    } finally {
      clearTimeout(timer);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
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
