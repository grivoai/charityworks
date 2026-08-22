/**
 * The identifier a list entry is known by, and where new ones come from.
 *
 * An entry's `id` is machinery rather than content — `schema-tree` marks it
 * `hideInForm`, so it is carried through every save and never drawn. That makes
 * it the one required field a client cannot see, and therefore the one field
 * whose absence they can neither diagnose nor fix: a save refused because an id
 * is empty reports "one field needs attention" and offers nothing to attend to.
 *
 * So anything that creates an entry has to mint one. That is not only the "add"
 * button: changing a block's TYPE replaces the value with a fresh copy of the
 * chosen shape's template, and those templates carry `id: ""` because a
 * template is a static description with no identity of its own.
 *
 * Lives here, outside the form component, so `check:custom-pages` can assert
 * the round trip — template in, saveable entry out — without importing React.
 */

/**
 * "faqs" → "faq", so a new entry's identifier reads like the others.
 *
 * Array indices are skipped: a variant switch is handed the path of the ENTRY
 * ("blocks.1") rather than the list ("blocks"), and the last segment there is a
 * number. Without this, changing a block's type would mint "1-k3f9qz".
 */
export function idPrefix(path: string): string {
  const parts = path.split(".").filter((part) => !/^\d+$/.test(part));
  const last = parts.pop() ?? "item";
  return last.endsWith("s") ? last.slice(0, -1) : last;
}

/**
 * A deep copy of `template` carrying a fresh id, if it has one at all.
 *
 * Minted rather than carried over from whatever was there before. A type change
 * replaces the value outright — that is the documented behaviour of the picker,
 * and the reason it does not merge — so the result is a different thing and
 * should say so. Coercion matches a submitted entry to its stored self BY ID,
 * and reusing the id would invite the old shape's stored values to be matched
 * onto the new one.
 */
export function withFreshId<T>(template: T, path: string): T {
  const copy = JSON.parse(JSON.stringify(template ?? null)) as T;
  if (copy && typeof copy === "object" && !Array.isArray(copy)) {
    const record = copy as Record<string, unknown>;
    if ("id" in record) {
      record.id = `${idPrefix(path)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  return copy;
}
