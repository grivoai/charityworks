import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase";

/**
 * Authorization for the admin panel.
 *
 * Two ideas that are easy to conflate and must not be:
 *
 *   AUTHENTICATION is "Supabase knows who you are" — a valid session for a row
 *   in `auth.users`.
 *
 *   AUTHORIZATION is "you are allowed in here" — a matching row in
 *   `admin_users`. Signups are disabled, so in practice the two coincide today,
 *   but they are not the same check and the second is the one that decides.
 *   Anyone who ever ends up in `auth.users` without an `admin_users` row gets
 *   nothing, which is the correct default and the shape roles will grow into.
 *
 * `requireAdmin()` is called inside every admin page and every server action
 * that writes. The middleware also gates `/admin`, but middleware is a
 * redirect, not a guarantee — it does not run for direct server action
 * invocations, and a matcher is one config edit away from missing a route.
 * The guard has to be where the work happens.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "editor";
}

/** The signed-in admin, or null. Never throws or redirects. */
export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();

  /**
   * getUser(), never getSession().
   *
   * getSession() reads the cookie and trusts it. getUser() sends the token to
   * Supabase to be verified. On a server, where the cookie arrives from the
   * network and is attacker-controlled until proven otherwise, only the second
   * is an authentication check — the first is reading a claim back to yourself.
   */
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  /**
   * Read through the service client. RLS denies the `authenticated` role every
   * table, `admin_users` included, so the user's own client cannot look itself
   * up. That is the intended shape: the row is a grant, and a grant you can
   * read with your own credentials is one you are closer to being able to
   * write.
   */
  const { data, error: lookupError } = await getServiceClient()
    .from("admin_users")
    .select("id, email, name, role")
    .eq("id", user.id)
    .maybeSingle<AdminUser>();

  if (lookupError) {
    // Deny on error rather than fall through. A database blip must not read as
    // a successful authorization.
    console.error("[auth] admin_users lookup failed", lookupError);
    return null;
  }

  return data ?? null;
}

/**
 * The signed-in admin, or a redirect to wherever they still have to go.
 *
 * Two gates, in order. The first is authorization: no `admin_users` row, no
 * panel. The second is the second factor — an account with a verified
 * authenticator app whose session has not presented a code yet gets the
 * challenge screen rather than the page it asked for.
 *
 * This is the ONLY place the second gate lives, and that is why it belongs
 * here: all thirteen admin pages and all five write-action modules already call
 * this function, so there is no route to add and no list to keep in step. A
 * check placed in the middleware instead would cover the pages and miss every
 * server action, which is the half that writes.
 *
 * Redirecting rather than refusing is deliberate, and follows Supabase's own
 * guidance: encountering aal1 on the server is usually a tab left open or a
 * half-finished sign-in, not an attack, and a 403 tells someone in that
 * position nothing about what to do next.
 *
 * `getMfaState` is imported lazily so that the module holding it — and the
 * Supabase auth client it pulls in — is not loaded on the paths that only need
 * `getAdmin()`.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const { mfaChallengePending } = await import("@/lib/mfa");
  if (await mfaChallengePending()) redirect("/admin/login/verify");

  return admin;
}

/** Records that this admin was active, for the "last seen" column. */
export async function touchLastSeen(id: string): Promise<void> {
  const { error } = await getServiceClient()
    .from("admin_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", id);

  // Never fatal. Failing to record a timestamp must not block someone's work.
  if (error) console.error("[auth] could not update last_seen_at", error);
}
