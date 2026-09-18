/**
 * Publishes /terms-and-conditions and links it from the footer.
 *
 *     npm run create:terms
 *
 * The legacy site carried two terms pages, both reproducing a travel
 * partner's own wording: /terms-conditions (SAV, the resort vacation
 * packages) and /travel-terms (JustRewards, the sports and vacation travel
 * awards). Both redirected home on the new site while the client confirmed
 * that reproducing a partner's terms was in order. It is — the page tells a
 * traveller which terms their package is redeemed under, which is a
 * different thing from claiming the wording as CharityWorks' own — so this
 * publishes both, as written, on one page. The redirects for the two legacy
 * addresses now land here (next.config.ts).
 *
 * THE WORDING IS THE PARTNERS'. It was transcribed from the legacy site's
 * scrape in reference/ and is not edited here beyond joining lines: it is
 * binding language for anyone redeeming a trip, and the version a voucher
 * was issued under is the version that should be on the page. Change it in
 * the admin if a partner changes theirs, not here.
 *
 * The free vacation voucher (ShareLife) carries no legal text on the legacy
 * site — its page was the programme's explanation and FAQ, which now lives on
 * /faqs — so nothing is reproduced for it.
 *
 * A custom page rather than a route, so the client can edit it. Linked from
 * the footer's legal line, not the menu: a legal page in the header would sit
 * between "Testimonials" and "Contact" as though it were somewhere to go.
 *
 * Idempotent: an existing page is left alone, an existing footer link is not
 * duplicated. Snapshots the site record before touching it.
 */
import { createClient } from "@supabase/supabase-js";

import { customPageSchema, siteContentSchema } from "../src/content/schema";
import { checkSlug } from "../src/lib/reserved-paths";

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

const SLUG = "terms-and-conditions";

/** Paragraphs are joined with a blank line — the only formatting a block offers. */
const paragraphs = (...lines: string[]) => lines.join("\n\n");

const SAV = paragraphs(
  "You have a full 3 years*, starting on the date of your auction/event, or travel store purchase, to complete your travel.",
  "You may travel yourself, or give the package to someone else, free of charge after registration, if your package has not been booked. You may register the package at any time within the 3-year travel period as registration is not required, but we strongly recommend registering your package to view available resorts and dates.",
  "Accommodations are for consecutive night stays only, and may not be broken up.",
  "Travelers may select from multiple resorts in the destination(s) listed on the package display, including the featured resort(s).",
  "Accommodations are studio or 1-bedroom resort condominium units for up to 4 guests (2a/2c recommended).",
  "Larger accommodations for up to 6 guests may be available. Surcharge may apply.",
  "The SAV Inventory Selection System will be accessible to view and select available resorts and arrival dates upon completion of the package registration. Resorts and arrival date options are generally displayed for selection from 90-300 days in advance of the arrival date. Reservations must be requested at least 90 days prior to the selected arrival date.",
  "No changes of any kind can be made for any reason to a confirmed reservation. This includes traveler name, travel dates, resort, or unit size. We strongly recommend that travelers protect their total investment with appropriate travel insurance coverage. Many excellent insurance providers can be found with an online search of “Travel Insurance”.",
  "This package is valid year-round. Peak season travel dates are subject to availability. Surcharges may apply.",
  "All resorts and dates, including featured resorts, are subject to availability.",
  "This package does not include airfare, meals, taxes, personal expenses, and any fees (including resort and amenities fees) that are only payable at the property.",
  "Other conditions may apply.",
  "*Due to uncertainty of accommodation costs for this extended period, travel during the 3rd year may be subject to an additional cost not to exceed $599.00."
);

const JUST_REWARDS = paragraphs(
  "When choosing an event, please keep in mind that you must allow at least 90 days for fulfillment processing. Only events taking place 30 or more days from your date of redemption will be available.",
  "You will receive a confirmation that your award redemption request has been received within 48 hours of submission. Should any problems arise with your redemption request, you will be notified at that time.",
  "All events available for redemption are based on both accommodation and event ticket availability. It is important to note that availability can be exhausted from time to time. While we will make every effort to fill your award package with your first redemption choice, there are rare instances where this is simply impossible. Should this occur, you will be promptly contacted by one of our Redemption Service Representatives and given the opportunity to redeem your award for a different event. Please do not make plane or other travel arrangements until your redemption has been confirmed by a JustRewards™ Redemption Service Representative.",
  "Charges will apply for additional nights, tickets, and services such as golf or spa. All additions are non-refundable and are subject to availability.",
  "Your tickets and accommodation information will arrive within one week of the event, unless otherwise advised, and will be sent to the address of record via trackable shipping. A signature may be required for delivery of this package.",
  "All JustRewards™ Sports and vacation travel awards are individual awards and are not valid for group travel. We ask that you redeem no more than two awards for an individual event or vacation.",
  "The JustRewards™ Redemption Service Center at 1-866-904-5577 is open Monday through Friday 9AM - 6PM and Saturday 10AM – 4PM Eastern Standard Time, and can help you with questions ranging from the validity of your award through the status of your order. The Redemption Service Center can also assist in finding an event to attend, should you have trouble deciding what to redeem your award for."
);

