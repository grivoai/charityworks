/**
 * One-off content migration: three travel categories become one.
 *
 *     npm run migrate:merge-travel
 *
 * Affordable Vacations (14 lots), Bucket List Trips (11) and Meet & Greets (2)
 * were three categories and three pages. They are now three GROUPS of
 * `item-vacations`, which keeps its slug and becomes "Travel & Experiences".
 *
 * WHAT MOVES AND WHAT DOES NOT. The two groups are re-parented — one UPDATE of
 * `catalog_groups.category_id` each — and no lot row is touched at all. That is
 * the whole point of doing it this way: `catalog_items.id` is what
 * `?interest=<id>` carries and what lead attribution resolves through, so all
 * 27 ids survive and every request link ever sent still resolves to the same
 * lot. Deleting the emptied categories would have cascaded to their groups and
 * taken those lots' rows with them; they are unpublished instead, exactly as a
 * removed lot is.
 *
 * WHAT BREAKS, AND IT IS DELIBERATE. `?interest=item-bucket-list` and
 * `?interest=item-meet-greets` — the CATEGORY-level request links, not the lot
 * ones — stop resolving, because the interest registry is built from published
 * categories. A lead arriving on one of those is recorded as a general enquiry
 * rather than being mislabelled. The page redirects are in next.config.ts.
 *
 * THE STARS. Every lot in the Affordable Vacations group is flagged
 * `affordable_tier`. That is not a new judgement about prices — it is the
 * client's own three-way split surviving the merge as a mark a bidder can see.
 * Requires migration 0008.
 *
 * Idempotent, snapshots each category into `content_revisions` first, and
 * validates the assembled result through `auctionItemSchema` before it commits
 * to having worked. Run it alongside the deploy; the public pages are static.
 */
import { createClient } from "@supabase/supabase-js";

import { auctionItemSchema } from "../src/content/schema";
import type { AuctionItem } from "../src/content/types";
import { auctionItems } from "../src/content/collections/auction-items";
import { vacationItems } from "../src/content/collections/catalog-trips";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "Put them in .env.local, then run: npm run migrate:merge-travel"
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TARGET = "item-vacations";
const ABSORBED = ["item-bucket-list", "item-meet-greets"] as const;

/**
 * The merged category as the seed module now describes it.
 *
 * A function rather than a `find` followed by an early exit: TypeScript does
 * not carry a module-scope narrowing into the body of `main()`, so the exit
 * would leave every use below reading as possibly-undefined. Throwing from a
 * function that returns `AuctionItem` says the same thing to both.
 */
function mergedCategory(): AuctionItem {
  const found = auctionItems.find((category) => category.id === TARGET);
  if (!found) {
    throw new Error("The seed module no longer has an item-vacations category.");
  }
  return found;
}

const merged = mergedCategory();

/** group id -> the title and blurb it should carry on the merged page. */
const GROUP_COPY = new Map(
  merged.groups.map((group) => [
    group.id,
    { title: group.title ?? null, blurb: group.blurb ?? null },
  ])
);

function die(what: string, message: string): never {
  console.error(`  ${what}: ${message}`);
  process.exit(1);
}

/**
 * Files the category's pre-merge state in the history.
 *
 * The ASSEMBLED category, not the `catalog_categories` row. The admin's own
 * saves record the assembled document (see `recordRevision` in
 * catalog-actions.ts) and its restore path feeds a revision back through
 * `planCategoryWrite`, which expects that shape. A raw row here would sit in
 * the history looking restorable and fail the moment anyone tried.
 *
 * `created_by` is null: nobody signed in did this, and attributing a migration
 * to whoever last logged in would be a lie in the one place the client goes to
 * find out who changed something.
 */
async function snapshot(entityId: string, data: unknown, note: string) {
  const { error } = await db
    .from("content_revisions")
    .insert({ entity: "category", entity_id: entityId, data, note });
  if (error) die("history", `could not record ${entityId}: ${error.message}`);
}

