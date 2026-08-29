/**
 * Makes /contact say what it is for.
 *
 *     npm run migrate:contact-purpose
 *
 * THE DEFECT. Every call to action on the site points at /contact — the nav
 * button ("Get Your Free Plan"), and the closing band on /auction-info, /faqs
 * and /testimonials ("Get Your Free Fundraising Plan"). The page's own title
 * agrees: "Get a Free Fundraising Plan for Your Nonprofit". Its heading did
 * not. It read "Reserve this item for my event", under the eyebrow "Request an
 * Item", above a button labelled "Reserve This Item".
 *
 * So a development director who read the FAQ, decided to engage, and clicked
 * "Get Your Free Fundraising Plan" arrived at a form asking her to reserve a
 * specific item she had never chosen, and to confirm it with a button that
 * said so. That is the only conversion endpoint on the site.
 *
 * The wording came from the item-request flow, which reaches the same page with
 * `?interest=<slug>` to preselect a lot. That flow still works and is unchanged
 * — the interest field is preselected exactly as before. What changes is the
 * page's own voice, which now matches the promise that sent people to it and
 * the title it already had. The item case is the variant; the plan request is
 * the page.
 *
 * Content only. No code change: the heading, eyebrow and button label are all
 * fields on the stored contact document.
 *
 * Idempotent, and snapshots the document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "@/content/schema";

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

/** What each field should say, and what it said before. */
const CHANGES = {
  heading: "Get your free fundraising plan",
  eyebrow: "Free Fundraising Plan",
  submitLabel: "Get My Free Plan",
};

async function main() {
  console.log("\nAligning /contact with its own title and every CTA that points at it\n");

  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", "contact")
    .single();
  if (error || !data) {
    console.error(`  could not read the contact page: ${error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = data.data as Record<string, unknown>;
  const intro = (doc.intro ?? {}) as Record<string, unknown>;
  const form = (doc.form ?? {}) as Record<string, unknown>;

  const wasHeading = doc.heading as string;
  const wasEyebrow = intro.eyebrow as string;
  const wasSubmit = form.submitLabel as string;

  const next = {
    ...doc,
    heading: CHANGES.heading,
    intro: { ...intro, eyebrow: CHANGES.eyebrow },
    form: { ...form, submitLabel: CHANGES.submitLabel },
  };

  const parsed = pageSchemas.contact.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (
    wasHeading === CHANGES.heading &&
    wasEyebrow === CHANGES.eyebrow &&
    wasSubmit === CHANGES.submitLabel
  ) {
    console.log("  skip  /contact already says what it is for\n");
    return;
  }

  const history = await db.from("content_revisions").insert({
    entity: "page",
    entity_id: "contact",
    data: doc,
    note: "Before the contact page was aligned with the plan request it advertises",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "contact");
  if (write.error) {
    console.error(`  could not save the contact page: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  heading      "${wasHeading}"`);
  console.log(`            -> "${CHANGES.heading}"`);
  console.log(`  eyebrow      "${wasEyebrow}"`);
  console.log(`            -> "${CHANGES.eyebrow}"`);
  console.log(`  button       "${wasSubmit}"`);
  console.log(`            -> "${CHANGES.submitLabel}"`);
  console.log("\n  The ?interest= item flow is untouched.");
  console.log("  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
