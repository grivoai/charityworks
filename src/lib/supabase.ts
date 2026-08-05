import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set to use the " +
        "database. Unset both to fall back to the seed content in src/content."
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return client;
}
