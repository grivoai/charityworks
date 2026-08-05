"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { getAdmin, touchLastSeen } from "@/lib/auth";

export type SignInState = { error?: string };

/**
 * Where a `?next=` may point.
 *
 * Only a path inside the admin panel. An unchecked `next` on a login page is
 * an open redirect: an attacker sends `/admin/login?next=https://evil.example`,
 * the victim signs in for real, and lands on a page that can ask them to "confirm"
 * the password they just typed. Anything that is not plainly an internal admin
 * path becomes /admin.
 */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/admin";
  // Must start with a single slash then "admin". Rejects "//host",
  // "https://host", "/\\host" and anything outside the panel.
  if (!/^\/admin(?:\/[\w\-/]*)?$/.test(value)) return "/admin";
  return value;
}

/**
 * A speed bump on repeated failures from one address.
 *
 * Being precise about what this is worth: it is process-local, so on a
 * serverless platform it is per-instance and resets on a cold start. It will
 * slow a naive script pointed at one deployment; it will not stop a
 * distributed attempt, and it is not what makes the login safe.
 *
 * The real controls are elsewhere and are server-side: Supabase Auth rate
 * limits its own sign-in endpoint per address, signups are disabled so the set
 * of valid accounts is fixed and tiny, and a session without an `admin_users`
 * row grants nothing. This is defence in depth, not defence.
 */
const FAILURE_LIMIT = 8;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; first: number }>();

function tooManyFailures(key: string): boolean {
  const record = failures.get(key);
  if (!record) return false;
  if (Date.now() - record.first > FAILURE_WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return record.count >= FAILURE_LIMIT;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const record = failures.get(key);
  if (!record || now - record.first > FAILURE_WINDOW_MS) {
    failures.set(key, { count: 1, first: now });
    return;
  }
  record.count += 1;
}

export async function signIn(
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (tooManyFailures(ip)) {
    return {
      error: "Too many failed attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    recordFailure(ip);
    /**
     * One message for every failure mode, deliberately. Distinguishing "no such
     * account" from "wrong password" turns the login form into a way to test
     * whether an address has access here.
     */
    return { error: "That email and password did not match." };
  }

  /**
   * Authenticating is not the same as being allowed in. Someone can hold a
   * valid Supabase session and have no `admin_users` row — so check, and if
   * there is no grant, end the session rather than leaving them holding one
   * that every page will reject anyway.
   */
  const admin = await getAdmin();
  if (!admin) {
    await supabase.auth.signOut();
    recordFailure(ip);
    return { error: "That account does not have access to the admin panel." };
  }

  failures.delete(ip);
  await touchLastSeen(admin.id);

  // Outside the try/catch shape above on purpose: redirect() signals by
  // throwing, and catching it here would swallow the navigation.
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
