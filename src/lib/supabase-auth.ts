import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The user-scoped Supabase client, backed by the session cookie.
 *
 * Distinct from `getServiceClient()` in `supabase.ts`, and the distinction
 * matters. This one carries the signed-in user's own JWT and the publishable
 * key, so it is subject to RLS and can do nothing the user cannot. It answers
 * "who is this?". The service client answers "give me the data", bypasses RLS
 * entirely, and must never be handed a request's identity.
 */

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set " +
        "for the admin panel to sign anyone in."
    );
  }
  return { url, key };
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, key } = env();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. This is the documented
          // no-op: the middleware runs on every /admin request and refreshes
          // the session there, where writing a cookie is allowed.
        }
      },
    },
  });
}
