/**
 * Builds the client list page.
 *
 *     npm run create:client-list
 *
 * Created with `published: false` so the twenty-six named third parties could
 * not be read by anyone outside the admin until Ira confirmed the list was
 * still accurate — naming an organisation as a client is a claim about them,
 * not only about CharityWorks. That confirmation came on 29 August 2026 and the
 * page is live.
 *
 * Re-running this NEVER changes `published`. The flag is a human decision and
 * a script re-run is not a fresh one, so an unpublish stays unpublished.
 *
 * SOURCE. Transcribed from the legacy site's /client-list, which is a
 * client-rendered page — the names are not in its served HTML, so they were
 * read from the rendered DOM. Order is the legacy page's order, which groups
 * the better-known organisations first; it is preserved rather than sorted,
 * because that ordering is a decision somebody made.
 *
 * THREE CORRECTIONS, and nothing else changed:
 *   Athernian School  -> Athenian School      (Danville, CA)
 *   Concord Pavillion -> Concord Pavilion
 *   Summitt Bank      -> Summit Bank
 * Each is an unambiguous misspelling of a real, checkable name. Everything else
 * is reproduced exactly as the client wrote it, including "Children's Hospital"
 * and "Teachers for America", which are imprecise but are the client's words
 * about their own relationships and not mine to reinterpret.
 *
 * THE HEADING KEEPS THE LEGACY FRAMING — "Selected partial client list". It is
 * doing real work: it makes the list an illustrative sample rather than an
 * exhaustive claim, which is both true and the safer statement.
 *
 * Idempotent: re-running rewrites the same document and leaves `published`
 * alone if a human has since flipped it.
 */
import { createClient } from "@supabase/supabase-js";

import { customPageSchema } from "@/content/schema";

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

const SLUG = "client-list";

/** Legacy order preserved. Corrections marked in the comments above. */
const CLIENTS = [
  "Make-A-Wish Foundation",
  "Boy Scouts of America",
  "University of California-Davis",
  "American Lung Association",
  "Cystic Fibrosis Foundation",
  "Wheelchair Foundation",
  "Joe Montana Celebrity Golf Tournament",
  "St. Mary's College",
  "Children's Hospital",
  "Oakland East Bay Symphony",
  "City of Hope",
  "Brent Jones Celebrity Golf Tournament",
  "Hispanic Society of Alameda",
  "Cal Baseball",
  "Athenian School",
  "Monte Vista School",
  "Danny Foundation",
  "Teachers for America",
  "Concord Pavilion",
  "Vista Grande School",
  "Summit Bank",
  "Montessori School",
  "KNBR Radio",
  "Tim Hudson Celebrity Golf Tournament",
  "Petaluma Education Foundation",
  "Fred Biletnikoff Foundation",
];

/**
 * Three columns, filled down rather than across.
 *
 * `paragraphs()` in PageBlocks splits a body on blank lines, so each name is
 * separated by one to become its own paragraph. A single newline would render
 * as one run-on paragraph.
 */
function columnsBlock() {
  const per = Math.ceil(CLIENTS.length / 3);
  return {
    id: "block-client-list-names",
    type: "columns" as const,
    ratio: "equal" as const,
    width: "contained" as const,
    spacing: "normal" as const,
    align: "left" as const,
    background: "auto" as const,
    columns: [0, 1, 2].map((c) => ({
      id: `column-client-list-${c + 1}`,
      items: [
        {
          id: `item-client-list-${c + 1}`,
          type: "text" as const,
          body: CLIENTS.slice(c * per, c * per + per).join("\n\n"),
        },
      ],
    })),
  };
}

const DOCUMENT = {
  slug: SLUG,
  title: "Client list",
  /* Public, not unlisted — and the distinction matters more than it looks.
     `unlisted` keeps a page out of the nav AND the sitemap AND marks it
     `noindex, nofollow`. The first of those was what I wanted (eight nav items
     is enough, and this is a page to link to from a proposal rather than a
     ninth top-level destination); the last two defeat the entire reason the
     page exists. It is credibility content — the thing both audits said the
     site had none of — and a client list nobody can find proves nothing to
     anybody.

     Public does not put it in the menu. The nav is curated from
     `site_settings`; `getListedCustomPages` only feeds the admin's picker, so
     this becomes an option someone can add rather than a link that appears on
     its own. */
  visibility: "public" as const,
  seo: {
    title: "Nonprofits We Have Worked With | CharityWorks",
    description:
      "A selected, partial list of the nonprofits, schools, foundations and charity golf tournaments CharityWorks has supplied auction items to.",
    targetTerms: ["charity auction company clients", "nonprofit auction references"],
    path: `/${SLUG}`,
  },
  intro:
    "Some of the organisations we have supplied auction items to over three decades of day-of-event fundraising.",
  blocks: [
    {
      id: "block-client-list-intro",
      type: "richText" as const,
      heading: "Selected partial client list",
      body:
        "These are a sample rather than a complete record. If you would like a reference from an organisation similar to yours — comparable size, comparable event — ask and we will put you in touch.",
      width: "narrow" as const,
      spacing: "normal" as const,
      align: "left" as const,
      background: "auto" as const,
    },
    columnsBlock(),
    {
      id: "block-client-list-cta",
      type: "callToAction" as const,
      heading: "Planning something similar?",
      lede: "Tell us about your event and we will build a risk-free plan for it.",
      cta: {
        id: "cta-client-list",
        label: "Get Your Free Fundraising Plan",
        href: "/contact",
        variant: "primary" as const,
      },
      width: "contained" as const,
      spacing: "normal" as const,
      align: "center" as const,
      background: "auto" as const,
    },
  ],
};

async function main() {
  console.log("\nBuilding the client list page (staged, not published)\n");

  const parsed = customPageSchema.safeParse(DOCUMENT);
  if (!parsed.success) {
    console.error("  the document would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const existing = await db
    .from("custom_pages")
    .select("slug, published, data")
    .eq("slug", SLUG)
    .maybeSingle();

  if (existing.data) {
    await db.from("content_revisions").insert({
      entity: "custom-page",
      entity_id: SLUG,
      data: existing.data.data,
      note: "Before the client list was rebuilt",
    });
    const write = await db
      .from("custom_pages")
      .update({ data: DOCUMENT, updated_at: new Date().toISOString() })
      .eq("slug", SLUG);
    if (write.error) {
      console.error(`  could not update the page: ${write.error.message}`);
      process.exit(1);
    }
    console.log(`  updated  /${SLUG} (published left as ${existing.data.published})`);
  } else {
    const write = await db
      .from("custom_pages")
      .insert({ slug: SLUG, data: DOCUMENT, published: false });
    if (write.error) {
      console.error(`  could not create the page: ${write.error.message}`);
      process.exit(1);
    }
    console.log(`  created  /${SLUG}`);
  }

  console.log(`\n  ${CLIENTS.length} organisations, legacy order preserved`);
  console.log("  corrected: Athenian School, Concord Pavilion, Summit Bank");
  console.log("  visibility: public — indexable and in the sitemap, but NOT in");
  console.log("              the nav; that list is curated in Admin > Site details.");
  console.log("\n  `published` is left exactly as it was — this script never flips it.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
