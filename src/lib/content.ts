import "server-only";

import { unstable_cache } from "next/cache";

import type {
  AnyPage,
  AuctionItem,
  PageMap,
  PageSlug,
  SeoMeta,
  SiteContent,
} from "@/content/types";
import { getContentSource } from "@/lib/content-source";
import { BUILD_KEY } from "@/lib/build-key";
import { CATALOG_TAG, PAGES_TAG, SITE_TAG, pageTag } from "@/lib/content-tags";
import {
  resolveHiddenPage,
  type HiddenPageMap,
  type HiddenPageSlug,
} from "@/content/hidden-pages";

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
 *
 * ---
 *
 * Every read is wrapped in a tagged cache entry. That is not for speed — these
 * run at build and revalidation time, not per request — but so that a write can
 * say "the contact record changed" and have every route that read it regenerate,
 * without anyone maintaining a list of which routes those are. See
 * `content-tags.ts` for why that list was the wrong thing to maintain.
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
const readSite = unstable_cache(
  async () => (await getContentSource()).getSite(),
  ["site", BUILD_KEY],
  { tags: [SITE_TAG] }
);

export async function getSite(): Promise<SiteContent> {
  return readSite();
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

/**
 * One cached reader per page, built on first use.
 *
 * `unstable_cache` takes its tags when the wrapper is created, not when it is
 * called, so a single wrapper shared by all eight pages could only carry one
 * tag between them — and invalidating `page:faqs` would regenerate the other
 * seven along with it. One wrapper per slug is what makes the tag mean the page
 * it names.
 */
const pageReaders = new Map<string, () => Promise<unknown>>();

function readerFor(slug: PageSlug): () => Promise<unknown> {
  let reader = pageReaders.get(slug);
  if (!reader) {
    reader = unstable_cache(
      async () => (await getContentSource()).getPage(slug),
      ["page", slug, BUILD_KEY],
      { tags: [pageTag(slug)] }
    );
    pageReaders.set(slug, reader);
  }
  return reader;
}

/** Fetch a page by slug. The return type narrows to the concrete page shape. */
export async function getPage<S extends PageSlug>(slug: S): Promise<PageMap[S]> {
  return (await readerFor(slug)()) as PageMap[S];
}

const readAllPages = unstable_cache(
  async () => (await getContentSource()).getAllPages(),
  ["pages", BUILD_KEY],
  { tags: [PAGES_TAG] }
);

/** Every page, used by the sitemap. */
export async function getAllPages(): Promise<AnyPage[]> {
  return readAllPages();
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

const readCategories = unstable_cache(
  async () => (await getContentSource()).getAuctionCategories(),
  ["catalog", BUILD_KEY],
  { tags: [CATALOG_TAG] }
);

/** Every published auction category, used by the grid, the routes and the sitemap. */
export async function getAuctionCategories(): Promise<AuctionItem[]> {
  return readCategories();
}

/** One category by URL slug, or undefined so the route can render notFound(). */
export async function getAuctionCategory(
  slug: string
): Promise<AuctionItem | undefined> {
  const categories = await getAuctionCategories();
  return categories.find((category) => category.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Hidden pages                                                        */
/* ------------------------------------------------------------------ */

/**
 * /guitar-prices, /travel_voucher and /terms-and-conditions-voucher.
 *
 * Cached and tagged exactly like a built-in page, under `page:<slug>`, so the
 * admin's save publishes one the same way: `updateTag` + `revalidatePath`, and
 * the live page updates with no redeploy.
 *
 * Unlike a built-in page, a missing or invalid row is not an error here: the
 * page renders today's wording from the code instead (see hidden-pages.ts),
 * so it can never go blank. A row that fails validation is logged, which is
 * how it gets noticed.
 */
const hiddenReaders = new Map<HiddenPageSlug, () => Promise<unknown>>();

export async function getHiddenPage<S extends HiddenPageSlug>(
  slug: S
): Promise<HiddenPageMap[S]> {
  let reader = hiddenReaders.get(slug);
  if (!reader) {
    reader = unstable_cache(
      async () => {
        const stored = await (await getContentSource()).getHiddenPageDocument(slug);
        const { page, problem } = resolveHiddenPage(slug, stored);
        if (problem) {
          console.error(
            `[content] the stored "${slug}" page does not match its schema, so ` +
              `the wording in the code is shown instead: ${problem}`
          );
        }
        return page;
      },
      ["hidden-page", slug, BUILD_KEY],
      { tags: [pageTag(slug)] }
    );
    hiddenReaders.set(slug, reader);
  }
  return (await reader()) as HiddenPageMap[S];
}
