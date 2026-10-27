/**
 * Writes the auction planner's question wording into the stored page.
 *
 *     npm run migrate:planner-wording              # writes
 *     npm run migrate:planner-wording -- --dry-run # says what it would write
 *
 * Until now the questions, help lines and answer labels were written into
 * `planner-rules.ts`. They are a field on the Auction planner page now
 * (`questions`), defaulting to exactly that wording, so the stored record
 * parses the same with or without this — the site does not depend on it
 * having run. It is here because content lives in the database: once the
 * wording is stored, the admin form shows it as the page's own, and history
 * has a version to go back to.
 *
 * The wording is today's, word for word (`DEFAULT_PLANNER_QUESTIONS`), and
 * the scoring is untouched — it stays in code and is found by id — so the
 * quiz asks the same questions and recommends the same categories.
 *
 * Never overwrites wording that is already stored: if `questions` is there
 * and differs, someone has edited it, and this stops rather than undo that.
 * Validated through the page schema, which also checks the wording lines up
 * with the scoring, before anything is written. Idempotent, and snapshots the
 * document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "../src/content/schema";
import { DEFAULT_PLANNER_QUESTIONS } from "../src/content/default-wording";

const dryRun = process.argv.includes("--dry-run");

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
  console.log(
    `\nStoring the auction planner's question wording${dryRun ? " (dry run)" : ""}\n`
  );

  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", "auction-planner")
    .single();
  if (error || !data) {
    console.error(`  could not read the planner page: ${error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = data.data as Record<string, unknown>;
  const wording = structuredClone(DEFAULT_PLANNER_QUESTIONS);

  if (doc.questions !== undefined) {
    const parsedStored = pageSchemas["auction-planner"].safeParse(doc);
    const same =
      parsedStored.success &&
      JSON.stringify(parsedStored.data.questions) === JSON.stringify(wording);
    if (same) {
      console.log("  skip  the wording is already stored\n");
      return;
    }
    console.error(
      "  stop  the page already holds question wording that differs from the\n" +
        "        original — it has been edited, and this will not undo that.\n"
    );
    process.exit(1);
  }

  const next = { ...doc, questions: wording };
  const parsed = pageSchemas["auction-planner"].safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  for (const question of wording) {
    console.log(`  ${question.id.padEnd(10)} ${question.prompt}`);
    if (question.help) console.log(`  ${"".padEnd(10)} (${question.help})`);
    console.log(
      `  ${"".padEnd(10)} ${question.options.map((o) => o.label).join(" · ")}`
    );
  }

  if (dryRun) {
    console.log("\n  dry run: nothing written\n");
    return;
  }

  const history = await db.from("content_revisions").insert({
    entity: "page",
    entity_id: "auction-planner",
    data: doc,
    note: "Before the planner's question wording was stored on the page",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "auction-planner");
  if (write.error) {
    console.error(`  could not save the planner page: ${write.error.message}`);
    process.exit(1);
  }

  console.log("\n  stored. The quiz reads the same; it is now editable in the admin.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
