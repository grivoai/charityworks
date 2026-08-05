import "server-only";

import type {
  AnyPage,
  AuctionItem,
  PageMap,
  PageSlug,
  SiteContent,
} from "@/content/types";
import { seedContentSource } from "@/lib/content-source-seed";

/**
 * Decides which store answers a content question.
 *
 * Two sources exist. The seed source reads the TypeScript modules that Phase 1
 * shipped. The Supabase source reads the database the admin panel writes to.
 *
 * The rule for choosing between them is deliberately asymmetric:
 *
 *   - Environment variables ABSENT -> seed source, with a warning logged once.
 *     This is what lets the site build and run before the database exists, and
 *     it doubles as disaster recovery.
 *
 *   - Environment variables PRESENT but a query FAILS -> throw. No fallback.
 *     Falling back here would serve the Phase 1 seed content over whatever the
 *     client has since edited, on a site that looked like it deployed fine.
 *     A failed build is loud and recoverable; silently reverting someone's
 *     copy is neither.
 *
 * The pages are statically generated, so this runs at build and revalidation
 * time rather than per request — which is also why a paused free-tier database
 * costs a visitor nothing.
 */

export interface ContentSource {
  getSite(): Promise<SiteContent>;
  getPage<S extends PageSlug>(slug: S): Promise<PageMap[S]>;
  getAllPages(): Promise<AnyPage[]>;
  getAuctionCategories(): Promise<AuctionItem[]>;
}

/** True when Supabase is configured well enough to be the source of truth. */
export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

let warned = false;

export async function getContentSource(): Promise<ContentSource> {
  if (isDatabaseConfigured()) {
    // Imported lazily so the Supabase client is never pulled into a build that
    // is not using it.
    const { supabaseContentSource } = await import(
      "@/lib/content-source-supabase"
    );
    return supabaseContentSource;
  }

  if (!warned) {
    warned = true;
    console.warn(
      "[content] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — " +
        "reading content from the seed modules in src/content. Edits made in " +
        "the admin panel will not appear."
    );
  }

  return seedContentSource;
}
