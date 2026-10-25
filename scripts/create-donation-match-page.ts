/**
 * Publishes /donation-match-special-offer, rebuilt from the legacy page.
 *
 *     npm run create:donation-match -- --dry-run   # read only: says what it would do
 *     npm run create:donation-match                # writes and publishes
 *
 * The legacy site served this address and the new one 404'd on it. The link
 * is posted to partners, so it has to keep working at the same path after the
 * cutover — a redirect would land them somewhere that does not make the offer.
 *
 * THE WORDING IS THE CLIENT'S, TYPOS INCLUDED. It was read out of the legacy
 * page's builder bundle and is reproduced as written: "subject ot
 * availabiliyt", "onlyk", "restrictiosn", "Williamsburge", "Branson, MI",
 * "Austrailia", "Cabo San Lucas, MC" and "Organizaion" are hers. Correct them
 * in the admin, where the correction is hers to make, not here.
 *
 * Two things on the legacy page are not words in a text box:
 *
 *   - The "$399 / $1800 Value" starburst was a picture. Its two lines are set
 *     as text in the opening block rather than re-hosted as clip art, so the
 *     offer reads the same and nothing is uploaded.
 *   - The form (Name, Email, Phone, Subject, Message) becomes the site's own
 *     enquiry form, which has no Subject but asks for the organization and
 *     event date as fields of their own. The instruction to put those in the
 *     message is kept as she wrote it.
 *
 * Public, not unlisted: the legacy page was absent from the menu but listed in
 * the sitemap and indexable, which is what `public` means for a custom page —
 * it is in the sitemap and offered as a menu destination, never added to the
 * menu by itself.
 *
 * THE ROW ALREADY EXISTS. Someone started this page in the admin on
 * 2026-10-20 and left it as an empty, unpublished shell. That shell is filled
 * and published; anything more than a shell — a single block — is somebody's
 * work, and the script refuses rather than replace it. A missing row is
 * created. Either write snapshots what was there first.
 *
 * EVERY LINE IS ITS OWN PARAGRAPH. A custom page's blocks draw their text
 * through `Prose` in PageBlocks, which starts a paragraph at a blank line and
 * nothing else: it never got the single-line-break and "- " bullet handling
 * TextBlock has, so a newline-separated list runs together into one line. The
 * legacy page spaced its bullets and destinations a blank line apart anyway,
 * so that is what is written here.
 *
 * A custom page's published list is cached per build, so the page goes live
 * with the next deploy after this runs, not before.
 */
import { createClient } from "@supabase/supabase-js";

import { customPageSchema } from "../src/content/schema";
import { checkSlug } from "../src/lib/reserved-paths";

const DRY_RUN = process.argv.includes("--dry-run");

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

const SLUG = "donation-match-special-offer";

const RESORT_FEATURES = [
  "- Accommodates up to two adults and two children",
  "- One year to travel, so you have plenty of time to plan your trip",
  "- Travel must be booked within 30 days of check in, however if you choose to reserve 31 - 180 days in advance, there may be a fee.",
  "- Transferable prior to booking accommodations",
  "- Destinations and travel times are subject to availability",
  "- Never less than 35,000 units to choose from",
  "- Accommodations range from studios to two-bedroom units. Many units have a living room, dining room and fully-equipped kitchen",
].join("\n\n");

/** The legacy page's three columns, in its order. */
const DESTINATIONS = [
  [
    "New York, NY",
    "Williamsburge, VA",
    "Kitty Hawk, NC",
    "Myrtle Beach, SC",
    "Orlando, FL",
    "Nashville, TN",
    "Branson, MI",
    "New Orleans, LA",
    "Austin, TX",
    "Austrailia",
  ],
  [
    "Denver, CO",
    "Phoenix, AZ",
    "Sedona, AZ",
    "Las Vegas, NV",
    "San Diego, CA",
    "Kauai, HI",
    "Collingwood, CAN",
    "Cancun, MX",
    "Puerto Vallarta, MX",
    "South Africa",
  ],
  [
    "Cabo San Lucas, MC",
    "The Bahamas",
    "Dominican Republic",
    "Puerto Rico",
    "U.S. Virgin Islands",
    "Portugal",
    "Costa del Sol, Spain",
    "Canary Islands, Spain",
    "Switzerland",
    "Egypt",
  ],
];

const DISCLAIMER =
  "* Destinations and travel times are subject ot availabiliyt and confirmed on a first come, first served basis. Offer includes accommodations onlyk and specifically excludes travel costs and other expenses that may be incurred. Price does not include tax. Other restrictiosn may apply. Offer may not be combined with any other offer, discount, or coupon. Other restrictions may apply. Offer void where prohibited by law. All prices are in U.S. dollars (USD).";

