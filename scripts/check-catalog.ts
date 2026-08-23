/**
 * Proves that editing the catalog cannot lose anything.
 *
 * The pages editor has one invariant worth checking — a save that changes
 * nothing must change nothing. The catalog has that one and a second, sharper
 * one, because a category is taken apart into three tables on the way back in:
 *
 *   1. NO-OP ROUND TRIP. Real content through the same coercion a save
 *      performs, and the result must be identical. If it is, saving without
 *      editing cannot drop a field.
 *
 *   2. NO ID IS EVER DESTROYED. `?interest=` carries lot ids and
 *      `resolveInterest()` looks them up, so a deleted row turns a link in a
 *      circulating email into an untyped enquiry — it still arrives, but
 *      nobody can tell what it was about. Removing a lot must therefore plan an
 *      ARCHIVE, never a delete, and the plan for an unchanged category must
 *      archive nothing at all.
 *
 * Runs against the real database, because the shape being checked is the one
 * assembled from real rows.
 *
 *   npm run check:catalog
 */

import { readFileSync } from "node:fs";

import { auctionItemSchema } from "@/content/schema";
import type { AuctionItem } from "@/content/types";
import type { FieldNode } from "@/lib/admin/field-node";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForCategory } from "@/lib/admin/locks";
import { coerceToTree, stableStringify } from "@/lib/admin/coerce";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { getServiceClient } from "@/lib/supabase";
import {
  CategoryWriteError,
  planCategoryWrite,
} from "@/lib/admin/catalog-write";

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

function survey(node: FieldNode, path: string, out: { fields: number; locked: string[] }): void {
  if (node.locked) out.locked.push(path);
  switch (node.kind) {
    case "object":
      for (const { key, node: child } of node.fields) {
        survey(child, path ? `${path}.${key}` : key, out);
      }
      break;
    case "array":
      if (node.fixedLength) out.locked.push(`${path} (fixed length)`);
      survey(node.element, `${path}.*`, out);
      break;
    case "opaque":
      fail(`"${path}" has no input, so it cannot be edited`);
      break;
    case "hidden":
      break;
    default:
      if (!node.hideInForm) out.fields += 1;
  }
}

/** Every lot id in a category. */
function itemIds(category: AuctionItem): string[] {
  return category.groups.flatMap((g) => g.items.map((i) => i.id));
}