const CRUISE = paragraphs(
  "Travelers are responsible for transportation to and from the port of departure. Additionally, all personal incidental charges — such as telephone calls, soft drinks and alcoholic beverages, medications, doctor visits, tips and gratuities, services rendered, parking and optional excursions — are also the responsibility of the traveler/s.",
  "Documentation confirming your cruise award vacation will be sent to you approximately 30 days before the confirmed sailing date, unless otherwise advised, and will be sent to the address of record via trackable shipping. A signature may be required for delivery of this package. This documentation is required for cruise embarkation, so please make sure you receive it before leaving for your cruise.",
  "A passport is required for travel. Any guest traveling without proper documentation will not be allowed to board the vessel, and no refund of the cruise fare will be issued. Additional restrictions may apply to your specific vessel, cruise, and/or ports of call. For questions, please refer to the vacation/cruise itinerary for additional details, or contact the JustRewards™ Redemption Service Center at 1-866-904-5577."
);

const DISCLAIMERS = paragraphs(
  "JustRewards™ reserves the right to change the Terms and Conditions of Redemption at any time, without notice.",
  "Please see your individual reward certificate, flyer, brochure, redemption material, online redemption selection pages, or other provided material/s for additional terms and conditions which may apply to your specific award."
);

const LEGAL = paragraphs(
  "The JustRewards™ Redemption Service Center is acting as intermediary and agent for suppliers in selling services, or in accepting reservations or bookings for services which are not directly supplied by this company such as hotel accommodations, group transportation, meals, tours, event tickets, cruises, etc. This company therefore, shall not be responsible for breach of contract of any intentional or careless actions of omissions on the part of such suppliers, which result in any loss, damage, delay or injury to you, your travel companions or group members. We shall not be responsible for any injuries, damages, or losses caused to any traveler in connection with terrorist activities, social or labor unrest, mechanical construction difficulties, diseases, local laws, climactic conditions, abnormal conditions or developments or any other actions, omissions, or conditions outside the company's control.",
  "By embarking upon travel, the traveler/s voluntarily assume/s all risks, and is advised to obtain appropriate insurance coverage against them. Your retention of tickets, vouchers, or booking after issuance shall constitute consent to the above and an agreement on your part to convey the contents here to your travel companions or group members.",
  "By engaging the company and making deposit and/or full payment and/or confirming receipt of redemption confirmation for the package arrangement/s specified, the traveler acknowledges the position of the company as stipulated by the foregoing, and agrees to hold the company blameless in making the arrangements on his/her behalf, provided the same shall be made through generally acceptable suppliers at the time of engagement, and further agrees that restitution of damages, if any are claimed, shall be sought directly from the suppliers. The client also agrees to the terms and conditions of the tour and services as set forth by the suppliers."
);

const IP = paragraphs(
  "The terms, including keywords and/or phrases, as well as all associated graphics and/or logos, are registered trademarks of their respective companies and/or affiliates and are used herein for factual description purposes only. We are in no way associated with or authorized by these companies and neither they nor their affiliates have licensed or endorsed us to sell goods and/or services in conjunction with specific events.",
  "The names \"Total Sports Fan\", \"Super Sports Fan\" and \"All Pro\" are brand names of JustRewards™ and are used herein for descriptive purposes only. They do not refer to the type or level of seating associated with the respective certificate/s."
);

/**
 * One block per heading. Subsections under JustRewards are their own blocks
 * because a block has one heading and one body — and they are all pinned to
 * paper with tight spacing, so a page of legal text reads as one document
 * rather than as banded marketing sections.
 */
