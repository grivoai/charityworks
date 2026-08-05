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

/** The signed-in admin, or a redirect to the login page. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
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
