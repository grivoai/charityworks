import "server-only";

import type {
  AnyPage,
  AuctionItem,
  PageMap,
  PageSlug,
  SeoMeta,
  SiteContent,
} from "@/content/types";
import { getContentSource } from "@/lib/content-source";

/**
 * The content access layer.
 *
 * This is the single seam between the site and where its content lives. Routes
 * call these functions; they never import a content module directly.
 *
 * Every accessor is async, because behind them is a database. They were
 * synchronous in Phase 1 and the doc comment here promised that "the bodies of
 * these functions become database queries and nothing above them changes" —
 * which turned out to be very nearly true. The one thing that did change is the
 * `await` at each call site.
 *
 * Which store answers is decided in `content-source.ts`, not here. This module
 * is only the shape of the question.
 *
 * `server-only` is not decoration: the source can hold a Supabase service-role
 * key, and a client component importing this file would bundle it. The import
 * turns that into a build error rather than a leak.
 */

/* ------------------------------------------------------------------ */
/* Site globals                                                        */
/* ------------------------------------------------------------------ */

/**
 * Brand, navigation, contact details, footer and the booking link.
 *
 * Client components cannot call this — it is server-only. Read it in the
 * server component that renders them and pass down what they need, which is
 * what `Nav` and `ContactForm` do.
 */
export async function getSite(): Promise<SiteContent> {
  return (await getContentSource()).getSite();
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/** Fetch a page by slug. The return type narrows to the concrete page shape. */
export async function getPage<S extends PageSlug>(slug: S): Promise<PageMap[S]> {
  return (await getContentSource()).getPage(slug);
}

/** Every page, used by the sitemap. */
export async function getAllPages(): Promise<AnyPage[]> {
  return (await getContentSource()).getAllPages();
}

/** Convenience accessor for a page's SEO block. */
export async function getPageSeo(slug: PageSlug): Promise<SeoMeta> {
  return (await getPage(slug)).seo;
}

/* ------------------------------------------------------------------ */
/* Auction categories                                                  */
/* ------------------------------------------------------------------ */
/**
 * Categories are their own collection rather than part of the page registry,
 * because they are a variable-length list the client edits — the same reason
 * they are their own tables rather than a field on a page record.
 */

/** Every published auction category, used by the grid, the routes and the sitemap. */
export async function getAuctionCategories(): Promise<AuctionItem[]> {
  return (await getContentSource()).getAuctionCategories();
}

/** One category by URL slug, or undefined so the route can render notFound(). */
export async function getAuctionCategory(
  slug: string
): Promise<AuctionItem | undefined> {
  const categories = await getAuctionCategories();
  return categories.find((category) => category.slug === slug);
}
