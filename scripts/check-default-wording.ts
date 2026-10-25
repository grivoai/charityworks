/**
 * Keeps the wording that moved out of the page code saying what it said.
 *
 * Four pieces of text were written into the pages until the client needed to
 * change them: the gold-star key and the availability note on the category
 * pages (now Site details), the closing band on Auction Info, and the planner
 * box on Auction Items. Each is a field now, with the old wording as its
 * default. What this proves:
 *
 *   - the defaults are, word for word, what the pages said before
 *   - a record saved before the fields existed parses with them filled in, so
 *     the live site reads the same until someone edits a field — checked on
 *     the real rows as well when the database is configured
 *   - a field cleared in the admin goes back to the default rather than
 *     leaving a gap, and a field that was edited keeps the edit
 *   - the pages read the fields and no longer carry the old sentences
 *   - a click on a category note in the preview has somewhere to go
 *
 *   npm run check:default-wording
 * (the react-server condition lets the database client's `server-only` load.)
 */
import { readFileSync } from "node:fs";

import {
  DEFAULT_AFFORDABLE_NOTE,
  DEFAULT_AUCTION_INFO_CLOSING,
  DEFAULT_AVAILABILITY_NOTE,
  DEFAULT_PLANNER_PROMO,
} from "@/content/default-wording";
import { pageSchemas, siteContentSchema } from "@/content/schema";
import { site } from "@/content/site";
import { auctionInfoPage } from "@/content/pages/auction-info";
import { auctionItemsPage } from "@/content/pages/auction-items";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForPage, locksForSite } from "@/lib/admin/locks";
import { coerceToTree } from "@/lib/admin/coerce";
import { isDatabaseConfigured } from "@/lib/content-source";
import { readSiteDocument } from "@/lib/admin/site-read";
import { getServiceClient } from "@/lib/supabase";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const without = (doc: object, key: string) => {
  const copy = clone(doc) as Record<string, unknown>;
  delete copy[key];
  return copy;
};

/** The sentences as the page code had them, typed out rather than imported. */
const BEFORE = {
  affordableLots:
    "marks our more affordable lots — ask us for the opening bid on any of them.",
  availability:
    "Inventory changes constantly — contact us to confirm current availability for your event date.",
  closing: {
    heading: "Ready to Supercharge Your Next Fundraiser?",
    lede: "Tell us about your event and we'll build a risk-free plan to help you raise more than ever.",
  },
  planner: {
    lead: "Not sure where to start?",
    text: "Answer five questions and we’ll point you at the categories that suit your event.",
    link: "Find what’s best for your auction",
  },
};

console.log("\nThe defaults are the old wording");
check(DEFAULT_AFFORDABLE_NOTE === BEFORE.affordableLots, "the gold-star key");
check(DEFAULT_AVAILABILITY_NOTE === BEFORE.availability, "the availability note");
check(
  JSON.stringify(DEFAULT_AUCTION_INFO_CLOSING) === JSON.stringify(BEFORE.closing),
  "the Auction Info closing band"
);
check(
  JSON.stringify(DEFAULT_PLANNER_PROMO) === JSON.stringify(BEFORE.planner),
  "the Auction Items planner box"
);

console.log("\nA record from before the fields existed");
{
  const parsed = siteContentSchema.parse(without(site, "catalogNotes"));
  check(
    parsed.catalogNotes.affordableLots === BEFORE.affordableLots &&
      parsed.catalogNotes.availability === BEFORE.availability,
    "Site details with no catalogNotes reads the old notes"
  );
  const info = pageSchemas["auction-info"].parse(without(auctionInfoPage, "closing"));
  check(
    JSON.stringify(info.closing) === JSON.stringify(BEFORE.closing),
    "Auction Info with no closing reads the old band"
  );
  const items = pageSchemas["auction-items"].parse(without(auctionItemsPage, "planner"));
  check(
    JSON.stringify(items.planner) === JSON.stringify(BEFORE.planner),
    "Auction Items with no planner reads the old box"
  );
  const partial = siteContentSchema.parse({
    ...site,
    catalogNotes: { availability: "Call us." },
  });
  check(
    partial.catalogNotes.availability === "Call us." &&
      partial.catalogNotes.affordableLots === BEFORE.affordableLots,
    "one note set and the other absent: the set one is kept, the other defaults"
  );
}

