/**
 * Seeds a fresh Supabase project from the Phase 1 content modules.
 *
 *     npm run seed
 *
 * Run once, after applying supabase/migrations/0001_init.sql. Idempotent: every
 * write is an upsert keyed on the record's stable id, so re-running it restores
 * the seed content without duplicating anything.
 *
 * Everything is validated through its Zod schema before it is written. The
 * modules are typechecked, so this should never fail — and if it ever does, the
 * database is better off rejecting the batch than storing a row the site cannot
 * render.
 *
 * WHAT THIS OVERWRITES: re-running restores seed values for the site record,
 * the eight page records, and every catalog row present in the modules. If the
 * client has edited those in the admin, their edits are replaced. It is a
 * migration tool, not a backup restore.
 */
import { createClient } from "@supabase/supabase-js";

import {
  auctionItemSchema,
  pageSchemas,
  siteContentSchema,
} from "../src/content/schema";
import type { AuctionItem, PageSlug } from "../src/content/types";

import { site } from "../src/content/site";
import { auctionItems } from "../src/content/collections/auction-items";
import { homePage } from "../src/content/pages/home";
import { auctionInfoPage } from "../src/content/pages/auction-info";
import { auctionItemsPage } from "../src/content/pages/auction-items";
import { auctionPlannerPage } from "../src/content/pages/auction-planner";
import { auctioneersPage } from "../src/content/pages/auctioneers";
import { faqsPage } from "../src/content/pages/faqs";
import { testimonialsPage } from "../src/content/pages/testimonials";
import { contactPage } from "../src/content/pages/contact";

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "Put them in .env.local, then run: npm run seed"
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function check<T>(label: string, schema: { safeParse(v: unknown): { success: boolean; data?: unknown; error?: { issues: { path: PropertyKey[]; message: string }[] } } }, value: T): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    console.error(`\n  ${label} failed validation:`);
    for (const issue of result.error!.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  return value;
}

async function must(label: string, promise: PromiseLike<{ error: unknown }>) {
  const { error } = await promise;
  if (error) {
    console.error(`\n  ${label} failed:`, error);
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/* Site + pages                                                        */
/* ------------------------------------------------------------------ */

async function seedSite() {
  check("site", siteContentSchema, site);
  await must(
    "site_settings",
    db.from("site_settings").upsert({ id: 1, data: site })
  );
  console.log("  site_settings   1 row");
}

async function seedPages() {
  const pages = [
    homePage,
    auctionInfoPage,
    auctionItemsPage,
    auctionPlannerPage,
    auctioneersPage,
    faqsPage,
    testimonialsPage,
    contactPage,
  ];

  const rows = pages.map((page) => {
    check(`page:${page.slug}`, pageSchemas[page.slug as PageSlug], page);
    return { slug: page.slug, data: page };
  });

  await must("pages", db.from("pages").upsert(rows));
  console.log(`  pages           ${rows.length} rows`);
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

/**
 * Flattens the nested category tree into its three tables.
 *
 * `position` is assigned from array order, which is the order Phase 1 renders
 * in — so a seeded database renders identically to the modules. After this, the
 * admin owns ordering and array order means nothing.
 */
function flatten(categories: AuctionItem[]) {
  const categoryRows: Record<string, unknown>[] = [];
  const groupRows: Record<string, unknown>[] = [];
  const itemRows: Record<string, unknown>[] = [];

  categories.forEach((category, categoryIndex) => {
    check(`category:${category.id}`, auctionItemSchema, category);

    categoryRows.push({
      id: category.id,
      slug: category.slug,
      icon: category.icon,
      title: category.title,
      blurb: category.blurb,
      heading: category.heading,
      intro: category.intro,
      image_src: category.image.src,
      image_alt: category.image.alt,
      image_width: category.image.width ?? null,
      image_height: category.image.height ?? null,
      span: category.span ?? null,
      general_only: category.generalOnly ?? false,
      seo: category.seo,
      position: categoryIndex,
      published: true,
    });

    category.groups.forEach((group, groupIndex) => {
      groupRows.push({
        id: group.id,
        category_id: category.id,
        title: group.title ?? null,
        blurb: group.blurb ?? null,
        position: groupIndex,
      });

      group.items.forEach((item, itemIndex) => {
        itemRows.push({
          id: item.id,
          group_id: group.id,
          name: item.name,
          description: item.description,
          image_src: item.image?.src ?? null,
          image_alt: item.image?.alt ?? null,
          image_width: item.image?.width ?? null,
          image_height: item.image?.height ?? null,
          note: item.note ?? null,
          details: item.details ?? [],
          position: itemIndex,
          published: true,
        });
      });
    });
  });

  return { categoryRows, groupRows, itemRows };
}

async function seedCatalog() {
  const { categoryRows, groupRows, itemRows } = flatten(auctionItems);

  // Order matters: groups reference categories, items reference groups.
  await must("catalog_categories", db.from("catalog_categories").upsert(categoryRows));
  await must("catalog_groups", db.from("catalog_groups").upsert(groupRows));
  await must("catalog_items", db.from("catalog_items").upsert(itemRows));

  console.log(`  catalog         ${categoryRows.length} categories, ` +
    `${groupRows.length} groups, ${itemRows.length} lots`);
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nSeeding ${url!.replace(/^https?:\/\//, "")}\n`);

  await seedSite();
  await seedPages();
  await seedCatalog();

  console.log(
    "\n  Done. With NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY both\n" +
      "  set, the app reads from the database instead of the seed modules.\n" +
      "  Verify with: npm run build — it should log no fallback warning.\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
