/**
 * One-off content migration: hero tiles, the header logo, and the request form.
 *
 *     npm run migrate:hero-tiles
 *
 * The site's content lives in the database, not in `src/content` — those
 * modules are the seed fixture and the no-database fallback (see
 * `lib/content-source.ts`). So a change to the SHAPE of a stored document is a
 * migration, and this is it. Four changes, all decided by the client:
 *
 *   1. `hero.stats` (four floating counters) becomes `hero.tiles` — three cards
 *      that link to the guitars category, the vacations category and the
 *      auctioneers page — plus `hero.badge`, which is where the years figure
 *      goes now that it is not one of four matching cards.
 *   2. `logo` reads "charityworks.net" rather than "CharityWorks".
 *   3. The contact page's heading, eyebrow and submit button are reworded
 *      around reserving an item rather than around the free-plan offer.
 *   4. A "How will you use it?" tick-box question is added to the form, and a
 *      "No cost, no commitment" line above its send button.
 *
 * WHAT IT PRESERVES. The client has edited the hero since launch — the stored
 * stats read "100+" and "No Risk $0", not the seed's values — so the badge
 * takes its figure and wording from the STORED years stat rather than from the
 * seed module. The stats that have no home in the new hero are not silently
 * dropped: they are in the revision this records, and named on the way past.
 *
 * SAFETY. Every document is snapshotted into `content_revisions` before it is
 * overwritten, unattributed, exactly as the first admin edit to an untouched
 * page does — so this is undoable from the history screen like any other save.
 * Every result is parsed through its Zod schema before it is written; a
 * document that would not render is not stored. Already-migrated documents are
 * left alone, so running it twice is not a second migration.
 *
 * THIS DOES NOT REVALIDATE. The public pages are static and the cache is keyed
 * per deployment (see `BUILD_KEY` in lib/build-key.ts). This runs alongside a
 * deploy of the code that reads the new shape; the deploy is what puts it on
 * the site.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas, siteContentSchema } from "../src/content/schema";
import { homePage } from "../src/content/pages/home";
import { contactPage } from "../src/content/pages/contact";

/* ------------------------------------------------------------------ */
/* Connection                                                          */
/* ------------------------------------------------------------------ */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "Put them in .env.local, then run: npm run migrate:hero-tiles"
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Doc = Record<string, unknown>;

let changed = 0;
let skipped = 0;

