import "server-only";

import type { PageSlug } from "@/content/types";
import { getServiceClient } from "@/lib/supabase";

/**
 * One page's stored document, read straight from the table.
 *
 * Deliberately not `getPage()` from the content layer. That one is wrapped in a
 * tagged cache, which is right for the public site and wrong here twice over:
 * the editor would render a copy of the document rather than the document, and
 * saving it would write that copy back — silently undoing anything the cache had
 * not caught up with. An editor showing something other than what it is about to
 * overwrite is the one thing it must never do.
 *
 * The catalog editor already read uncached for exactly this reason
 * (`catalog-actions.ts`). This is the same rule, for pages.
 */
export async function readPageDocument(slug: PageSlug): Promise<unknown | null> {
  const { data, error } = await getServiceClient()
    .from("pages")
    .select("data")
    .eq("slug", slug)
    .maybeSingle<{ data: unknown }>();

  if (error) throw new Error(`could not read the page: ${error.message}`);
  return data ? data.data : null;
}
