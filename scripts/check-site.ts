/**
 * Proves that editing the site details cannot lose anything, and that the two
 * locked fields are actually locked.
 *
 * The site record is the one that renders on EVERY route — the wordmark, the
 * navigation, the phone number, the footer — so a save that drops a field does
 * not damage one page, it damages all of them. The same two invariants the
 * catalog check enforces apply here:
 *
 *   1. NO-OP ROUND TRIP. The stored document, pushed through the exact coercion
 *      a save performs, must come back identical. If it does, saving without
 *      editing cannot drop a field.
 *
 *   2. A LOCK IS A CONSTRAINT, NOT A DISABLED INPUT. The editor renders
 *      `nav.*.href` and `contact.phoneHref` read-only, but the browser is not
 *      the security boundary — a hand-made request can carry any value it
 *      likes. Coercion has to take those values from storage regardless of what
 *      was submitted, and this proves it does by submitting tampered ones.
 *
 * Plus the one derived field: changing the phone number must move the `tel:`
 * link with it, because the whole point of deriving it is that they cannot
 * drift apart.
 *
 * Runs against the real database, because the shape being checked is the one
 * assembled from the real row.
 *
 *   npm run check:site
 */

import { siteContentSchema } from "@/content/schema";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForSite } from "@/lib/admin/locks";
import { coerceToTree, stableStringify } from "@/lib/admin/coerce";
import { applySiteRules, derivePhoneHref } from "@/lib/admin/site-rules";
import { blankFor } from "@/lib/admin/schema-tree";
import type { FieldNode } from "@/lib/admin/field-node";
import { readSiteDocument } from "@/lib/admin/site-read";

/** Loose view of a field node; the tree is walked structurally here. */
type FieldFor = {
  kind?: string;
  fields?: { key: string; node: unknown }[];
  element?: unknown;
  fixedLength?: string;
  locked?: string;
};

let failures = 0;

function ok(message: string): void {
  console.log(`  ok    ${message}`);
}

function fail(message: string): void {
  failures++;
  console.error(`  FAIL  ${message}`);
}

function check(condition: boolean, message: string): void {
  condition ? ok(message) : fail(message);
}

/** A deep copy, so a mutation in one case cannot leak into the next. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function main(): Promise<void> {
  console.log("\nSite details\n");

  const stored = await readSiteDocument();
  if (stored === null) {
    fail("the site_settings row is missing — run `npm run seed`");
    process.exit(1);
  }

  /* ---- The stored row is valid ---- */
  const parsed = siteContentSchema.safeParse(stored);
  if (!parsed.success) {
    fail(
      "the stored row does not satisfy the schema: " +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")} ${i.message}`)
          .join("; ")
    );
    process.exit(1);
  }
  ok("the stored row satisfies the schema");

  const tree = buildFieldTree(siteContentSchema, locksForSite());

  /* ---- 1. No-op round trip ---- */
  const roundTripped = applySiteRules(coerceToTree(clone(stored), tree, stored));
  check(
    stableStringify(roundTripped) === stableStringify(stored),
    "saving without editing changes nothing"
  );

  /* ---- 2. Locks hold against a tampered submission ---- */
  const tampered = clone(parsed.data);
  const realHref = tampered.nav[0]?.href;
  const realPhoneHref = tampered.contact.phoneHref;

  tampered.nav[0].href = "https://evil.example/phished";
  tampered.contact.phoneHref = "tel:19005551234";

  const defended = applySiteRules(
    coerceToTree(tampered, tree, stored)
  ) as typeof tampered;

  check(
    defended.nav[0].href === realHref,
    `a submitted nav href is ignored (kept "${realHref}")`
  );
  check(
    defended.contact.phoneHref !== "tel:19005551234",
    "a submitted phoneHref is ignored"
  );

  /* ---- 3. The phone link follows the phone number ---- */
  const renumbered = clone(parsed.data);
  renumbered.contact.phone = "(415) 555-0142";
  const derived = applySiteRules(
    coerceToTree(renumbered, tree, stored)
  ) as typeof renumbered;

  check(
    derived.contact.phoneHref === "tel:4155550142",
    `changing the number moves the link with it (got "${derived.contact.phoneHref}")`
  );

  check(
    derivePhoneHref("+44 20 7946 0958", "tel:x") === "tel:+442079460958",
    "an international number keeps its +"
  );
  check(
    derivePhoneHref("call us", "tel:9252506968") === "tel:9252506968",
    "a number with no digits keeps the stored link rather than making a broken one"
  );

  /* ---- 4. Every "Add" button in this document can actually save ----

     The failure this catches is specific and was live: a list open for adding,
     whose new entry contains a LOCKED required field. Coercion restores locked
     values from storage, a brand-new entry has nothing in storage to restore
     from, so the row saves as empty and the schema rejects it — with no field
     on screen to fix, because the field is locked. An Add button that cannot
     succeed reads as the save being broken.

     So: for every addable list, append what the editor would append, fill the
     fields a person could actually reach, and require the result to save. */
  const addable: { path: string; node: FieldFor }[] = [];
  const collect = (node: unknown, path: string) => {
    const n = node as FieldFor;
    if (n.kind === "array" && !n.fixedLength) addable.push({ path, node: n });
    if (n.kind === "object") for (const f of n.fields ?? []) collect(f.node, path ? `${path}.${f.key}` : f.key);
    if (n.kind === "array" && n.element) collect(n.element, `${path}[]`);
  };
  collect(tree, "");

  for (const { path, node } of addable) {
    // Skip nested lists: exercising them needs a parent entry that does not
    // exist yet, and the top-level pass already covers the shape.
    if (path.includes("[]")) continue;

    const draft = clone(parsed.data) as Record<string, unknown>;
    const target = path.split(".").reduce<any>((o, k) => o?.[k], draft);
    if (!Array.isArray(target)) continue;

    const entry = blankFor(node.element as FieldNode) as Record<string, unknown>;
    // Fill everything a person could reach: unlocked, non-object leaves.
    for (const field of (node.element as FieldFor).fields ?? []) {
      const leaf = field.node as FieldFor;
      if (leaf.locked) continue;
      if (leaf.kind === "string") entry[field.key] = "Test value";
      if (leaf.kind === "number") entry[field.key] = 1;
    }
    target.push(entry);

    const saved = applySiteRules(coerceToTree(draft, tree, stored));
    const result = siteContentSchema.safeParse(saved);
    check(
      result.success,
      `"Add" on ${path} produces a row that saves` +
        (result.success
          ? ""
          : ` — BLOCKED at ${result.error.issues
              .slice(0, 2)
              .map((i) => i.path.map(String).join("."))
              .join(", ")}`)
    );
  }

  /* ---- 5. Nothing in this document is uneditable ---- */
  let opaque = 0;
  const walk = (node: unknown): void => {
    const n = node as {
      kind?: string;
      fields?: { node: unknown }[];
      item?: unknown;
    };
    if (n.kind === "opaque") opaque++;
    if (n.kind === "object") for (const f of n.fields ?? []) walk(f.node);
    if (n.kind === "array" && n.item) walk(n.item);
  };
  walk(tree);
  check(opaque === 0, "every field in the document can be edited in the panel");

  console.log(
    `\n${failures === 0 ? "SITE DETAILS OK" : `${failures} check(s) failed`}\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
