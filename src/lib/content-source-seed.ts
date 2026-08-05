import "server-only";

import type {
  AnyPage,
  AuctionItem,
  PageMap,
  PageSlug,
  SiteContent,
} from "@/content/types";
import type { ContentSource } from "@/lib/content-source";

import { site } from "@/content/site";
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
 * Content read from the TypeScript modules Phase 1 shipped.
 *
 * This is what answers before the database exists, and what answers if the
 * Supabase environment variables are ever removed. It is also exactly what
 * `scripts/seed.ts` inserts, so a freshly seeded database and this source
 * return the same content — which is what makes the migration verifiable by
 * diffing rendered HTML rather than by inspection.
 *
 * No validation happens here. These modules are typechecked at build and
 * covered by `npm run check:content`, so a bad value cannot reach this point;
 * the Supabase source validates because its rows genuinely are `unknown`.
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

export const seedContentSource: ContentSource = {
  async getSite(): Promise<SiteContent> {
    return site;
  },

  async getPage<S extends PageSlug>(slug: S): Promise<PageMap[S]> {
    return registry[slug];
  },

  async getAllPages(): Promise<AnyPage[]> {
    return Object.values(registry) as AnyPage[];
  },

  async getAuctionCategories(): Promise<AuctionItem[]> {
    return auctionItems;
  },
};