async function main(): Promise<void> {
  console.log("Checking the catalog editor\n");

  const categories = await supabaseContentSource.getAuctionCategories();
  const tree = buildFieldTree(auctionItemSchema, locksForCategory());

  const out = { fields: 0, locked: [] as string[] };
  survey(tree, "", out);

  let totalLots = 0;

  for (const category of categories) {
    const lots = itemIds(category);
    totalLots += lots.length;

    /* 1. A save that changes nothing must leave every ROW untouched.
     *
     * Compared at the row level rather than the document level, because the
     * two are not the same question. The assembler omits `details` when a lot
     * has none, while the form's coercion produces `[]` — a difference in how
     * the same value is written down, since the column defaults to `[]`. What
     * actually matters is whether an unchanged save would write a different
     * row, and that is what this asks. */
    const roundTripped = coerceToTree(category, tree) as AuctionItem;
    const parsedTrip = auctionItemSchema.safeParse(roundTripped);
    if (parsedTrip.success) {
      const plan = planCategoryWrite(parsedTrip.data as AuctionItem, category);
      const stored = await getServiceClient()
        .from("catalog_items")
        .select("id, group_id, name, description, image_src, image_alt, note, details, position")
        .eq("published", true)
        .in("group_id", category.groups.map((g) => g.id));

      const byId = new Map(
        (stored.data ?? []).map((row: Record<string, unknown>) => [row.id as string, row])
      );

      for (const item of plan.items) {
        const row = byId.get(item.id);
        if (!row) {
          fail(`${category.slug}: lot "${item.id}" is in the form but not in the database`);
          continue;
        }
        for (const key of ["name", "description", "image_src", "image_alt", "note", "position"] as const) {
          if (stableStringify(row[key] ?? null) !== stableStringify(item[key] ?? null)) {
            fail(
              `${category.slug}: an unchanged save would rewrite ${item.id}.${key} — ` +
                `${JSON.stringify(row[key])} becomes ${JSON.stringify(item[key])}`
            );
          }
        }
        if (stableStringify(row.details ?? []) !== stableStringify(item.details ?? [])) {
          fail(`${category.slug}: an unchanged save would rewrite ${item.id}.details`);
        }
      }
    }

    const parsed = parsedTrip;
    if (!parsed.success) {
      fail(
        `${category.slug}: the round trip no longer validates — ` +
          parsed.error.issues
            .slice(0, 2)
            .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
            .join("; ")
      );
    }

    /* 2. That same save must plan to retire nothing. */
    try {
      const plan = planCategoryWrite(roundTripped, category);
      if (plan.archive.length > 0) {
        fail(
          `${category.slug}: an unchanged save would retire ${plan.archive.length} ` +
            `lot(s): ${plan.archive.slice(0, 3).join(", ")}`
        );
      }
      if (plan.created.length > 0) {
        fail(`${category.slug}: an unchanged save would create ${plan.created.length} lot(s)`);
      }
      if (plan.items.length !== lots.length) {
        fail(
          `${category.slug}: the plan writes ${plan.items.length} lots but the ` +
            `category has ${lots.length}`
        );
      }
    } catch (error) {
      fail(`${category.slug}: an unchanged save was refused — ${(error as Error).message}`);
    }

    /* 3. Removing a lot must archive it, never drop it. */
    if (lots.length > 0) {
      const withoutOne: AuctionItem = {
        ...category,
        groups: category.groups.map((group, index) =>
          index === category.groups.findIndex((g) => g.items.length > 0)
            ? { ...group, items: group.items.slice(1) }
            : group
        ),
      };
      const removed = itemIds(category).find((id) => !itemIds(withoutOne).includes(id));
      const plan = planCategoryWrite(withoutOne, category);
      if (!removed || !plan.archive.includes(removed)) {
        fail(`${category.slug}: removing a lot did not plan to retire it`);
      }
    }

    /* 4. Removing a group must be refused outright. */
    if (category.groups.length > 0) {
      const withoutGroup: AuctionItem = {
        ...category,
        groups: category.groups.slice(1),
      };
      let refused = false;
      try {
        planCategoryWrite(withoutGroup, category);
      } catch (error) {
        refused = error instanceof CategoryWriteError;
      }
      if (!refused) {
        fail(
          `${category.slug}: removing a group was allowed — it would cascade ` +
            `and delete that group's lots`
        );
      }
    }

    /* 5. Dragging a lot into a new place must reach the site.
     *
     * Lots have been reorderable by dragging since page blocks were: the drag
     * lives in `ArrayField`, which is generic over every list in every
     * schema-derived form, so nothing about it is specific to the catalog.
     * What is specific — and what nothing asserted until now — is the CONTRACT
     * underneath it. Three files have to agree and none of them mentions the
     * others: the form's array order becomes `position` in the write plan, and
     * the assembler reads lots back in `position` order.
     *
     * Break the middle link and nothing looks wrong. The editor still drags,
     * the save still succeeds, the history still records it — and the site
     * renders the old order forever. That is the failure this catches. */
    const reorderable = category.groups.find((group) => group.items.length >= 2);
    if (reorderable) {
      const [first, second, ...rest] = reorderable.items;
      const dragged: AuctionItem = {
        ...category,
        groups: category.groups.map((group) =>
          group.id === reorderable.id
            ? { ...group, items: [second, first, ...rest] }
            : group
        ),
      };

      const plan = planCategoryWrite(dragged, category);
      const written = plan.items
        .filter((item) => item.group_id === reorderable.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => item.id);
      const expected = [second.id, first.id, ...rest.map((item) => item.id)];

      if (stableStringify(written) !== stableStringify(expected)) {
        fail(
          `${category.slug}: dragging a lot did not change the rows that would ` +
            `be written — expected ${expected.slice(0, 3).join(", ")}, ` +
            `got ${written.slice(0, 3).join(", ")}`
        );
      }
      if (plan.archive.length > 0 || plan.created.length > 0) {
        fail(`${category.slug}: reordering lots planned to retire or create one`);
      }
    }

    console.log(
      `  ok    ${category.slug.padEnd(22)} ${String(lots.length).padStart(3)} lots, ` +
        `${category.groups.length} group${category.groups.length === 1 ? "" : "s"}`
    );
  }

  console.log(
    `\n  ${out.fields} editable fields per category, ` +
      `${out.locked.length} locked (${out.locked.join(", ")})`
  );
  console.log(`  ${categories.length} categories, ${totalLots} lots`);

  /* The other two links in the ordering chain, read from the source.
   *
   * A plan that carries the order is worth nothing if the read ignores it, and
   * a contract that holds is worth nothing if the handle that exercises it has
   * gone. Neither is reachable from the data, so both are asserted the way
   * check-admin-nav asserts its frame: from the file that has to keep them. */
  const assembler = readFileSync("src/lib/content-source-supabase.ts", "utf8");
  const itemsRead = assembler.slice(assembler.indexOf('.from("catalog_items")'));
  if (!/\.order\("position"\)/.test(itemsRead.slice(0, 400))) {
    fail(
      "lots are no longer read in `position` order, so dragging one would " +
        "change the stored rows and nothing on the site"
    );
  }

  const form = readFileSync("src/components/admin/SchemaFields.tsx", "utf8");
  if (!/draggable=\{armed === index\}/.test(form)) {
    fail(
      "list entries are no longer draggable, so lots can only be reordered by " +
        "retyping them"
    );
  }

  /* The locks that protect the ids must actually be in place. */
  for (const expected of ["slug", "seo.path", "groups (fixed length)"]) {
    if (!out.locked.includes(expected)) {
      fail(`the lock on "${expected}" is missing`);
    }
  }

  if (failures > 0) {
    console.error(`\n  ${failures} check(s) failed\n`);
    process.exitCode = 1;
    return;
  }
  console.log("  All checks passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
