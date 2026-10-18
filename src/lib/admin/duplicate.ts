import type { ArrayNode, FieldNode, ObjectNode } from "@/lib/admin/field-node";
import { withFreshId } from "@/lib/admin/entry-id";

/**
 * Copying a list entry in the form, for lists that offer it.
 *
 * Asked for so the client can make a lot that differs from an existing one by
 * its title and picture — another gold album, another jersey — without typing
 * the rest again. Only the catalog's lots offer it; every other list is
 * unchanged.
 *
 * The copy is an ordinary unsaved edit: it goes into the form's value like a
 * typed word does, so Save keeps it and Discard throws it away, and nothing
 * here touches the server.
 *
 * Pure, and outside the form component, so `check:duplicate` can assert what a
 * copy is without a browser.
 */

/**
 * What a list's Duplicate button does. Data, not functions, because the field
 * tree is serialised to the browser.
 */
export interface DuplicateRule {
  /** The field that gets `namePrefix` in front of it. */
  nameKey: string;
  /** "Copy of ", so an unfinished copy cannot be mistaken for a finished lot. */
  namePrefix: string;
  /** Fields left off the copy because they belong to the original. */
  omit: string[];
  /** The one line shown on a copy until the form is left. */
  notice: string;
}

/**
 * A lot's copy.
 *
 * The brochure is the one field not copied. A lot's `documentSlug` puts a
 * Print / Download button on its card for that lot's PDF; carried onto a
 * different album it would hand bidders the original's brochure. The details,
 * description and note ARE copied — they are most of the typing being saved —
 * and the notice says to check them, since they describe the original.
 */
export const LOT_DUPLICATE: DuplicateRule = {
  nameKey: "name",
  namePrefix: "Copy of ",
  omit: ["documentSlug"],
  notice: "Details copied from the original, check them.",
};

/**
 * Turns Duplicate on for the list at `pattern` — a dotted shape path with `*`
 * for "any entry", the same notation the locks use.
 *
 * Set on the built tree rather than worked into `buildFieldTree`, because it is
 * a choice one editor makes about one list, not something read off the schema.
 * Throws when the path names no list, so a schema change that moves the lots
 * fails the page loudly instead of quietly losing the button.
 */
export function allowDuplicate(
  tree: ObjectNode,
  pattern: string,
  rule: DuplicateRule
): ObjectNode {
  let node: FieldNode = tree;
  for (const segment of pattern.split(".")) {
    if (segment === "*") {
      if (node.kind !== "array") break;
      node = node.element;
      continue;
    }
    if (node.kind !== "object") break;
    const field: { node: FieldNode } | undefined = node.fields.find(
      (entry) => entry.key === segment
    );
    if (!field) throw new Error(`allowDuplicate: no field "${segment}" in ${pattern}`);
    node = field.node;
  }
  if (node.kind !== "array") {
    throw new Error(`allowDuplicate: ${pattern} is not a list`);
  }
  (node as ArrayNode).duplicate = rule;
  return tree;
}

/**
 * The list with a copy of entry `index` directly below it.
 *
 * Every field is carried over except `rule.omit`; the name gets the prefix;
 * and the id is new, minted the way Add does it — `withFreshId`, which also
 * re-mints any id already in `taken` (every id in the form). Returns the new
 * list and the copy's id, which is how the form finds it to scroll to.
 */
export function duplicateEntry(
  items: unknown[],
  index: number,
  path: string,
  rule: DuplicateRule,
  taken: ReadonlySet<string>
): { items: unknown[]; id: string } {
  const original = items[index];
  if (!original || typeof original !== "object" || Array.isArray(original)) {
    throw new Error(`duplicateEntry: entry ${index} of ${path} is not an object`);
  }

  const source: Record<string, unknown> = { ...(original as Record<string, unknown>) };
  for (const key of rule.omit) delete source[key];

  const name = source[rule.nameKey];
  source[rule.nameKey] = `${rule.namePrefix}${typeof name === "string" ? name : ""}`;

  const copy = withFreshId(source, path, taken);
  const next = [...items];
  next.splice(index + 1, 0, copy);
  return { items: next, id: String(copy.id) };
}
