/**
 * Puts the donation-matching video on the stored FAQs document.
 *
 *     npm run migrate:faq-video
 *
 * `faqs.video` is optional in the schema, so this is not a shape migration the
 * way the hero one was — the stored document parses with or without it, and
 * nothing breaks if this is never run. It is here because the video is content
 * and content lives in the database; editing `src/content/pages/faqs.ts` alone
 * changes the seed fixture and not the site.
 *
 * The URL is validated through `faqsPageSchema` before it is written, which
 * runs the same host allowlist the page uses to decide whether to render a
 * frame at all — so a value this stores is a value that will render.
 *
 * Idempotent, and snapshots the document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "../src/content/schema";
import { faqsPage } from "../src/content/pages/faqs";

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
  console.log("\nAdding the donation-matching video to /faqs\n");

  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", "faqs")
    .single();
  if (error || !data) {
    console.error(`  could not read the faqs page: ${error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = data.data as Record<string, unknown>;
  const stored = doc.video as { embedUrl?: string } | undefined;

  if (stored?.embedUrl === faqsPage.video?.embedUrl) {
    console.log("  skip  the video is already on the page\n");
    return;
  }

  const next = { ...doc, video: faqsPage.video };
  const parsed = pageSchemas.faqs.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db
    .from("content_revisions")
    .insert({
      entity: "page",
      entity_id: "faqs",
      data: doc,
      note: "Before the donation-matching video was added",
    });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "faqs");
  if (write.error) {
    console.error(`  could not save the faqs page: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  done  "${faqsPage.video?.heading}"`);
  console.log(`        ${faqsPage.video?.embedUrl}`);
  console.log("  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
