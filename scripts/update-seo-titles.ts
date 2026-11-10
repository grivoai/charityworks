/**
 * Puts the two page titles approved in the November 2026 SEO audit on the
 * live site.
 *
 *     npm run migrate:seo-titles
 *
 * Home           "Charity Auction Items on Consignment | CharityWorks"
 * Signed Guitars "Celebrity Signed Guitars for Charity Auctions | CharityWorks"
 *
 * Both titles are content: they are the `seo.title` field of the home page and
 * of the signed-guitars category, and the client edits them in the admin under
 * "Search engine listing". Writing them into the page code would put a value
 * on the page that the admin field no longer controls, so the seed modules
 * carry the new wording and this script copies it into the live records.
 *
 * ONLY A TITLE STILL READING THE OLD WORDING IS CHANGED. One the client has
 * already reworded in the admin is left alone and reported, because their
 * edit is newer than the audit. Nothing else on either record is touched.
 *
 * Idempotent, and records each record before and after in
 * `content_revisions`, as an admin save would. Deploy afterwards: content is
 * read at build time.
 */
import { auctionItemSchema, pageSchemas } from "@/content/schema";
import { auctionItems } from "@/content/collections/auction-items";
import { homePage } from "@/content/pages/home";
import { ensureBaseline, recordRevision } from "@/lib/admin/revisions";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { getServiceClient } from "@/lib/supabase";

const OLD_HOME_TITLE =
  "Nonprofit Fundraising Consultant & Charity Auction Items | CharityWorks";
const OLD_GUITARS_TITLE =
  "Celebrity Signed Guitar Fundraiser Auction Items | CharityWorks";
const GUITARS = "signed-guitars";
const NOTE = "SEO audit: page title updated";

async function updateHome(): Promise<void> {
  const db = getServiceClient();
  const next = homePage.seo.title;

  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", "home")
    .single();
  if (error || !data) {
    throw new Error(`could not read the home page: ${error?.message ?? "no row"}`);
  }

  const doc = data.data as Record<string, unknown>;
  const seo = (doc.seo ?? {}) as Record<string, unknown>;

  if (seo.title === next) {
    console.log(`  skip  home already reads "${next}"`);
    return;
  }
  if (seo.title !== OLD_HOME_TITLE) {
    console.log(`  skip  home has been reworded in the admin: "${String(seo.title)}"`);
    return;
  }

  const updated = { ...doc, seo: { ...seo, title: next } };
  const parsed = pageSchemas.home.safeParse(updated);
  if (!parsed.success) {
    throw new Error(
      "the home page would not be valid content:\n" +
        parsed.error.issues
          .map((issue) => `    ${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("\n")
    );
  }

  await ensureBaseline({ entity: "page", entityId: "home", data: doc, adminId: null });

  const write = await db
    .from("pages")
    .update({ data: parsed.data, updated_at: new Date().toISOString() })
    .eq("slug", "home");
  if (write.error) throw new Error(`could not save the home page: ${write.error.message}`);

  await recordRevision({
    entity: "page",
    entityId: "home",
    data: parsed.data,
    adminId: null,
    note: NOTE,
  });
  console.log(`  home      "${OLD_HOME_TITLE}"  ->  "${next}"`);
}

async function updateGuitars(): Promise<void> {
  const seed = auctionItems.find((category) => category.slug === GUITARS);
  if (!seed) throw new Error(`the seed module has no ${GUITARS} category`);
  const next = seed.seo.title;

  const live = await supabaseContentSource.getAuctionCategories();
  const current = live.find((category) => category.slug === GUITARS);
  if (!current) throw new Error(`/${GUITARS} is not in the database`);

  if (current.seo.title === next) {
    console.log(`  skip  ${GUITARS} already reads "${next}"`);
    return;
  }
  if (current.seo.title !== OLD_GUITARS_TITLE) {
    console.log(`  skip  ${GUITARS} has been reworded in the admin: "${current.seo.title}"`);
    return;
  }

  const updated = { ...current, seo: { ...current.seo, title: next } };
  const parsed = auctionItemSchema.safeParse(updated);
  if (!parsed.success) {
    throw new Error(
      `${GUITARS} would not be valid content:\n` +
        parsed.error.issues
          .map((issue) => `    ${issue.path.join(".") || "(root)"}: ${issue.message}`)
          .join("\n")
    );
  }

  await ensureBaseline({
    entity: "category",
    entityId: current.id,
    data: current,
    adminId: null,
  });

  const write = await getServiceClient()
    .from("catalog_categories")
    .update({ seo: parsed.data.seo, updated_at: new Date().toISOString() })
    .eq("id", current.id);
  if (write.error) throw new Error(`could not save ${GUITARS}: ${write.error.message}`);

  await recordRevision({
    entity: "category",
    entityId: current.id,
    data: parsed.data,
    adminId: null,
    note: NOTE,
  });
  console.log(`  ${GUITARS}  "${OLD_GUITARS_TITLE}"  ->  "${next}"`);
}

async function main() {
  console.log("\nApplying the approved SEO page titles\n");
  await updateHome();
  await updateGuitars();
  console.log("\n  Deploy the site to put them on the page.\n");
}

main().catch((error) => {
  console.error(`  ${(error as Error).message}`);
  process.exit(1);
});
