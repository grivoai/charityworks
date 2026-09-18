/**
 * Adds "Book a Call" to the ways to reach us, pointing at Ira's calendar.
 *
 *     npm run migrate:booking-channel
 *
 * The scheduling link has been on the site since August, but only on the
 * contact form's success state — a visitor saw it after sending an enquiry,
 * never before. The client asked for it on the contact page itself. The rows
 * under the contact heading are the right place: they are the list of ways to
 * get hold of Ira, and this is one. They render on the home page too, which
 * is fine — the calendar is not a secret.
 *
 * The URL is the same calendar `site.booking.url` embeds, with its own utm
 * pair so a booking from this row is distinguishable in Calendly from one
 * made through the form (`utm_medium=contact-form`).
 *
 * Idempotent: keyed on the row id, so re-running neither duplicates the row
 * nor overwrites wording the client has since changed in the admin.
 */
import { createClient } from "@supabase/supabase-js";

import { siteContentSchema } from "@/content/schema";

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

const SITE_ROW_ID = 1;

const CHANNEL = {
  id: "channel-book",
  icon: "calendar-check",
  label: "Book a Call",
  value: "Pick a time with Ira",
  href: "https://calendly.com/iraklein82/new-meeting?utm_source=website&utm_medium=contact-page",
};

async function main() {
  console.log("\nAdding the booking row to the contact channels\n");

  const row = await db
    .from("site_settings")
    .select("data")
    .eq("id", SITE_ROW_ID)
    .single();
  if (row.error || !row.data) {
    console.error(`  could not read the site record: ${row.error?.message ?? "no row"}`);
    process.exit(1);
  }

  const site = row.data.data as Record<string, unknown>;
  const contact = (site.contact ?? {}) as Record<string, unknown>;
  const channels = (contact.channels ?? []) as Array<{ id: string }>;

  if (channels.some((channel) => channel.id === CHANNEL.id)) {
    console.log("  skip  the booking row is already there\n");
    return;
  }

  const next = {
    ...site,
    contact: { ...contact, channels: [...channels, CHANNEL] },
  };

  const parsed = siteContentSchema.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "site",
    entity_id: String(SITE_ROW_ID),
    data: site,
    note: "Before the booking calendar joined the contact channels",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("site_settings")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("id", SITE_ROW_ID);
  if (write.error) {
    console.error(`  could not save the site record: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  added  "${CHANNEL.label}" -> ${CHANNEL.href}`);
  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
