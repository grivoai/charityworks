/**
 * Renames the hero's donor-incentive card to the client's own wording.
 *
 *     npm run migrate:hero-offer-label
 *
 * "Free Vacations" is what CharityWorks calls the programme — the legacy site
 * headed it "FREE Vacation Voucher Program" — so the card now carries their
 * name for it rather than a description written here.
 *
 * ONLY THE LABEL CHANGES. `href` still points at the FAQ section that explains
 * what the package is and that conditions apply, and `sub` still says whose
 * cost it is not. Those two are what keep the shorter label honest on a site
 * whose main business is selling vacation packages: read entirely alone, "Free
 * Vacations" could be taken to mean the catalog is free. This script asserts
 * both are intact rather than assuming it, because a later edit that changed
 * one of them would quietly turn this label into a claim nobody checked.
 *
 * Idempotent, and snapshots the document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "@/content/schema";
import { homePage } from "@/content/pages/home";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** What has to still be true for the shorter label to be safe to publish. */
const REQUIRED_HREF = "/faqs#free-vacation-program";

async function main() {
  console.log("\nRenaming the hero offer card to the client's own wording\n");

  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", "home")
    .single();
  if (error || !data) {
    console.error(`  could not read the home page: ${error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = data.data as Record<string, unknown>;
  const hero = (doc.hero ?? {}) as Record<string, unknown>;
  const offer = hero.offer as Record<string, unknown> | undefined;

  if (!offer) {
    console.log("  skip  the hero has no offer card\n");
    return;
  }

  const label = homePage.hero.offer?.label;
  if (!label) {
    console.error("  the seed has no offer label to copy.");
    process.exit(1);
  }

  /* The guardrails, checked rather than trusted. */
  if (offer.href !== REQUIRED_HREF) {
    console.error(
      `  ABORT: the card points at ${offer.href}, not ${REQUIRED_HREF}.\n` +
        "  This label is only safe while it links to the section that explains\n" +
        "  the programme. Fix the link first, or reconsider the label."
    );
    process.exit(1);
  }
  if (typeof offer.sub !== "string" || !offer.sub.trim()) {
    console.error(
      "  ABORT: the card has no sub-line. That line is what says the cost is\n" +
        "  not the nonprofit's, and the short label leans on it."
    );
    process.exit(1);
  }

  if (offer.label === label) {
    console.log(`  skip  the card already reads "${label}"\n`);
    return;
  }

  const was = offer.label;
  const next = { ...doc, hero: { ...hero, offer: { ...offer, label } } };

  const parsed = pageSchemas.home.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "page",
    entity_id: "home",
    data: doc,
    note: "Before the hero offer card took the client's own wording",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "home");
  if (write.error) {
    console.error(`  could not save the home page: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  label   "${was}"  ->  "${label}"`);
  console.log(`  link    ${offer.href}  (unchanged)`);
  console.log(`  sub     ${offer.sub}  (unchanged)`);
  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
