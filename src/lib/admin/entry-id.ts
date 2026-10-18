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
export function withFreshId<T>(
  template: T,
  path: string,
  taken: ReadonlySet<string> = new Set()
): T {
  const copy = JSON.parse(JSON.stringify(template ?? null)) as unknown;
  return freshen(copy, idPrefix(path), uniqueMint(taken)) as T;
}

const mint = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * `mint`, retried until the id is not one already in the form.
 *
 * Six random characters almost never repeat, but "almost" is not the promise:
 * an id is how an enquiry is traced back to a lot, and two entries sharing one
 * is a save refused on a field the client cannot see. `taken` is every id in
 * the document as it stands (`collectIds`), and the ids minted during this
 * one copy are added as they go, so a template with several nested ids cannot
 * hand the same one out twice either.
 *
 * Only the form's ids. A lot removed in an earlier save is archived, not
 * deleted, and its id is not in the form any more — refusing those is the
 * server's job, not this one's.
 */
function uniqueMint(taken: ReadonlySet<string>): (prefix: string) => string {
  const used = new Set(taken);
  return (prefix) => {
    let id = mint(prefix);
    while (used.has(id)) id = mint(prefix);
    used.add(id);
    return id;
  };
}

/**
 * Every `id` in a document, at any depth.
 *
 * The whole document rather than the one list being added to: a category's
 * lots sit in several groups but share one id space, and the save refuses two
 * lots with the same id wherever they are.
 */
export function collectIds(value: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) collectIds(entry, into);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "id" && typeof child === "string" && child) into.add(child);
      else collectIds(child, into);
    }
  }
  return into;
}

/** "columns" → "column", so a nested entry's id reads like its neighbours'. */
const singular = (key: string) => (key.endsWith("s") ? key.slice(0, -1) : key);

/**
 * Every id in the value, not only the one at the top.
 *
 * A template is not always flat. A call to action carries a `cta` with an id of
 * its own, and a columns block now starts with the two columns its schema
 * requires — each of which has an id, and each of which holds items that have
 * ids too. Minting only the outermost left those empty, which is the same
 * unsaveable, undiagnosable state as an empty block id: refused on a field the
 * form does not draw.
 *
 * The prefix comes from the key the value sits under, so ids read as what they
 * are — `column-x7k2mq` inside `columns`, `cta-9fq4lr` inside `cta`. Values
 * with no `id` field, such as an image reference, are walked and left alone.
 */
function freshen(
  value: unknown,
  prefix: string,
  next: (prefix: string) => string
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => freshen(entry, prefix, next));
  }

  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if ("id" in record) record.id = next(prefix);

  for (const [key, child] of Object.entries(record)) {
    if (key === "id" || !child || typeof child !== "object") continue;
    record[key] = freshen(child, singular(key), next);
  }

  return record;
}
