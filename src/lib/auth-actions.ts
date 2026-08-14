"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { getAdmin, touchLastSeen } from "@/lib/auth";
import {
  isRateLimited,
  recordFailure,
  clearFailures,
} from "@/lib/auth-throttle";

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
 * Repeated-failure throttling lives in `@/lib/auth-throttle`, backed by Postgres
 * so the count holds across every serverless instance and every cold start
 * rather than resetting per-process. Two buckets are kept, one on the caller's
 * IP and one on the target email, and both fail open on a database error.
 *
 * This defends the login form. It is not the whole story: signups are disabled
 * so the set of valid accounts is fixed and tiny, a session without an
 * `admin_users` row grants nothing, and — for the path that skips this form and
 * calls Supabase's token endpoint directly — Supabase Auth's own rate limits and
 * CAPTCHA Attack Protection are the backstop, configured in the dashboard.
 */

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

  if (await isRateLimited(ip, email)) {
    return {
      error: "Too many failed attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailure(ip, email);
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
    await recordFailure(ip, email);
    return { error: "That account does not have access to the admin panel." };
  }

  await clearFailures(ip, email);
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
