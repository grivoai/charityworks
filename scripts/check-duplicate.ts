/**
 * Keeps a lot's Duplicate button making the copy the client was promised.
 *
 *   - the copy sits directly below the original, in the same section
 *   - every field is carried over except the brochure, which belongs to the
 *     original; the name starts "Copy of"
 *   - the id is new, minted the way Add mints one, and never one already in
 *     the form — forced here by making the random source repeat itself
 *   - Add and the block type picker re-mint on a clash the same way
 *   - the original is untouched, so Discard (the form going back to what it
 *     had) loses nothing
 *   - the copy passes the schema and the save planner as a new lot, with
 *     nothing archived
 *   - only the catalog's lots get the button
 *
 *   npm run check:duplicate
 * (the react-server condition lets the schema's `server-only` neighbours load.)
 */
import { readFileSync } from "node:fs";

import { auctionItemSchema } from "@/content/schema";
import type { AuctionItem } from "@/content/types";
import { auctionItems } from "@/content/collections/auction-items";
import type { ArrayNode, FieldNode } from "@/lib/admin/field-node";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForCategory } from "@/lib/admin/locks";
import { collectIds, withFreshId } from "@/lib/admin/entry-id";
import {
  LOT_DUPLICATE,
  allowDuplicate,
  duplicateEntry,
} from "@/lib/admin/duplicate";
import { planCategoryWrite } from "@/lib/admin/catalog-write";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type Lot = Record<string, unknown>;

/**
 * A lot with every optional field set, so "every field is copied" is tested
 * on fields that are actually there. Built on a real seed category.
 */
const base = clone(auctionItems.find((c) => c.groups.length >= 2) ?? auctionItems[0]);
const fullLot = {
  ...clone(base.groups[0].items[0]),
  note: "A note.\nOn two lines.",
  details: [
    { label: "Size", value: "24 × 30 in" },
    { label: "Signed", value: "Hand-signed" },
  ],
  affordableTier: true,
  documentSlug: "original-brochure",
};
base.groups[0].items.splice(0, 1, fullLot as never);
const current: AuctionItem = clone(base);
const groupIndex = 0;
const lotIndex = 0;
const listPath = `groups.${groupIndex}.items`;

console.log("\nThe copy");
{
  const form = clone(current);
  const items = form.groups[groupIndex].items as unknown as Lot[];
  const before = clone(items);
  const taken = collectIds(form);

  const made = duplicateEntry(items, lotIndex, listPath, LOT_DUPLICATE, taken);
  const copy = made.items[lotIndex + 1] as Lot;
  const original = made.items[lotIndex] as Lot;

  check(made.items.length === items.length + 1, "the list grows by one");
  check(original === items[lotIndex], "the original stays where it was");
  check(copy.id === made.id, "the copy is directly below the original");
  check(
    made.items.slice(lotIndex + 2).every((lot, i) => lot === items[lotIndex + 1 + i]),
    "the lots after it shift down by one, in order"
  );

  check(copy.name === `Copy of ${fullLot.name}`, `named "Copy of ${fullLot.name}"`);
  check(!("documentSlug" in copy), "the brochure is left off");
  for (const key of Object.keys(fullLot)) {
    if (key === "id" || key === "name" || key === "documentSlug") continue;
    check(
      JSON.stringify(copy[key]) === JSON.stringify((fullLot as Lot)[key]),
      `${key} is copied`
    );
  }
  check(
    Object.keys(copy).sort().join() ===
      Object.keys(fullLot).filter((k) => k !== "documentSlug").sort().join(),
    "no field added or lost besides the brochure"
  );

  check(typeof copy.id === "string" && /^item-[a-z0-9]{1,6}$/.test(copy.id as string),
    `the id is minted like Add's ("${copy.id}")`);
  check(!taken.has(copy.id as string), "the id is in no other entry in the form");

  // Not shared: changing the copy's picture or details cannot reach the original.
  (copy.image as Lot).src = "/changed.jpg";
  (copy.details as Lot[])[0].value = "changed";
  check(
    JSON.stringify(items) === JSON.stringify(before),
    "editing the copy leaves the original untouched (Discard loses nothing)"
  );
}

