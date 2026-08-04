import type {
  AnyPage,
  AuctionItem,
  PageMap,
  PageSlug,
  SeoMeta,
} from "@/content/types";
import { auctionItems } from "@/content/collections/auction-items";
import { homePage } from "@/content/pages/home";
import { auctionInfoPage } from "@/content/pages/auction-info";
import { auctionItemsPage } from "@/content/pages/auction-items";
import { auctionPlannerPage } from "@/content/pages/auction-planner";
import { auctioneersPage } from "@/content/pages/auctioneers";
import { faqsPage } from "@/content/pages/faqs";
import { testimonialsPage } from "@/content/pages/testimonials";
import { contactPage } from "@/content/pages/contact";

/**
 * The content access layer.
 *
 * This is the single seam between the site and where its content lives. Today
 * every page reads from a module in `src/content/pages/`. In Phase 2 the bodies
 * of these functions become database queries and nothing above them changes —
 * routes call `getPage(...)`, never the page modules directly.
 *
 * Keep these functions async-ready in shape (callers already `await` nothing
 * synchronous beyond the lookup) so swapping in a query is a one-file change.
 */

const registry: PageMap = {
  home: homePage,
  "auction-info": auctionInfoPage,
  "auction-items": auctionItemsPage,
  "auction-planner": auctionPlannerPage,
  auctioneers: auctioneersPage,
  faqs: faqsPage,
  testimonials: testimonialsPage,
  contact: contactPage,
};

/** Fetch a page by slug. Return type narrows to the concrete page shape. */
export function getPage<S extends PageSlug>(slug: S): PageMap[S] {
  return registry[slug];
}

/** Every page, used by the sitemap. */
export function getAllPages(): AnyPage[] {
  return Object.values(registry) as AnyPage[];
}

/** Convenience accessor for a page's SEO block. */
export function getPageSeo(slug: PageSlug): SeoMeta {
  return registry[slug].seo;
}

/* ------------------------------------------------------------------ */
/* Auction categories                                                  */
/* ------------------------------------------------------------------ */
/**
 * Categories are driven by the collection rather than the page registry,
 * because they are a variable-length list the client will edit in Phase 2 —
 * the same reason they become their own table rather than fixed page records.
 */

/** Every auction category, used by the grid, the routes and the sitemap. */
export function getAuctionCategories(): AuctionItem[] {
  return auctionItems;
}

/** One category by URL slug, or undefined so the route can render notFound(). */
export function getAuctionCategory(slug: string): AuctionItem | undefined {
  return auctionItems.find((category) => category.slug === slug);
}
