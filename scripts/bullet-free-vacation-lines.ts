/**
 * Turns the six "Giving it away…" suggestions in the FAQs free vacation text
 * into a bulleted list, by putting "- " in front of each.
 *
 *     npm run migrate:free-vacation-bullets            (dry run: shows the change)
 *     npm run migrate:free-vacation-bullets -- --write (makes it)
 *
 * The field is the FAQs page's `incentive.body`. Since #35 a line starting
 * "- " is drawn as a list item, and bullet lines separated by blank lines are
 * one list, which is how these six are stored.
 *
 * Nothing else in the text moves: "- " goes in after each line's indentation
 * and before its words, and every other character is kept as stored. The
 * script refuses to write unless all six lines are there exactly as below,
 * once each and not already bulleted, so it never overwrites wording the
 * client has edited in the admin. The write is also pinned to the row's
 * `updated_at`, so an admin save between the read and the write wins and this
 * writes nothing.
 *
 * Snapshots the stored page into `content_revisions` before writing. The live
 * page reads the change on the next deploy, or the next save of the FAQs page
 * in the admin.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "@/content/schema";

const LINES = [
  "Giving it away with every ticket purchase",
  "Giving it away with every Silent Auction bid",
  "Giving it away with every maximum Raffle buy-in",
  "Giving it away to every donor who makes a pledge or fund-a-need donation",
  'Giving it away as a "Thank You" to every volunteer and/or sponsor',
  'OR creating a way to use it as a "Thank You" within the framework of your event',
];

const NOTE = 'Before "- " was added to the six free vacation suggestions';
const WRITE = process.argv.includes("--write");

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

function refuse(message: string): never {
  console.error(`\n  REFUSED  ${message}\n  Nothing was written.\n`);
  process.exit(1);
}

/** The body with "- " added to the six lines, or the reason it can't be. */
function bulleted(body: string): string {
  const lines = body.split("\n");
  for (const wanted of LINES) {
    const at = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim() === wanted);
    if (at.length === 0) {
      const already = lines.some((line) => line.trim() === `- ${wanted}`);
      refuse(
        already
          ? `already bulleted: "${wanted}"`
          : `not found exactly as expected: "${wanted}"`
      );
    }
    if (at.length > 1) refuse(`found ${at.length} times: "${wanted}"`);
    const { line, index } = at[0];
    const indent = line.slice(0, line.indexOf(wanted));
    lines[index] = `${indent}- ${line.slice(indent.length)}`;
  }
  const next = lines.join("\n");

  // Belt and braces: taking the six "- " back out must give the stored text.
  const restored = LINES.reduce(
    (text, wanted) => text.replace(`- ${wanted}`, wanted),
    next
  );
  if (restored !== body) refuse("the change touched more than the six lines");
  return next;
}

async function main() {
  console.log(
    `\nBulleting the six free vacation suggestions (FAQs incentive.body)` +
      `${WRITE ? "" : " — DRY RUN"}\n`
  );

  const row = await db
    .from("pages")
    .select("data, updated_at")
    .eq("slug", "faqs")
    .single();
  if (row.error || !row.data) {
    refuse(`could not read the FAQs page: ${row.error?.message ?? "no row"}`);
  }
  const doc = row.data.data as Record<string, unknown>;
  const incentive = doc.incentive as Record<string, unknown> | undefined;
  const body = incentive?.body;
  if (typeof body !== "string") refuse("the FAQs page has no incentive.body text");

  const nextBody = bulleted(body);
  const next = { ...doc, incentive: { ...incentive, body: nextBody } };
  const parsed = pageSchemas.faqs.safeParse(next);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    refuse("the FAQs page would not be valid content");
  }

  console.log(`  stored as of ${row.data.updated_at}\n`);
  console.log("  BEFORE");
  console.log(JSON.stringify(body));
  console.log("\n  AFTER");
  console.log(JSON.stringify(nextBody));
  console.log(
    `\n  ${body.length} -> ${nextBody.length} characters ` +
      `(+${nextBody.length - body.length}, six "- " added)`
  );

  // The write is pinned to this timestamp; prove the pin finds the row now,
  // so a refusal on the real run can only mean someone else saved.
  const pin = await db
    .from("pages")
    .select("slug")
    .eq("slug", "faqs")
    .eq("updated_at", row.data.updated_at);
  if (pin.error || pin.data?.length !== 1) {
    refuse("could not pin the write to the stored row's updated_at");
  }

  if (!WRITE) {
    console.log("  the write guard finds the row as read");
    console.log("\n  Dry run. Nothing was written. Add --write to make the change.\n");
    return;
  }

  const snap = await db
    .from("content_revisions")
    .insert({ entity: "page", entity_id: "faqs", data: doc, note: NOTE });
  if (snap.error) refuse(`could not record history: ${snap.error.message}`);
  console.log("\n  snapshot saved to content_revisions");

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "faqs")
    .eq("updated_at", row.data.updated_at)
    .select("slug");
  if (write.error) refuse(`could not save the FAQs page: ${write.error.message}`);
  if (!write.data?.length) {
    refuse("the FAQs page was saved by someone else since it was read");
  }
  console.log("  FAQs page saved");
  console.log("\n  Deploy the site, or save the FAQs page in the admin, to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
