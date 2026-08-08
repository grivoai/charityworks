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
 * the eight page records, and every catalog row present in the modules. It is a
 * migration tool, not a backup restore.
 *
 * WHICH IS WHY IT NOW REFUSES TO RUN over content that has been edited. The
 * name says setup and the behaviour is restore, and the only thing that ever
 * stood between the two was remembering the difference — so it checks first:
 * every row it is about to write must either not exist yet or already hold
 * exactly what it would write. Anything else means somebody has been using the
 * admin, and their work is not this script's to discard.
 *
 *     npm run seed                 refuses if the content has been edited
 *     npm run seed -- --force      writes anyway, having said what it will lose
 *
 * The default is refusal on anything it cannot prove is safe, including a
 * database it cannot read — being unable to verify is not the same as being
 * sure, and only one of the two is worth acting on.
 */
import { createClient } from "@supabase/supabase-js";

import { stableStringify } from "../src/lib/admin/coerce";

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
/* The guard                                                           */
/* ------------------------------------------------------------------ */

const FORCE = process.argv.slice(2).includes("--force");

/**
 * What the database currently holds, relative to what the seed would write.
 *
 *   missing  the row is not there yet          — nothing to lose
 *   same     the row already holds this value  — the write changes nothing
 *   edited   the row holds something else      — somebody's work
 *   extra    a row the modules do not know of  — somebody added it
 *
 * `extra` counts as a difference even though an upsert would leave it alone.
 * It cannot be overwritten, but it is still proof that the admin has been used,
 * and this is deciding whether that is true — not merely which rows would be
 * touched.
 */
interface Survey {
  missing: number;
  same: number;
  edited: string[];
  extra: string[];
  unreadable?: string;
}

const blank = (): Survey => ({ missing: 0, same: 0, edited: [], extra: [] });

/** Compares one table's stored rows against the rows the seed would write. */
async function surveyTable(
  table: string,
  key: string,
  wanted: Record<string, unknown>[],
  columns: string[]
): Promise<Survey> {
  const out = blank();

  const { data, error } = await db
    .from(table)
    .select([key, ...columns].join(","))
    .returns<Record<string, unknown>[]>();
  if (error) {
    out.unreadable = `${table}: ${error.message}`;
    return out;
  }

  const stored = new Map(
    (data ?? []).map((row) => [String(row[key]), row])
  );

  for (const row of wanted) {
    const id = String(row[key]);
    const found = stored.get(id);
    if (!found) {
      out.missing += 1;
      continue;
    }
    stored.delete(id);

    const differs = columns.some(
      (column) => stableStringify(found[column] ?? null) !== stableStringify(row[column] ?? null)
    );
    if (differs) out.edited.push(`${table}.${id}`);
    else out.same += 1;
  }

  for (const id of stored.keys()) out.extra.push(`${table}.${id}`);

  return out;
}

function merge(surveys: Survey[]): Survey {
  return surveys.reduce((all, one) => ({
    missing: all.missing + one.missing,
    same: all.same + one.same,
    edited: [...all.edited, ...one.edited],
    extra: [...all.extra, ...one.extra],
    unreadable: all.unreadable ?? one.unreadable,
  }), blank());
}

/**
 * Refuses to go on unless every row is either absent or already identical.
 *
 * Deliberately checked BEFORE the first write rather than per table: the site
 * record is written first and the catalog last, so a per-table check would
 * happily replace the site settings and only then discover the catalog had been
 * edited — a half-restored database being the one outcome worse than either
 * running or not running.
 */
async function guard(): Promise<void> {
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
  const { categoryRows, groupRows, itemRows } = flatten(auctionItems);

  const survey = merge(
    await Promise.all([
      surveyTable("site_settings", "id", [{ id: 1, data: site }], ["data"]),
      surveyTable(
        "pages",
        "slug",
        pages.map((page) => ({ slug: page.slug, data: page })),
        ["data"]
      ),
      surveyTable("catalog_categories", "id", categoryRows, [
        "slug", "icon", "title", "blurb", "heading", "intro",
        "image_src", "image_alt", "span", "general_only", "seo", "position", "published",
      ]),
      surveyTable("catalog_groups", "id", groupRows, [
        "category_id", "title", "blurb", "position",
      ]),
      surveyTable("catalog_items", "id", itemRows, [
        "group_id", "name", "description", "image_src", "image_alt",
        "note", "details", "position", "published",
      ]),
    ])
  );

  if (survey.unreadable) {
    console.error(
      `\n  Refusing to seed: the database could not be read.\n` +
        `  ${survey.unreadable}\n\n` +
        `  Not being able to check is not the same as having checked. If the\n` +
        `  tables do not exist yet, apply supabase/migrations/0001_init.sql first.\n` +
        `  To write regardless: npm run seed -- --force\n`
    );
    if (!FORCE) process.exit(1);
  }

  const changed = survey.edited.length + survey.extra.length;

  if (changed === 0) {
    const state = survey.same === 0 ? "empty" : "unedited";
    console.log(
      `  checked         ${state} — ${survey.missing} row(s) to create, ` +
        `${survey.same} already identical\n`
    );
    return;
  }

  const show = (label: string, ids: string[]) =>
    ids.length === 0
      ? ""
      : `  ${label}\n` +
        ids.slice(0, 8).map((id) => `      ${id}`).join("\n") +
        (ids.length > 8 ? `\n      ...and ${ids.length - 8} more` : "") +
        "\n";

  console.error(
    `\n  REFUSING TO SEED — this database has been edited.\n\n` +
      show(`${survey.edited.length} record(s) hold something other than the seed:`, survey.edited) +
      show(`${survey.extra.length} record(s) exist that the modules do not have:`, survey.extra) +
      `\n  Seeding would replace the first group with the Phase 1 content and\n` +
      `  leave the second orphaned. If that is genuinely what you want — a\n` +
      `  deliberate reset rather than a setup step — run:\n\n` +
      `      npm run seed -- --force\n\n` +
      `  There is no draft state and no backup: whatever those records say now\n` +
      `  is what the live site says, and it is what would be lost.\n`
  );

  if (!FORCE) process.exit(1);

  console.log(
    `\n  --force given: overwriting ${survey.edited.length} edited record(s).\n`
  );
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

  await guard();

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
