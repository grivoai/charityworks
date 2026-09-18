/**
 * Gives Jewelry and Handbags their first real lots.
 *
 *     npm run seed:jewelry-handbags
 *
 * Both categories were `generalOnly`: the client's legacy site sent them to a
 * sister site, jewelsforyourcause.com, and this one described the category
 * without naming stock. The client asked for the two pages to show real
 * pieces "the way the framed gold albums are shown", starting with one or two
 * so they can add the rest themselves. The lots are in the seed module
 * (src/content/collections/auction-items.ts); this puts the same document on
 * the live records, through the same plan the admin's save uses, so what
 * lands in the three catalog tables is exactly what a save would have
 * written.
 *
 * WHAT IS KEPT FROM THE LIVE RECORD. The client uploaded a photograph of their
 * own for the handbags tile through the admin the day before this ran. A tile
 * the client set from an upload is theirs and is kept; a tile still on stock
 * photography is replaced by the seed's. Everything else — wording, groups,
 * lots — is the seed's, because the seed is where the new lots were written.
 *
 * WHAT HAPPENS TO THE PLACEHOLDER LOTS. `jewelry-gemstone`, `jewelry-costume`
 * and `handbags-crystal` are archived, not deleted — `planCategoryWrite`
 * allows nothing else. Their ids stay resolvable for any request link that
 * still carries them.
 *
 * Idempotent: a category already matching the seed is left alone. Records a
 * baseline of the live document before the first write, and the result after.
 */
import { auctionItemSchema } from "@/content/schema";
import { auctionItems } from "@/content/collections/auction-items";
import type { AuctionItem } from "@/content/types";
import { planCategoryWrite } from "@/lib/admin/catalog-write";
import { deepEqual } from "@/lib/admin/coerce";
import { ensureBaseline, recordRevision } from "@/lib/admin/revisions";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { getServiceClient } from "@/lib/supabase";

const SLUGS = ["jewelry", "handbags"] as const;

/** A tile the client chose through the admin lives in the uploads bucket. */
const isClientUpload = (src: string) =>
  /\/storage\/v1\/object\/public\/images\//.test(src);

async function seedCategory(slug: (typeof SLUGS)[number]) {
  const seed = auctionItems.find((category) => category.slug === slug);
  if (!seed) {
    console.error(`  ${slug}: not in the seed module`);
    process.exit(1);
  }

  const live = await supabaseContentSource.getAuctionCategories();
  const current = live.find((category) => category.slug === slug);
  if (!current) {
    console.error(`  ${slug}: not in the database — run the seed first`);
    process.exit(1);
  }

  const next: AuctionItem = {
    ...seed,
    image: isClientUpload(current.image.src) ? current.image : seed.image,
  };

  const parsed = auctionItemSchema.safeParse(next);
  if (!parsed.success) {
    console.error(`  ${slug}: the result would not be valid content:`);
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (deepEqual(current, parsed.data)) {
    console.log(`  skip  /${slug} already matches the seed`);
    return;
  }

  const plan = planCategoryWrite(parsed.data, current);

  console.log(`  /${slug}`);
  console.log(`    tile      ${isClientUpload(current.image.src) ? "kept (client upload)" : "-> " + next.image.src}`);
  for (const group of plan.groups) {
    console.log(`    group     ${group.id}: "${group.title ?? ""}"`);
  }
  for (const id of plan.created) console.log(`    new lot   ${id}`);
  for (const id of plan.archive) console.log(`    archived  ${id}`);

  await ensureBaseline({
    entity: "category",
    entityId: current.id,
    data: current,
    adminId: null,
  });

  /* The same statements, in the same order, as the admin's applyPlan: the
     category, then the groups, then the lots, and archiving last so nothing
     leaves the page before its replacement exists. */
  const supabase = getServiceClient();

  const category = await supabase
    .from("catalog_categories")
    .update({ ...plan.category, updated_at: new Date().toISOString() })
    .eq("id", current.id);
  if (category.error) {
    console.error(`  the category could not be saved: ${category.error.message}`);
    process.exit(1);
  }

  for (const group of plan.groups) {
    const { error } = await supabase
      .from("catalog_groups")
      .update({ title: group.title, blurb: group.blurb, position: group.position })
      .eq("id", group.id);
    if (error) {
      console.error(`  a group could not be saved: ${error.message}`);
      process.exit(1);
    }
  }

  if (plan.items.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .upsert(
        plan.items.map((item) => ({ ...item, published: true })),
        { onConflict: "id" }
      );
    if (error) {
      console.error(`  the lots could not be saved: ${error.message}`);
      process.exit(1);
    }
  }

  if (plan.archive.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .update({ published: false })
      .in("id", plan.archive);
    if (error) {
      console.error(`  a placeholder lot could not be retired: ${error.message}`);
      process.exit(1);
    }
  }

  await recordRevision({
    entity: "category",
    entityId: current.id,
    data: parsed.data,
    adminId: null,
    note: "First real lots, transcribed from jewelsforyourcause.com",
  });
}

async function main() {
  console.log("\nSeeding the first jewelry and handbag lots\n");
  for (const slug of SLUGS) await seedCategory(slug);
  console.log("\n  Deploy the site to put them on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