console.log("\nIds never collide");
{
  const realRandom = Math.random;
  const form = clone(current);
  const items = form.groups[groupIndex].items as unknown as Lot[];

  // The first mint is made to land on an id another group's lot already has.
  const victim = form.groups[1].items[0] as unknown as Lot;
  const forcedSuffix = "aaaaaa";
  victim.id = `item-${forcedSuffix}`;
  const sequence = [forcedSuffix, forcedSuffix, "bbbbbb"];
  // Math.random().toString(36).slice(2, 8) yields the suffix from this number.
  const asRandom = (suffix: string) => (parseInt(suffix, 36) + 0.5) / 36 ** 6;
  let calls = 0;
  Math.random = () => asRandom(sequence[Math.min(calls++, sequence.length - 1)]);
  try {
    const made = duplicateEntry(items, lotIndex, listPath, LOT_DUPLICATE, collectIds(form));
    check(made.id === "item-bbbbbb", "a minted id already in the form is re-minted");
    check(calls === 3, "minted until free (3 tries for 2 clashes)");

    calls = 0;
    const added = withFreshId({ id: "", name: "" }, listPath, collectIds(form)) as Lot;
    check(added.id === "item-bbbbbb", "Add re-mints the same way");

    calls = 0;
    const nested = withFreshId(
      { id: "", columns: [{ id: "" }, { id: "" }] },
      "blocks.1",
      new Set<string>()
    ) as { id: string; columns: Array<{ id: string }> };
    check(
      new Set([nested.id, ...nested.columns.map((c) => c.id)]).size === 3,
      "ids minted in one go never repeat each other"
    );
  } finally {
    Math.random = realRandom;
  }

  const ids = collectIds(current);
  const lotIds = current.groups.flatMap((g) => g.items.map((i) => i.id));
  check(
    lotIds.every((id) => ids.has(id)) && ids.has(current.groups[1].id),
    "collectIds sees every lot in every group, and the groups"
  );
}

console.log("\nSaving the copy");
{
  const form = clone(current);
  const items = form.groups[groupIndex].items as unknown as Lot[];
  const made = duplicateEntry(items, lotIndex, listPath, LOT_DUPLICATE, collectIds(form));
  form.groups[groupIndex].items = made.items as never;

  const parsed = auctionItemSchema.safeParse(form);
  check(parsed.success, "the category with the copy passes the schema");
  if (parsed.success) {
    const plan = planCategoryWrite(parsed.data as AuctionItem, current);
    check(
      plan.created.length === 1 && plan.created[0] === made.id,
      "the save creates exactly the copy"
    );
    check(plan.archive.length === 0, "and retires nothing");
    const row = plan.items.find((i) => i.id === made.id);
    check(row?.group_id === current.groups[groupIndex].id, "in the original's section");
    check(row?.document_slug === null, "with no brochure");
    const originalRow = plan.items.find((i) => i.id === fullLot.id);
    check(
      originalRow?.document_slug === "original-brochure" &&
        row?.position === (originalRow?.position ?? -2) + 1,
      "the original keeps its brochure, and the copy is the next position"
    );
  }
}

console.log("\nWhere the button is");
{
  const tree = allowDuplicate(
    buildFieldTree(auctionItemSchema, locksForCategory()),
    "groups.*.items",
    LOT_DUPLICATE
  );
  const lists: Array<{ path: string; node: ArrayNode }> = [];
  const walk = (node: FieldNode, path: string) => {
    if (node.kind === "object") node.fields.forEach((f) => walk(f.node, path ? `${path}.${f.key}` : f.key));
    if (node.kind === "array") {
      lists.push({ path, node });
      walk(node.element, `${path}.*`);
    }
  };
  walk(tree, "");
  const withButton = lists.filter((l) => l.node.duplicate).map((l) => l.path);
  check(
    withButton.length === 1 && withButton[0] === "groups.*.items",
    `only the lots list has it (${withButton.join(", ") || "none"})`
  );
  check(
    JSON.parse(JSON.stringify(tree)) !== null &&
      JSON.stringify(tree).includes(LOT_DUPLICATE.notice),
    "the rule survives serialising the tree to the browser"
  );

  let threw = false;
  try {
    allowDuplicate(buildFieldTree(auctionItemSchema, locksForCategory()), "groups.*.lots", LOT_DUPLICATE);
  } catch {
    threw = true;
  }
  check(threw, "a path that names no list fails loudly");

  const page = readFileSync("app/(admin)/admin/catalog/[slug]/edit/page.tsx", "utf8");
  check(
    /allowDuplicate\(\s*buildFieldTree\(auctionItemSchema, locksForCategory\(\)\),\s*"groups\.\*\.items",\s*LOT_DUPLICATE/.test(page),
    "the category editor turns it on for groups.*.items"
  );
  const fields = readFileSync("src/components/admin/SchemaFields.tsx", "utf8");
  check(
    fields.includes("editable && node.duplicate && ("),
    "the form draws the button only for a list with a rule"
  );
  check(
    fields.includes("collectIds(form)") &&
      fields.includes("newEntry(node.template, path, form)") &&
      fields.includes("newEntry(next.template, path, form)"),
    "Add, Duplicate and the type picker all mint against the form's ids"
  );
}

console.log(failures ? `\n${failures} failed\n` : "\nall passed\n");
process.exit(failures ? 1 : 0);
