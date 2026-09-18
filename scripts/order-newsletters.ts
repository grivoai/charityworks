/**
 * Puts the newsletter issues back in order, each title with its own button.
 *
 *     npm run order:newsletters
 *
 * The issues block is three columns of entries, and every issue is TWO entries
 * — a Text piece for the title and a Button piece for the PDF. The admin's
 * drag-to-reorder moves one entry at a time within one column, which is the
 * right tool for a list and the wrong one for this: the client dragged the
 * three titles in the last column to the top and their buttons stayed where
 * they were, so the column read title, title, title, button, button, button
 * with nothing under the right heading. She was trying to get the issues into
 * chronological order, which needs entries to cross columns, and drag cannot
 * do that at all.
 *
 * This regroups by issue and lays them out oldest first, left to right — the
 * order she asked for — three issues per column. The entries themselves are
 * kept as they are, so any wording she has edited survives; only their order
 * changes.
 *
 * Idempotent, and snapshots the page into `content_revisions` first.
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

/** The client's own numbering, oldest first. `4a` and `6a` are companion pieces. */
const ORDER = ["1", "2", "3", "4", "4a", "5", "6", "6a", "7"];

const ISSUE_ID = /^item-newsletter-(\w+)-(title|link)$/;

type Entry = Record<string, unknown> & { id: string };

async function main() {
  console.log("\nOrdering the newsletter issues\n");

  const page = await db
    .from("custom_pages")
    .select("data")
    .eq("slug", "newsletters")
    .single();
  if (page.error || !page.data) {
    console.error(`  could not read /newsletters: ${page.error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = page.data.data as Record<string, unknown>;
  const blocks = (doc.blocks ?? []) as Array<Record<string, unknown>>;
  const block = blocks.find((b) => b.id === "block-newsletters-issues");
  if (!block || block.type !== "columns") {
    console.error("  the issues block is missing — nothing to order");
    process.exit(1);
  }

  const columns = block.columns as Array<{ id: string; items: Entry[] }>;
  const entries = columns.flatMap((column) => column.items);

  /* Group by issue number. Anything not shaped as an issue entry is a piece
     the client added by hand; those are kept, appended to the last column so
     nothing she wrote disappears. */
  const byIssue = new Map<string, { title?: Entry; link?: Entry }>();
  const extras: Entry[] = [];
  for (const entry of entries) {
    const match = ISSUE_ID.exec(entry.id);
    if (!match) {
      extras.push(entry);
      continue;
    }
    const [, num, part] = match;
    const issue = byIssue.get(num) ?? {};
    issue[part as "title" | "link"] = entry;
    byIssue.set(num, issue);
  }

  const missing = ORDER.filter((num) => !byIssue.get(num)?.title || !byIssue.get(num)?.link);
  if (missing.length > 0) {
    console.error(`  issues without both a title and a button: ${missing.join(", ")}`);
    process.exit(1);
  }
  const unknown = [...byIssue.keys()].filter((num) => !ORDER.includes(num));
  if (unknown.length > 0) {
    console.error(`  issues not in the known order: ${unknown.join(", ")}`);
    process.exit(1);
  }

  const ordered = ORDER.flatMap((num) => {
    const issue = byIssue.get(num)!;
    return [issue.title!, issue.link!];
  });

  const perColumn = Math.ceil(ORDER.length / columns.length) * 2;
  const nextColumns = columns.map((column, index) => ({
    ...column,
    items: [
      ...ordered.slice(index * perColumn, (index + 1) * perColumn),
      ...(index === columns.length - 1 ? extras : []),
    ],
  }));

  const nextBlock = { ...block, columns: nextColumns };
  const next = {
    ...doc,
    blocks: blocks.map((b) => (b.id === block.id ? nextBlock : b)),
  };

  const parsed = customPageSchema.safeParse(next);
  if (!parsed.success) {
    console.error("  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  if (JSON.stringify(next) === JSON.stringify(doc)) {
    console.log("  skip  the issues are already in order\n");
    return;
  }

  for (const column of nextColumns) {
    console.log(
      `  ${column.id}: ${column.items
        .map((item) => item.id.replace("item-newsletter-", ""))
        .join(" | ")}`
    );
  }

  const history = await db.from("content_revisions").insert({
    entity: "custom-page",
    entity_id: "newsletters",
    data: doc,
    note: "Before the issues were put in order, each title with its own button",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("custom_pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "newsletters");
  if (write.error) {
    console.error(`  could not save /newsletters: ${write.error.message}`);
    process.exit(1);
  }

  console.log("\n  /newsletters reordered, oldest first. Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
