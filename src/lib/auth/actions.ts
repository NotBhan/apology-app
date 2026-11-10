"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { safeCallback } from "@/lib/security/creator";

/**
 * Auth actions.
 *
 * Passwords are never read, hashed or stored here: they go straight to Neon
 * Auth (Better Auth). This module only moves values between the form and the
 * provider and translates its `{ error }` shape into a form message.
 */

export interface AuthFormState {
  error?: string;
}

function message(error: { message?: string } | undefined): string {
  return error?.message?.trim() || "That did not work. Check your details and try again.";
}

export async function signInAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email and password are required." };

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) return { error: message(error) };

  redirect(safeCallback(String(formData.get("callbackURL") ?? "")));
}

export async function signUpAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) return { error: "Email and password are required." };
  if (password.length < 8) return { error: "Use at least 8 characters." };

  const { error } = await getAuth().signUp.email({ email, password, name: name || email });
  if (error) return { error: message(error) };

  redirect(safeCallback(String(formData.get("callbackURL") ?? "")));
}

export async function signOutAction(): Promise<void> {
  await getAuth().signOut();
  redirect("/");
}
