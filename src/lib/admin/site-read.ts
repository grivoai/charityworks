import "server-only";

import { getServiceClient, readWithRetry } from "@/lib/supabase";

/**
 * The site settings document, read straight from the table.
 *
 * Same rule as `readPageDocument`, and it matters more here: `getSite()` is
 * wrapped in a tagged cache that every route on the site reads from, so an
 * editor rendering the cached copy would be showing a version of the navigation
 * and contact block that may already be behind the row it is about to
 * overwrite. An editor must show the document it is about to replace.
 *
 * Retried, because this one read is the whole page: the editor and the
 * preview beside it both throw if it fails, and the gateway in front of the
 * database has been seen to answer it with a 504 once and a row a second
 * later. The public reads have absorbed that for a while; an admin sitting in
 * front of a stack trace deserves the same few seconds of patience.
 */
export async function readSiteDocument(): Promise<unknown | null> {
  const { data, error } = await readWithRetry("site settings", () =>
    getServiceClient()
      .from("site_settings")
      .select("data")
      .eq("id", SITE_ROW_ID)
      .maybeSingle<{ data: unknown }>()
  );

  if (error) throw new Error(`could not read the site settings: ${error.message}`);
  return data ? data.data : null;
}

/**
 * There is one row and its id is 1 — the table has `check (id = 1)` on it, so
 * this is the schema's own constraint rather than a convention to remember.
 * Named because the revisions table keys on a string entity id and "1" appearing
 * bare in three files reads like a magic number.
 */
export const SITE_ROW_ID = 1;
export const SITE_ENTITY_ID = "1";
