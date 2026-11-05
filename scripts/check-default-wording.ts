/**
 * Keeps the wording that moved out of the page code saying what it said.
 *
 * Text was written into the pages until the client needed to change it: the
 * wording shared by the category pages (now Site details), the closing band on
 * Auction Info, the planner box on Auction Items, and three small lines on the
 * home page. Each is a field now, with the old wording as its default. What
 * this proves:
 *
 *   - the defaults are, word for word, what the pages said before
 *   - a record saved before the fields existed parses with them filled in, so
 *     the live site reads the same until someone edits a field — checked on
 *     the real rows as well when the database is configured
 *   - a field cleared in the admin goes back to the default rather than
 *     leaving a gap, and a field that was edited keeps the edit
 *   - the pages read the fields and no longer carry the old sentences
 *   - a click on a category note in the preview has somewhere to go
 *   - the home page's testimonial strip and the rate-limit message's phone
 *     number read the records that own them
 *
 *   npm run check:default-wording
 * (the react-server condition lets the database client's `server-only` load.)
 */
import { readFileSync } from "node:fs";

import {
  DEFAULT_AFFORDABLE_NOTE,
  DEFAULT_AUCTION_INFO_CLOSING,
  DEFAULT_AVAILABILITY_NOTE,
  DEFAULT_CATALOG_WORDING,
  DEFAULT_HOME_WORDING,
  DEFAULT_PLANNER_PROMO,
} from "@/content/default-wording";
import { pageSchemas, siteContentSchema } from "@/content/schema";
import { site } from "@/content/site";
import { auctionInfoPage } from "@/content/pages/auction-info";
import { auctionItemsPage } from "@/content/pages/auction-items";
import { homePage } from "@/content/pages/home";
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
  catalog: {
    topLabel: "Auction Items",
    introHeading: "What’s in this category",
    requestLink: "Request this item",
    availabilityLabel: "Availability:",
    availabilityButton: "Check Availability for Your Event",
  },
  home: {
    tileCue: "Browse →",
    plannerLink: {
      lead: "Or",
      link: "answer five questions and we’ll suggest a starting point",
    },
    contactAlt: {
      lead: "Prefer the full page?",
      link: "Go to our contact page →",
    },
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
check(
  JSON.stringify(DEFAULT_CATALOG_WORDING) === JSON.stringify(BEFORE.catalog),
  "the category page wording"
);
check(
  JSON.stringify(DEFAULT_HOME_WORDING) === JSON.stringify(BEFORE.home),
  "the home page's three lines"
);

console.log("\nA record from before the fields existed");
{
  const parsed = siteContentSchema.parse(without(site, "catalogNotes"));
  check(
    parsed.catalogNotes.affordableLots === BEFORE.affordableLots &&
      parsed.catalogNotes.availability === BEFORE.availability,
    "Site details with no catalogNotes reads the old notes"
  );
  check(
    Object.entries(BEFORE.catalog).every(
      ([key, wording]) => (parsed.catalogNotes as Record<string, string>)[key] === wording
    ),
    "Site details with no catalogNotes reads the old category wording"
  );
  // The shape a stored record has today: the two notes and nothing else.
  const twoNotes = siteContentSchema.parse({
    ...site,
    catalogNotes: { affordableLots: "Edited star key.", availability: "Edited note." },
  });
  check(
    twoNotes.catalogNotes.availability === "Edited note." &&
      twoNotes.catalogNotes.availabilityButton === BEFORE.catalog.availabilityButton,
    "a record holding only the two notes keeps them and defaults the new wording"
  );
  const oldHome = clone(homePage) as unknown as {
    hero: Record<string, unknown>;
    itemsTeaser: Record<string, unknown>;
    closing: Record<string, unknown>;
  };
  delete oldHome.hero.tileCue;
  delete oldHome.itemsTeaser.plannerLink;
  delete oldHome.closing.contactAlt;
  const home = pageSchemas.home.parse(oldHome);
  check(
    home.hero.tileCue === BEFORE.home.tileCue &&
      JSON.stringify(home.itemsTeaser.plannerLink) === JSON.stringify(BEFORE.home.plannerLink) &&
      JSON.stringify(home.closing.contactAlt) === JSON.stringify(BEFORE.home.contactAlt),
    "a home record from before the fields reads the old lines"
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

  const blankWording = clone(stored) as Record<string, unknown>;
  blankWording.catalogNotes = Object.fromEntries(
    Object.keys(stored.catalogNotes).map((key) => [key, ""])
  );
  const reset = siteContentSchema.safeParse(coerceToTree(blankWording, tree, stored));
  check(
    reset.success &&
      Object.entries(BEFORE.catalog).every(
        ([key, wording]) => (reset.data.catalogNotes as Record<string, string>)[key] === wording
      ),
    "clearing the category wording puts the original back"
  );

  const homeTree = buildFieldTree(pageSchemas.home, locksForPage("home"));
  const homeDoc = pageSchemas.home.parse(homePage);
  const blankHome = clone(homeDoc);
  blankHome.hero.tileCue = "";
  blankHome.itemsTeaser.plannerLink = { lead: "", link: "" };
  blankHome.closing.contactAlt = { lead: "", link: "" };
  const homeReset = pageSchemas.home.safeParse(coerceToTree(blankHome, homeTree, homeDoc));
  check(
    homeReset.success &&
      homeReset.data.hero.tileCue === BEFORE.home.tileCue &&
      JSON.stringify(homeReset.data.itemsTeaser.plannerLink) === JSON.stringify(BEFORE.home.plannerLink) &&
      JSON.stringify(homeReset.data.closing.contactAlt) === JSON.stringify(BEFORE.home.contactAlt),
    "clearing the home page's lines puts the originals back"
  );

  const edited = clone(stored) as Record<string, unknown>;
  edited.catalogNotes = {
    ...stored.catalogNotes,
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
  const home = readFileSync("app/(site)/page.tsx", "utf8");
  const form = readFileSync("src/components/ContactForm.tsx", "utf8");

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

  for (const key of Object.keys(BEFORE.catalog)) {
    check(
      category.includes(`site:catalogNotes.${key}`) &&
        category.includes(`catalogNotes.${key}`),
      `the category page's ${key} is drawn from Site details, and marked as such`
    );
  }
  check(
    !/in this category\s*</.test(category) &&
      !category.includes(`: "Request this item"`) &&
      !category.includes(">Availability:<") &&
      !category.includes(`label: "Check Availability`),
    "the category page no longer carries that wording in the code"
  );
  check(
    !home.includes("Browse &rarr;") &&
      !home.includes("answer five questions") &&
      !home.includes("Prefer the full page"),
    "the home page no longer carries its three lines in the code"
  );
  check(
    !home.includes("collections/testimonials") && home.includes(`getPage("testimonials")`),
    "the home page's testimonial strip reads the Testimonials record"
  );
  check(
    !form.includes("250-6968") && form.includes("call us on {phone}"),
    "the rate-limit message's phone number comes from Site details"
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
    const stored_ = (stored as { catalogNotes?: Record<string, unknown> }).catalogNotes ?? {};
    for (const [key, wording] of Object.entries(BEFORE.catalog)) {
      check(
        key in stored_ || (notes as Record<string, string>)[key] === wording,
        key in stored_
          ? `${key} has been edited — the edit is what shows`
          : `${key}: unedited, so it reads exactly as before`
      );
    }
  }

  const { data, error } = await getServiceClient()
    .from("pages")
    .select("slug, data")
    .in("slug", ["auction-info", "auction-items"]);
  check(!error && (data?.length ?? 0) === 2, "both stored pages were read");

  const { data: homeRow, error: homeError } = await getServiceClient()
    .from("pages")
    .select("data")
    .eq("slug", "home")
    .single();
  check(!homeError && Boolean(homeRow), "the stored home page was read");
  const storedHome = pageSchemas.home.safeParse(homeRow?.data);
  check(storedHome.success, "the stored home page still parses");
  if (storedHome.success) {
    const raw = homeRow?.data as {
      hero?: object;
      itemsTeaser?: object;
      closing?: object;
    };
    check(
      (raw.hero && "tileCue" in raw.hero) ||
        storedHome.data.hero.tileCue === BEFORE.home.tileCue,
      "the home page's card prompt reads as before, or as edited"
    );
    check(
      (raw.itemsTeaser && "plannerLink" in raw.itemsTeaser) ||
        JSON.stringify(storedHome.data.itemsTeaser.plannerLink) ===
          JSON.stringify(BEFORE.home.plannerLink),
      "the home page's planner line reads as before, or as edited"
    );
    check(
      (raw.closing && "contactAlt" in raw.closing) ||
        JSON.stringify(storedHome.data.closing.contactAlt) ===
          JSON.stringify(BEFORE.home.contactAlt),
      "the home page's contact line reads as before, or as edited"
    );
  }
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
