/**
 * Puts the free donor incentive into the stored home document's hero.
 *
 *     npm run migrate:hero-offer
 *
 * `hero.offer` is optional in the schema, so this is not a shape migration the
 * way `migrate-hero-tiles` was — the stored document parses with or without it.
 * It is here because the offer is content and content lives in the database;
 * editing `src/content/pages/home.ts` alone changes the seed fixture and not
 * the site.
 *
 * SUPERSEDED IN PART. The video described below has since moved to
 * /auction-info and `hero.video` no longer exists in the schema — see
 * `move-video-to-auction-info.ts`. The carry-over here is now a no-op.
 *
 * WHY THE VIDEO WAS TOUCHED HERE. `hero.video` was written into this
 * document when the video moved off the FAQs page, but the hero schema had no
 * `video` field at the time — so every read parsed the document, silently
 * stripped the key it did not know, and handed the page a hero with no video.
 * The field exists now. This re-asserts the stored value through the schema
 * that finally accepts it, so a document written before the field existed is
 * not left carrying a value nothing will ever read.
 *
 * Both values are validated through `homePageSchema` before anything is
 * written, which runs the same host allowlist the hero uses to decide whether
 * to render the control at all — so a URL this stores is a URL that will open.
 *
 * Idempotent, and snapshots the document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "../src/content/schema";
import { homePage } from "../src/content/pages/home";

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

async function main() {
  console.log("\nPromoting the free donor incentive into the home hero\n");

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

  /* The video is only carried over if the document already holds one — this
     script promotes the offer, it does not decide the site should have a
     video. An operator who cleared the video deliberately keeps it cleared. */
  const nextHero = {
    ...hero,
    offer: homePage.hero.offer,
    ...(hero.video ? { video: hero.video } : {}),
  };
  const next = { ...doc, hero: nextHero };

  const parsed = pageSchemas.home.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  /* Compared whole rather than by label: the wording of the sub-line is the
     part most likely to be revised, and a skip keyed on the label alone would
     silently decline to apply exactly those edits. */
  const unchanged =
    JSON.stringify(hero.offer) === JSON.stringify(homePage.hero.offer);
  if (unchanged && hero.video) {
    console.log("  skip  the offer is already in the hero\n");
    return;
  }

  const history = await db.from("content_revisions").insert({
    entity: "page",
    entity_id: "home",
    data: doc,
    note: "Before the free donor incentive was promoted into the hero",
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

  console.log(`  offer "${homePage.hero.offer?.label}" -> ${homePage.hero.offer?.href}`);
  console.log(`        ${homePage.hero.offer?.sub}`);
  if (hero.video) {
    const video = hero.video as { linkLabel?: string };
    console.log(`  video "${video.linkLabel}" now parses and will render`);
  }
  console.log("  Deploy the site to put it in the hero.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
