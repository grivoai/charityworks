import { notFound, redirect } from "next/navigation";

import { getDocument } from "@/lib/documents";

/**
 * The permanent link: /d/<slug>.
 *
 * This is a redirect to wherever the file currently lives, and the indirection
 * is the entire point. The client hands out `/d/spring-newsletter`; the object
 * behind it is a UUID that changes every time the PDF is replaced. Without the
 * hop, every newsletter that ever carried the link would point at last
 * quarter's file forever.
 *
 * A PAGE RATHER THAN A ROUTE HANDLER, for one reason: a dead link is something
 * a real person clicks, from an email sent a year ago. `notFound()` here
 * renders the site's own 404, with its navigation and a way onward. In a route
 * handler the same call produces an empty 404 body.
 *
 * `force-dynamic` is not defensive. This route returns a redirect whose target
 * changes, so a Full Route Cache entry for it would be a link that keeps
 * resolving to the file it pointed at when the cache was filled — the exact
 * failure the indirection exists to prevent. The lookup underneath is still
 * cached and tagged, so this costs a query only when a document changes.
 */
export const dynamic = "force-dynamic";

export default async function DocumentLink({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const document = await getDocument(slug);

  if (!document) notFound();

  const query = await searchParams;

  /**
   * `?download` forces a save-as with the original filename rather than opening
   * in the browser's PDF viewer. Supabase's own parameter does the work, so the
   * bytes still come from storage and never through this function — which is
   * what keeps a 20 MB brochure off the serverless bill.
   */
  const target =
    "download" in query
      ? `${document.url}?download=${encodeURIComponent(document.filename)}`
      : document.url;

  redirect(target);
}
