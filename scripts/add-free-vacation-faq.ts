/**
 * Explains the free vacation program on /faqs, and points the hero at it.
 *
 *     npm run migrate:free-vacation-faq
 *
 * The hero's gold card claims a free Las Vegas package for every donor and,
 * until now, linked to the donor section further down the home page — four
 * reward tiles that show what the programme *does* without ever saying what it
 * *is*. Someone who reads a claim that large wants the explanation next.
 *
 * WHAT THE COPY IS BUILT FROM, AND WHAT IT DELIBERATELY OMITS. Every factual
 * claim here comes from what CharityWorks already publishes in the home page's
 * donor section: partner-donated hotel nights and show tickets, no cost to the
 * nonprofit, and the four behaviours the programme rewards. The fulfilment
 * partner's redemption terms — advance-booking windows, night restrictions,
 * household limits, the deposit — are a separate third-party document whose
 * licensing for reproduction under CharityWorks branding is unresolved, so
 * none of it is reproduced.
 *
 * That absence is handled rather than ignored. The closing paragraph states
 * that conditions apply and names the exclusions that stop "free" being read as
 * "costs nothing to use" — airfare, meals, taxes, resort fees — and says the
 * current terms are provided in writing to pass on with the certificates. A
 * page that promised an unconditional free holiday would generate complaints to
 * the nonprofit rather than to CharityWorks, which is the outcome worth
 * avoiding while the licensing question is open.
 *
 * The illustration is the existing Viva Las Vegas catalog photograph. There are
 * no photographs of the certificates themselves anywhere in the project.
 *
 * Idempotent, and snapshots both documents into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "@/content/schema";
import { faqsPage } from "@/content/pages/faqs";

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

/** Where the hero card should point once the answer exists. */
const OFFER_HREF = "/faqs#free-vacation-program";
const OFFER_CUE = "What is this? →";

async function read(slug: string): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`  could not read ${slug}: ${error?.message ?? "no row"}`);
    process.exit(1);
  }
  return data.data as Record<string, unknown>;
}

async function write(slug: string, next: unknown, note: string, before: unknown) {
  const history = await db
    .from("content_revisions")
    .insert({ entity: "page", entity_id: slug, data: before, note });
  if (history.error) {
    console.error(`  could not record history for ${slug}: ${history.error.message}`);
    process.exit(1);
  }
  const saved = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (saved.error) {
    console.error(`  could not save ${slug}: ${saved.error.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log("\nExplaining the free vacation program on /faqs\n");

  /* ---- 1. The answer ---- */
  const faqs = await read("faqs");
  const nextFaqs = { ...faqs, incentive: faqsPage.incentive };

  const parsedFaqs = pageSchemas.faqs.safeParse(nextFaqs);
  if (!parsedFaqs.success) {
    console.error("  /faqs would not be valid content:");
    for (const issue of parsedFaqs.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const faqsAlready =
    JSON.stringify(faqs.incentive) === JSON.stringify(faqsPage.incentive);
  if (faqsAlready) {
    console.log("  skip  /faqs already carries the answer");
  } else {
    await write(
      "faqs",
      nextFaqs,
      "Before the free vacation program was explained",
      faqs
    );
    console.log(`  /faqs   <- "${faqsPage.incentive?.heading}"`);
    console.log(`             ${faqsPage.incentive?.image.src}`);
  }

  /* ---- 2. The hero card ---- */
  const home = await read("home");
  const hero = (home.hero ?? {}) as Record<string, unknown>;
  const offer = hero.offer as Record<string, unknown> | undefined;

  if (!offer) {
    console.log("\n  note  the home hero has no offer card, so nothing to repoint\n");
    return;
  }

  if (offer.href === OFFER_HREF) {
    console.log("  skip  the hero card already points at the answer\n");
    return;
  }

  const wasHref = offer.href;
  const nextHome = {
    ...home,
    hero: { ...hero, offer: { ...offer, href: OFFER_HREF, cue: OFFER_CUE } },
  };

  const parsedHome = pageSchemas.home.safeParse(nextHome);
  if (!parsedHome.success) {
    console.error("  the home page would not be valid content:");
    for (const issue of parsedHome.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  await write(
    "home",
    nextHome,
    "Before the hero card was pointed at the free vacation answer",
    home
  );
  console.log(`  hero    ${wasHref}  ->  ${OFFER_HREF}`);
  console.log(`          cue: "${OFFER_CUE}"`);
  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
