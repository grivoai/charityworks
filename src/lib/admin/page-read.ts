import "server-only";

import { hiddenPageDefault, isHiddenPageSlug } from "@/content/hidden-pages";
import type { EditableSlug } from "@/lib/admin/page-meta";
import { getServiceClient, readWithRetry } from "@/lib/supabase";

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
 *
 * Retried for the same reason `readSiteDocument` is: a transient gateway
 * timeout on this one read takes the editor and its preview down together.
 */
export async function readPageDocument(slug: EditableSlug): Promise<unknown | null> {
  const { data, error } = await readWithRetry(`page "${slug}"`, () =>
    getServiceClient()
      .from("pages")
      .select("data")
      .eq("slug", slug)
      .maybeSingle<{ data: unknown }>()
  );

  if (error) throw new Error(`could not read the page: ${error.message}`);
  return data ? data.data : null;
}

/**
 * The document the editor opens and a save is compared against.
 *
 * The same as `readPageDocument`, except for a hidden page with no row yet.
 * Those start from today's wording in the code (hidden-pages.ts): the editor
 * shows it, the first save writes the row, and the history's first version
 * is that wording. There is no separate seed step to forget.
 */
export async function readEditableDocument(slug: EditableSlug): Promise<unknown | null> {
  const stored = await readPageDocument(slug);
  if (stored === null && isHiddenPageSlug(slug)) return hiddenPageDefault(slug);
  return stored;
}