/** Parses through the schema, printing every issue before giving up. */
function validate(label: string, schema: { safeParse(v: unknown): unknown }, value: unknown): void {
  const result = (schema as {
    safeParse(v: unknown): {
      success: boolean;
      error?: { issues: { path: PropertyKey[]; message: string }[] };
    };
  }).safeParse(value);
  if (result.success) return;
  console.error(`\n  ${label} would not be valid content:`);
  for (const issue of result.error!.issues) {
    console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

/**
 * Writes the pre-change state to the history before the change lands.
 *
 * `created_by` is null: nobody signed in did this, and attributing a migration
 * to whoever last logged in would be a lie in the one place the client goes to
 * find out who changed something.
 */
async function snapshot(entity: "page" | "site", entityId: string, data: unknown, note: string) {
  const { error } = await db
    .from("content_revisions")
    .insert({ entity, entity_id: entityId, data, note });
  if (error) {
    console.error(`  could not record history for ${entityId}: ${error.message}`);
    process.exit(1);
  }
}

/* ------------------------------------------------------------------ */
/* 1 + 3 + 4. Pages                                                    */
/* ------------------------------------------------------------------ */

async function readPage(slug: string): Promise<Doc> {
  const { data, error } = await db.from("pages").select("data").eq("slug", slug).single();
  if (error || !data) {
    console.error(`  could not read the ${slug} page: ${error?.message ?? "no row"}`);
    process.exit(1);
  }
  return data.data as Doc;
}

async function writePage(slug: string, data: Doc) {
  const { error } = await db.from("pages").update({ data, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) {
    console.error(`  could not save the ${slug} page: ${error.message}`);
    process.exit(1);
  }
}

async function migrateHome() {
  const doc = await readPage("home");
  const hero = { ...(doc.hero as Doc) };

  if (hero.tiles && !hero.stats) {
    console.log("  skip  home — already has hero tiles");
    skipped += 1;
    return;
  }

  const stats = Array.isArray(hero.stats) ? (hero.stats as Doc[]) : [];
  const years = stats.find((stat) => stat.id === "stat-years");
  const dropped = stats
    .filter((stat) => stat.id !== "stat-years")
    .map((stat) => `${stat.value} ${stat.label}`);

  // The client's own wording for the figure that survives, falling back to the
  // seed only if that card is not there to read.
  const badge = {
    value: typeof years?.value === "string" ? years.value : homePage.hero.badge.value,
    label: typeof years?.label === "string" ? years.label : homePage.hero.badge.label,
  };
  hero.badge = badge;
  hero.tiles = homePage.hero.tiles;
  delete hero.stats;

  const next = { ...doc, hero };
  validate("home", pageSchemas.home, next);

  await snapshot("page", "home", doc, "Before the hero tiles migration");
  await writePage("home", next);

  console.log(`  done  home — badge "${badge.value} ${badge.label}", 3 tiles`);
  if (dropped.length > 0) {
    console.log(`        the other stat cards are gone from the page: ${dropped.join(", ")}`);
    console.log("        (they are in the revision recorded above, if any of them is wanted back)");
  }
  changed += 1;
}

async function migrateContact() {
  const doc = await readPage("contact");
  const form = { ...(doc.form as Doc) };
  const fields = [...((form.fields as Doc[]) ?? [])];

  const already =
    doc.heading === contactPage.heading &&
    form.note === contactPage.form.note &&
    fields.some((field) => field.id === "field-auction-format");
  if (already) {
    console.log("  skip  contact — already reworded");
    skipped += 1;
    return;
  }

  if (!fields.some((field) => field.id === "field-auction-format")) {
    // Appended rather than slotted in above the message box: the six the
    // pipeline reads keep their order, and the client can drag it where they
    // want it in the admin.
    fields.push(contactPage.form.fields[contactPage.form.fields.length - 1] as unknown as Doc);
  }

  const next: Doc = {
    ...doc,
    heading: contactPage.heading,
    intro: { ...(doc.intro as Doc), eyebrow: contactPage.intro.eyebrow },
    form: {
      ...form,
      fields,
      submitLabel: contactPage.form.submitLabel,
      note: contactPage.form.note,
    },
  };
  validate("contact", pageSchemas.contact, next);

  await snapshot("page", "contact", doc, "Before the reserve-an-item rewording");
  await writePage("contact", next);

  console.log(`  done  contact — heading "${contactPage.heading}", button "${contactPage.form.submitLabel}", ${fields.length} questions, note set`);
  changed += 1;
}

/* ------------------------------------------------------------------ */
/* 2. Site logo                                                        */
/* ------------------------------------------------------------------ */

const LOGO = { lead: "charityworks", accent: ".net" };

async function migrateLogo() {
  const { data, error } = await db.from("site_settings").select("data").eq("id", 1).single();
  if (error || !data) {
    console.error(`  could not read the site record: ${error?.message ?? "no row"}`);
    process.exit(1);
  }
  const doc = data.data as Doc;
  const logo = doc.logo as Doc;

  if (logo?.lead === LOGO.lead && logo?.accent === LOGO.accent) {
    console.log("  skip  site — logo already reads charityworks.net");
    skipped += 1;
    return;
  }

  const next = { ...doc, logo: LOGO };
  validate("site", siteContentSchema, next);

  // "1" is the id the admin's history screen looks the site record up by —
  // SITE_ENTITY_ID in lib/admin/site-read.ts. A snapshot filed under anything
  // else would exist and never be findable.
  await snapshot("site", "1", doc, "Before the charityworks.net logo change");
  const { error: writeError } = await db
    .from("site_settings")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (writeError) {
    console.error(`  could not save the site record: ${writeError.message}`);
    process.exit(1);
  }

  console.log(`  done  site — logo "${logo?.lead}${logo?.accent}" -> "${LOGO.lead}${LOGO.accent}"`);
  changed += 1;
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log("\nMigrating stored content\n");
  await migrateHome();
  await migrateContact();
  await migrateLogo();
  console.log(`\n  ${changed} document(s) changed, ${skipped} already up to date`);
  console.log("  Deploy the site to put this on the page — the public pages are static.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
