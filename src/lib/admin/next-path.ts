/**
 * Where a `?next=` may point.
 *
 * Only a path inside the admin panel. An unchecked `next` on a login page is an
 * open redirect: an attacker sends `/admin/login?next=https://evil.example`, the
 * victim signs in for real, and lands on a page that can ask them to "confirm"
 * the password they just typed. Anything that is not plainly an internal admin
 * path becomes /admin.
 *
 * Lifted out of `auth-actions.ts` when the two-factor challenge screen became a
 * third place that has to hop through a `next`. It could not be imported from
 * there — that module is `"use server"` and may only export async functions —
 * and the login page had already grown its own copy of the regex. Three copies
 * of a security check is how one of them comes to be the lenient one.
 */

/** Must start with a single slash then "admin". Rejects "//host",
 *  "https://host", "/\\host" and anything outside the panel. */
const SAFE = /^\/admin(?:\/[\w\-/]*)?$/;

/**
 * The sign-in screens themselves are never a destination.
 *
 * Landing back on a login form after signing in is at best a confusing extra
 * hop, and the two-factor challenge redirects THROUGH a `next` — so without
 * this, `/admin/login/verify?next=/admin/login/verify` sends someone in a small
 * circle after they get the code right.
 */
const NOT_A_DESTINATION = /^\/admin\/login(?:\/|$)/;

export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!SAFE.test(value)) return "/admin";
  if (NOT_A_DESTINATION.test(value)) return "/admin";
  return value;
}