console.log("\nSaving from the admin");
{
  const tree = buildFieldTree(siteContentSchema, locksForSite());
  const stored = siteContentSchema.parse(site);

  const cleared = clone(stored) as Record<string, unknown>;
  cleared.catalogNotes = { affordableLots: "   ", availability: "" };
  const saved = siteContentSchema.safeParse(coerceToTree(cleared, tree, stored));
  check(
    saved.success &&
      saved.data.catalogNotes.affordableLots === BEFORE.affordableLots &&
      saved.data.catalogNotes.availability === BEFORE.availability,
    "a cleared note saves as the original wording, not as a gap or an error"
  );

  const edited = clone(stored) as Record<string, unknown>;
  edited.catalogNotes = {
    affordableLots: "marks the lots with the lowest opening bids.",
    availability: BEFORE.availability,
  };
  const kept = siteContentSchema.safeParse(coerceToTree(edited, tree, stored));
  check(
    kept.success &&
      kept.data.catalogNotes.affordableLots === "marks the lots with the lowest opening bids.",
    "an edited note keeps the edit"
  );

  for (const slug of ["auction-info", "auction-items"] as const) {
    const schema = pageSchemas[slug];
    const pageTree = buildFieldTree(schema, locksForPage(slug));
    const seed = slug === "auction-info" ? auctionInfoPage : auctionItemsPage;
    const doc = schema.parse(seed) as Record<string, unknown>;
    const key = slug === "auction-info" ? "closing" : "planner";
    const blanked = clone(doc);
    blanked[key] = Object.fromEntries(
      Object.keys(doc[key] as object).map((field) => [field, ""])
    );
    const result = schema.safeParse(coerceToTree(blanked, pageTree, doc));
    const expected = slug === "auction-info" ? BEFORE.closing : BEFORE.planner;
    check(
      result.success &&
        JSON.stringify((result.data as Record<string, unknown>)[key]) ===
          JSON.stringify(expected),
      `${slug}: clearing every ${key} field puts the original wording back`
    );
  }

  const help = (
    tree.fields.find((f) => f.key === "catalogNotes")?.node as {
      fields?: { node: { description?: string } }[];
    }
  )?.fields?.every((f) => f.node.description?.includes("Clear it to go back"));
  check(help === true, "each note's help says that clearing it restores the original");
}

console.log("\nThe pages read the fields");
{
  const category = readFileSync("app/(site)/auction-items/[slug]/page.tsx", "utf8");
  const info = readFileSync("app/(site)/auction-info/page.tsx", "utf8");
  const items = readFileSync("app/(site)/auction-items/page.tsx", "utf8");

  check(
    category.includes('editable("site:catalogNotes.affordableLots")') &&
      category.includes("{catalogNotes.affordableLots}"),
    "the gold-star key is drawn from Site details, and marked as such"
  );
  check(
    category.includes('editable("site:catalogNotes.availability")') &&
      category.includes("{catalogNotes.availability}"),
    "the availability note is drawn from Site details, and marked as such"
  );
  check(
    !info.includes("Supercharge") && info.includes("{page.closing.heading}"),
    "Auction Info no longer carries its closing heading in the code"
  );
  check(
    !items.includes("Not sure where to start") &&
      items.includes("{page.planner.lead}"),
    "Auction Items no longer carries the planner box in the code"
  );

  const editor = readFileSync("app/(admin)/admin/catalog/[slug]/edit/page.tsx", "utf8");
  check(
    /slug: "site",\s*label: "Site details",\s*path: "\/",\s*editorHref: "\/admin\/site"/.test(editor),
    "the category preview lists Site details, so a click on a note links there"
  );
}

async function live(): Promise<void> {
  console.log("\nThe live records");
  if (!isDatabaseConfigured()) {
    console.log("  skip  no database configured");
    return;
  }
  const stored = await readSiteDocument();
  const parsed = siteContentSchema.safeParse(stored);
  check(parsed.success, "the stored Site details still parse");
  if (parsed.success) {
    const notes = parsed.data.catalogNotes;
    const edited = Boolean(
      stored && typeof stored === "object" && "catalogNotes" in stored
    );
    check(
      edited ||
        (notes.affordableLots === BEFORE.affordableLots &&
          notes.availability === BEFORE.availability),
      edited
        ? "the notes have been edited in Site details — the edit is what shows"
        : "unedited, so the category pages read exactly as before"
    );
  }

  const { data, error } = await getServiceClient()
    .from("pages")
    .select("slug, data")
    .in("slug", ["auction-info", "auction-items"]);
  check(!error && (data?.length ?? 0) === 2, "both stored pages were read");
  for (const row of data ?? []) {
    const slug = row.slug as "auction-info" | "auction-items";
    const key = slug === "auction-info" ? "closing" : "planner";
    const result = pageSchemas[slug].safeParse(row.data);
    check(result.success, `the stored ${slug} still parses`);
    if (!result.success) continue;
    const edited = key in (row.data as object);
    check(
      edited ||
        JSON.stringify((result.data as Record<string, unknown>)[key]) ===
          JSON.stringify(slug === "auction-info" ? BEFORE.closing : BEFORE.planner),
      edited
        ? `${slug}: ${key} has been edited — the edit is what shows`
        : `${slug}: unedited, so the ${key} reads exactly as before`
    );
  }
}

live().then(() => {
  console.log(failures ? `\n${failures} failed\n` : "\nDEFAULT WORDING OK\n");
  process.exit(failures ? 1 : 0);
});
