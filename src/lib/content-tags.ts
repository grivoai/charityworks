/**
 * The names a cached content read is filed under, so a write can invalidate
 * exactly the pages that show it.
 *
 * The problem this replaces: revalidating by *path* means the writer has to
 * know every route a record renders on. That list was hand-maintained
 * (`ALSO_RENDERS`), and it was already wrong once — the home page builds its
 * enquiry form from the CONTACT record, so editing contact and revalidating
 * only `/contact` left the identical form on the home page stale. The catalog
 * is worse: a category's blurb renders on the home page, the catalog index and
 * its own route, and the list grows every time a page reuses something.
 *
 * A tag inverts it. The *reader* declares what it read; Next records those tags
 * against whatever route was rendering; the writer names the record it changed
 * and every route that read it is invalidated, including ones nobody
 * remembered. Nothing has to be kept in step by hand.
 *
 * Deliberately free of imports so both halves can use it: the read side in
 * `content.ts`, the write side in the admin's server actions.
 */

/** Brand, navigation, contact details, footer, booking link. */
export const SITE_TAG = "site";

/**
 * The set of pages, as opposed to any one page.
 *
 * Only the sitemap reads this — it needs every page's SEO block — so a page
 * edit invalidates both this and the page's own tag. Kept separate so one
 * page's wording does not invalidate the other seven.
 */
export const PAGES_TAG = "pages";

/**
 * The whole catalog.
 *
 * Not `category:<slug>`, despite the temptation. Categories, groups and lots
 * are read in one pass and assembled into a tree, so there is no per-category
 * cache entry for a per-category tag to invalidate. A tag that cannot be acted
 * on precisely is worse than none: it reads as a guarantee nobody is keeping.
 */
export const CATALOG_TAG = "catalog";

/**
 * Every shareable document link.
 *
 * One tag for all of them rather than `document:<slug>`, and for a reason the
 * per-page case does not have: the slug comes from the URL a stranger typed. A
 * per-slug tag means a per-slug cache wrapper, and building one of those per
 * distinct slug requested is unbounded growth driven by whoever is scanning the
 * site. There will be a handful of documents, so invalidating all of their
 * lookups when one changes costs a query nobody notices.
 */
export const DOCUMENTS_TAG = "documents";

/** One page record, e.g. `page:faqs`. */
export function pageTag(slug: string): string {
  return `page:${slug}`;
}

/** Everything a page edit makes stale. */
export function tagsForPage(slug: string): string[] {
  return [pageTag(slug), PAGES_TAG];
}