const PAGE = {
  slug: SLUG,
  title: "SPECIAL Donation Match Exclusive Offer",
  visibility: "public" as const,
  seo: {
    title: "Donation Match SPECIAL OFFER | CharityWorks",
    description:
      "Limited Time SPECIAL for Donation Match Partners: an 8 day, 7 night stay at the winner's choice of resort destinations worldwide, $399.",
    targetTerms: [],
    path: `/${SLUG}`,
  },
  intro: "Limited Time SPECIAL for Donation Match Partners $399",
  blocks: [
    {
      id: "block-dm-offer",
      type: "richText" as const,
      heading: "8 Day 7 Night Worldwide Destinations",
      body: "Winner's Choice of Destination\n\n$399\n\n$1800 Value",
      align: "centre" as const,
      background: "cream" as const,
    },
    {
      id: "block-dm-features",
      type: "richText" as const,
      heading: "Choose from resort properties worldwide *",
      body: RESORT_FEATURES,
      background: "paper" as const,
    },
    {
      id: "block-dm-destinations",
      type: "columns" as const,
      heading: "Destinations Include",
      align: "centre" as const,
      background: "cream" as const,
      spacing: "tight" as const,
      columns: DESTINATIONS.map((places, index) => ({
        id: `col-dm-destinations-${index + 1}`,
        items: [
          {
            id: `item-dm-destinations-${index + 1}`,
            type: "text" as const,
            body: places.join("\n\n"),
          },
        ],
      })),
    },
    {
      id: "block-dm-more",
      type: "richText" as const,
      body: "PLUS MANY MORE WORLDWIDE",
      align: "centre" as const,
      background: "cream" as const,
      spacing: "tight" as const,
    },
    {
      id: "block-dm-disclaimer",
      type: "richText" as const,
      body: DISCLAIMER,
      background: "paper" as const,
      spacing: "tight" as const,
    },
    {
      id: "block-dm-form",
      type: "enquiryForm" as const,
      heading: "Please fill out the form below to claim your special Donation Match pricing.",
      lede: "PLEASE INCLUDE the following under MESSAGE on this form: Name of your Organizaion, Date of Event (if known) and if you are thinking of using this for a LIVE, SILENT or RAFFLE item.",
    },
    {
      id: "block-dm-consignment",
      type: "columns" as const,
      heading: "Be sure to check out our RISK FREE Consignment Items for your auction",
      align: "centre" as const,
      background: "paper" as const,
      columns: [
        {
          id: "col-dm-consignment-1",
          items: [
            {
              id: "item-dm-consignment-jewelry",
              type: "button" as const,
              cta: {
                id: "cta-dm-jewelry",
                label: "Consignment - Jewelry & Purses",
                href: "https://www.jewelsforyourcause.com/",
                variant: "secondary" as const,
              },
            },
          ],
        },
        {
          id: "col-dm-consignment-2",
          items: [
            {
              id: "item-dm-consignment-auction",
              type: "button" as const,
              cta: {
                id: "cta-dm-auction",
                label: "Consignment - Sample Silent Auction",
                href: "https://paybee.net/@charityworks@8",
                variant: "secondary" as const,
              },
            },
          ],
        },
      ],
    },
  ],
};

async function main() {
  console.log(
    `\nPublishing /${SLUG}${DRY_RUN ? " (dry run — nothing is written)" : ""}\n`
  );

  const problem = checkSlug(SLUG);
  if (!problem.ok) {
    console.error(`  /${SLUG} cannot be used: ${problem.reason}`);
    process.exit(1);
  }

  const parsed = customPageSchema.safeParse(PAGE);
  if (!parsed.success) {
    console.error("  the page would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const existing = await db
    .from("custom_pages")
    .select("slug, data, published, updated_at")
    .eq("slug", SLUG)
    .maybeSingle<{
      slug: string;
      data: Record<string, unknown>;
      published: boolean;
      updated_at: string;
    }>();
  if (existing.error) {
    console.error(`  could not check for the page: ${existing.error.message}`);
    process.exit(1);
  }

  /* ---- No row: create it ------------------------------------------------ */
  if (!existing.data) {
    if (DRY_RUN) {
      console.log(`  would create /${SLUG} and publish it, ${PAGE.blocks.length} blocks\n`);
      return;
    }
    const insert = await db
      .from("custom_pages")
      .insert({ slug: SLUG, data: parsed.data, published: true });
    if (insert.error) {
      console.error(`  could not create the page: ${insert.error.message}`);
      process.exit(1);
    }
    console.log(`  done  /${SLUG} created and published, ${PAGE.blocks.length} blocks`);
    console.log("\n  Deploy the site to put it live.\n");
    return;
  }

  /* ---- A row: fill it only while it is still an empty shell -------------- */
  const blocks = existing.data.data?.blocks;
  if (!Array.isArray(blocks) || blocks.length > 0) {
    console.error(
      `  /${SLUG} already has ${Array.isArray(blocks) ? blocks.length : "unreadable"} ` +
        `block(s) (published: ${existing.data.published}). Somebody has worked on it, ` +
        "so it is left alone. Compare it with this script in the admin and finish it there."
    );
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log(
      `  would fill the empty draft of /${SLUG} (published: ${existing.data.published}) ` +
        `with ${PAGE.blocks.length} blocks and publish it, after snapshotting the draft\n`
    );
    return;
  }

  const history = await db.from("content_revisions").insert({
    entity: "custom-page",
    entity_id: SLUG,
    data: existing.data.data,
    note: "Empty draft, before the legacy Donation Match page was rebuilt into it",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  /* Guarded on the row being exactly as it was read — `updated_at` moves on
     every save — so an admin edit that lands between the read and the write
     is not overwritten. */
  const write = await db
    .from("custom_pages")
    .update({ data: parsed.data, published: true })
    .eq("slug", SLUG)
    .eq("updated_at", existing.data.updated_at)
    .select("slug");
  if (write.error) {
    console.error(`  could not save the page: ${write.error.message}`);
    process.exit(1);
  }
  if (!write.data?.length) {
    console.error(`  /${SLUG} changed while this ran; nothing was written. Run it again.`);
    process.exit(1);
  }

  console.log(`  done  /${SLUG} filled and published, ${PAGE.blocks.length} blocks`);
  console.log("\n  Deploy the site to put it live.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
