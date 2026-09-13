import "server-only";

import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * The service-role Supabase client.
 *
 * Every content read and every admin write goes through this. It bypasses row
 * level security, which is intentional and is why this module — and everything
 * that imports it — is `server-only`: the key it holds is a full-access
 * credential and must never reach a browser bundle.
 *
 * The authorization story is therefore not RLS. It is `requireAdmin()`, checked
 * inside every server action that writes. RLS is still enabled on every table
 * with deny-all policies, but as a backstop against a leaked anon key rather
 * than as the mechanism — a per-table policy matrix would be ceremony for an
 * admin with two users, and ceremony that looks like security is worse than
 * none.
 */

let client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (client) return client;

  // The URL is the same value the browser's auth client needs, so it is one
  // NEXT_PUBLIC_ variable rather than a public copy and a private duplicate.
  // The key is what must never be public, and it is not.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set " +
        "to use the database. Unset the key to fall back to the seed content " +
        "in src/content."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}

/**
 * Retries a read a few times before giving up.
 *
 * Supabase's gateway sometimes answers a perfectly ordinary query with a
 * transient failure — a 504 after five seconds, a brief clock skew that reads
 * back as "JWT issued at future", a dropped connection — that would have
 * succeeded a second later. At build time that fails the entire static build;
 * in the admin it throws a stack trace into the editor and a blank preview
 * beside it. A short backoff turns both into a pause instead. A genuine fault
 * (a real outage, a schema mismatch) still surfaces once the attempts are
 * spent, and the caller still decides what to throw — this only buys a few
 * seconds for the transient case.
 */
export async function readWithRetry<R extends { error: PostgrestError | null }>(
  label: string,
  run: () => PromiseLike<R>
): Promise<R> {
  const backoffMs = [500, 1500, 3500];
  let result = await run();
  for (const delay of backoffMs) {
    if (!result.error) return result;
    console.warn(
      `[supabase] transient read error for ${label} (${result.error.message}); ` +
        `retrying in ${delay}ms`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await run();
  }
  return result;
}