async function main() {
  console.log("\nMerging the travel categories\n");

  // Read the assembled catalog once, up front, while all three categories are
  // still published — after the merge two of them are invisible to this read,
  // which is exactly when their pre-merge state stops being recoverable.
  const { supabaseContentSource } = await import("../src/lib/content-source-supabase");
  const before = await supabaseContentSource.getAuctionCategories();

  /* ---- Already done? ---------------------------------------------------- */
  const { data: groups, error: groupError } = await db
    .from("catalog_groups")
    .select("id, category_id, title, position")
    .in("category_id", [TARGET, ...ABSORBED]);
  if (groupError || !groups) die("read", `could not read the groups: ${groupError?.message}`);

  const stray = groups.filter((group) => group.category_id !== TARGET);
  if (stray.length === 0) {
    console.log("  skip  the groups are already under item-vacations");
  } else {
    for (const id of [TARGET, ...ABSORBED]) {
      const category = before.find((entry) => entry.id === id);
      if (!category) die("history", `${id} is not in the published catalog`);
      await snapshot(id, category, "Before the travel merge");
    }

    for (const group of stray) {
      const { error } = await db
        .from("catalog_groups")
        .update({ category_id: TARGET })
        .eq("id", group.id);
      if (error) die("move", `could not re-parent ${group.id}: ${error.message}`);
      console.log(`  done  group ${group.id} -> ${TARGET}`);
    }
  }

  /* ---- Group titles, blurbs and order ----------------------------------- */
  // Order follows the seed module: Affordable Vacations, Bucket List, Meet &
  // Greets. Position is set from that list rather than from what is stored, so
  // re-running cannot leave two groups sharing a position.
  for (const [index, group] of merged.groups.entries()) {
    const copy = GROUP_COPY.get(group.id)!;
    const { error } = await db
      .from("catalog_groups")
      .update({ title: copy.title, blurb: copy.blurb, position: index })
      .eq("id", group.id);
    if (error) die("copy", `could not title ${group.id}: ${error.message}`);
  }
  console.log(`  done  ${merged.groups.length} groups titled and ordered`);

  /* ---- The category's own copy ------------------------------------------ */
  const { error: categoryError } = await db
    .from("catalog_categories")
    .update({
      title: merged.title,
      blurb: merged.blurb,
      heading: merged.heading,
      intro: merged.intro,
      seo: merged.seo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", TARGET);
  if (categoryError) die("copy", `could not reword the category: ${categoryError.message}`);
  console.log(`  done  item-vacations is now "${merged.title}"`);

  /* ---- Retire the emptied categories ------------------------------------ */
  const { error: retireError } = await db
    .from("catalog_categories")
    .update({ published: false, updated_at: new Date().toISOString() })
    .in("id", [...ABSORBED]);
  if (retireError) die("retire", `could not unpublish: ${retireError.message}`);
  console.log(`  done  ${ABSORBED.join(", ")} unpublished (rows kept)`);

  /* ---- Stars ------------------------------------------------------------- */
  const affordable = vacationItems.map((item) => item.id);
  const { error: starError } = await db
    .from("catalog_items")
    .update({ affordable_tier: true })
    .in("id", affordable);
  if (starError) {
    die(
      "stars",
      `could not flag the affordable lots: ${starError.message}\n` +
        "  (has supabase/migrations/0008_affordable_tier.sql been applied?)"
    );
  }
  console.log(`  done  ${affordable.length} lots flagged affordable_tier`);

  /* ---- Prove the result is renderable ------------------------------------ */
  const categories = await supabaseContentSource.getAuctionCategories();
  const rebuilt = categories.find((category) => category.id === TARGET);
  if (!rebuilt) die("verify", "item-vacations is not in the published catalog");

  const parsed = auctionItemSchema.safeParse(rebuilt);
  if (!parsed.success) {
    die("verify", `the merged category does not satisfy its schema:\n${parsed.error.message}`);
  }

  const lots = rebuilt.groups.reduce((n, group) => n + group.items.length, 0);
  const starred = rebuilt.groups.reduce(
    (n, group) => n + group.items.filter((item) => item.affordableTier).length,
    0
  );
  console.log(
    `\n  ${categories.length} published categories; ` +
      `${rebuilt.title} holds ${rebuilt.groups.length} groups, ${lots} lots, ${starred} starred`
  );
  console.log("  Deploy the site to put this on the page — the public pages are static.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
