/**
 * Splits Jewelry into two sections, Gemstone and Costume.
 *
 *     npm run migrate:jewelry-sections
 *
 * The client asked for the two kinds of jewelry to be separate sections
 * with a way to pick between them at the top of the page. The page draws
 * that picker for any category with two or more titled groups, so what the
 * live record needs is a second group. Groups cannot be added through the
 * admin — `planCategoryWrite` refuses a changed group count, because
 * removing one would cascade-delete its lots — so this is the way in, the
 * same as every group before it.
 *
 * WHAT IT DOES. Inserts the `jewelry-costume` group after the gemstone one,
 * with the wording from the seed module and no lots; the client adds the
 * pieces. Takes the "Costume pieces … ask us" sentence off the gemstone
 * blurb, since Costume now has its own — but only if that blurb is still
 * the seed's wording. A blurb the client has reworded is left alone and
 * reported. Nothing else on the category is touched: the client has added
 * lots of their own since the seed, and those are theirs.
 *
 * Idempotent, and records the category before and after in
 * `content_revisions`, as the admin's save would.
 */
import { auctionItemSchema } from "@/content/schema";
import { auctionItems } from "@/content/collections/auction-items";
import { ensureBaseline, recordRevision } from "@/lib/admin/revisions";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { getServiceClient } from "@/lib/supabase";

const SLUG = "jewelry";
const GEMSTONE = "jewelry-all";
const COSTUME = "jewelry-costume";

const OLD_GEMSTONE_BLURB =
  "Set in .925 sterling silver, each piece supplied with its appraisal card detailing stone size and weight. Costume pieces at accessible price points are also available — ask us.";

async function main() {
  console.log("\nSplitting Jewelry into Gemstone and Costume sections\n");

  const seed = auctionItems.find((category) => category.slug === SLUG);
  const seedGemstone = seed?.groups.find((group) => group.id === GEMSTONE);
  const seedCostume = seed?.groups.find((group) => group.id === COSTUME);
  if (!seed || !seedGemstone || !seedCostume) {
    console.error("  the seed module does not carry both groups — update it first");
    process.exit(1);
  }

  const live = await supabaseContentSource.getAuctionCategories();
  const current = live.find((category) => category.slug === SLUG);
  if (!current) {
    console.error(`  /${SLUG} is not in the database`);
    process.exit(1);
  }

  const gemstone = current.groups.find((group) => group.id === GEMSTONE);
  if (!gemstone) {
    console.error(`  /${SLUG} has no "${GEMSTONE}" group — not the shape this script expects`);
    process.exit(1);
  }
  const hasCostume = current.groups.some((group) => group.id === COSTUME);

  const nextGemstoneBlurb =
    gemstone.blurb === OLD_GEMSTONE_BLURB ? seedGemstone.blurb : gemstone.blurb;
  const blurbChanges = nextGemstoneBlurb !== gemstone.blurb;

  if (hasCostume && !blurbChanges) {
    console.log("  skip  both sections are already there\n");
    return;
  }

  /* The document as it will read after the writes, checked against the
     schema before anything is written, and recorded as the new version. */
  const next = {
    ...current,
    groups: [
      ...current.groups.map((group) =>
        group.id === GEMSTONE ? { ...group, blurb: nextGemstoneBlurb } : group
      ),
      ...(hasCostume ? [] : [{ ...seedCostume }]),
    ],
  };
  const parsed = auctionItemSchema.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  await ensureBaseline({
    entity: "category",
    entityId: current.id,
    data: current,
    adminId: null,
  });

  const supabase = getServiceClient();

  if (blurbChanges) {
    const { error } = await supabase
      .from("catalog_groups")
      .update({ blurb: nextGemstoneBlurb ?? null })
      .eq("id", GEMSTONE);
    if (error) {
      console.error(`  the gemstone blurb could not be saved: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ${GEMSTONE}      blurb: dropped the "ask us" sentence — Costume has its own now`);
  } else {
    console.log(
      `  ${GEMSTONE}      blurb: left alone — not the seed's wording, so the client has reworded it`
    );
  }

  if (!hasCostume) {
    const { error } = await supabase.from("catalog_groups").insert({
      id: COSTUME,
      category_id: current.id,
      title: seedCostume.title ?? null,
      blurb: seedCostume.blurb ?? null,
      position: current.groups.length,
    });
    if (error) {
      console.error(`  the costume group could not be added: ${error.message}`);
      process.exit(1);
    }
    console.log(`  ${COSTUME}  added: "${seedCostume.title}", no lots yet`);
  }

  await recordRevision({
    entity: "category",
    entityId: current.id,
    data: parsed.data,
    adminId: null,
    note: "Split into Gemstone and Costume sections",
  });

  console.log("\n  Deploy the site to put the picker on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