const section = (
  id: string,
  heading: string,
  body: string,
  extra: { eyebrow?: string; background?: "paper" | "cream"; spacing?: "tight" | "normal" } = {}
) => ({
  id,
  type: "richText" as const,
  ...(extra.eyebrow ? { eyebrow: extra.eyebrow } : {}),
  heading,
  body,
  width: "narrow" as const,
  spacing: extra.spacing ?? ("tight" as const),
  align: "left" as const,
  background: extra.background ?? ("paper" as const),
});

const PAGE = {
  slug: SLUG,
  title: "Terms & Conditions",
  visibility: "public" as const,
  seo: {
    title: "Terms & Conditions | CharityWorks",
    description:
      "The terms under which the travel packages and vacation awards supplied through CharityWorks are redeemed, as set by the travel partners who fulfil them.",
    targetTerms: [],
    path: `/${SLUG}`,
  },
  intro:
    "The travel packages and vacation awards we supply are fulfilled by our travel partners, and each is redeemed under that partner's own terms. They are reproduced here as the partners publish them.",
  blocks: [
    section("block-terms-sav", "SAV — Terms & Conditions", SAV, {
      eyebrow: "Resort vacation packages",
      background: "cream",
      spacing: "normal",
    }),
    section(
      "block-terms-justrewards",
      "JustRewards™ — Terms and Conditions of Redemption",
      JUST_REWARDS,
      { eyebrow: "Sports and vacation travel awards", spacing: "normal" }
    ),
    section("block-terms-cruise", "Cruise Awards", CRUISE),
    section("block-terms-disclaimers", "Additional Disclaimers", DISCLAIMERS),
    section("block-terms-legal", "Legal Disclosures", LEGAL),
    section("block-terms-ip", "Intellectual Property Disclaimer", IP),
    {
      id: "block-terms-cta",
      type: "callToAction" as const,
      heading: "A question about a package or an award?",
      lede: "Ask us before you book. We will tell you which terms apply and what to expect.",
      cta: {
        id: "cta-terms",
        label: "Contact us",
        href: "/contact",
        variant: "primary" as const,
      },
    },
  ],
};

const FOOTER_LINK = { id: "footer-terms", label: "Terms & Conditions", href: `/${SLUG}` };

async function main() {
  console.log("\nPublishing the Terms & Conditions page\n");

  /* ---- The address has to be one a custom page may take ----------------- */
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

  /* ---- The page --------------------------------------------------------- */
  const existing = await db
    .from("custom_pages")
    .select("slug, published")
    .eq("slug", SLUG)
    .maybeSingle<{ slug: string; published: boolean }>();
  if (existing.error) {
    console.error(`  could not check for the page: ${existing.error.message}`);
    process.exit(1);
  }

  if (existing.data) {
    console.log(`  skip  /${SLUG} already exists (published: ${existing.data.published})`);
  } else {
    const insert = await db
      .from("custom_pages")
      .insert({ slug: SLUG, data: parsed.data, published: true });
    if (insert.error) {
      console.error(`  could not create the page: ${insert.error.message}`);
      process.exit(1);
    }
    console.log(`  done  /${SLUG} created and published, ${PAGE.blocks.length} blocks`);
  }

  /* ---- The footer link -------------------------------------------------- */
  const site = await db.from("site_settings").select("data").eq("id", 1).single();
  if (site.error || !site.data) {
    console.error(`  could not read the site record: ${site.error?.message}`);
    process.exit(1);
  }

  const doc = site.data.data as Record<string, unknown>;
  const footer = (doc.footer ?? {}) as Record<string, unknown>;
  const links = [...((footer.links as Array<Record<string, unknown>>) ?? [])];

  if (links.some((link) => link.href === FOOTER_LINK.href)) {
    console.log(`  skip  the footer already links to /${SLUG}\n`);
    return;
  }

  links.push(FOOTER_LINK);
  const nextSite = { ...doc, footer: { ...footer, links } };
  const validSite = siteContentSchema.safeParse(nextSite);
  if (!validSite.success) {
    console.error("  the site record would not be valid:");
    for (const issue of validSite.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "site",
    entity_id: "1",
    data: doc,
    note: "Before the Terms & Conditions footer link was added",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("site_settings")
    .update({ data: nextSite, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (write.error) {
    console.error(`  could not save the footer: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  done  footer link added: ${FOOTER_LINK.label} -> ${FOOTER_LINK.href}`);
  console.log("\n  Deploy the site to put it live.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
