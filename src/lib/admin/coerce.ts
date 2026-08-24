import type { FieldNode } from "@/lib/admin/field-node";

/**
 * Turns what the browser sent into what the schema expects, and nothing else.
 *
 * A form only ever produces strings, booleans and the structure the renderer
 * gave it. The schema wants numbers, absent keys where a value was cleared, and
 * exactly the fields it declares. This bridges the two.
 *
 * It is also the trust boundary. The editor submits one JSON document, and this
 * walk rebuilds that document against the field tree: keys not in the tree are
 * dropped, and `hidden` values are taken from the schema rather than from the
 * request. A page's `slug` is a hidden literal, so no submission can change
 * which page it is claiming to be — the discriminator comes from the server.
 *
 * A LOCKED FIELD IS ALSO TAKEN FROM THE SERVER, from `current` — the document
 * as it stands. Until this was added, `locked` only disabled an input, and a
 * disabled input is a statement to whoever is using the page rather than a
 * constraint on what can be posted. Everything a lock protects is something
 * that breaks invisibly when it changes: `seo.path` disagreeing with the
 * routing, a category's `slug`, and the contact form's field names, which the
 * lead pipeline reads and which nothing would error on.
 *
 * Passing no `current` keeps the old behaviour, which is what the check scripts
 * want: they ask what a submission coerces to, not what a save would store.
 *
 * Validation still happens afterwards, in Zod. This does not decide whether the
 * content is valid, only that its shape is the schema's rather than the
 * browser's.
 */
export function coerceToTree(
  value: unknown,
  node: FieldNode,
  current?: unknown
): unknown {
  if (node.locked !== undefined && current !== undefined) {
    // Not the submitted value, and not re-coerced either: it is already stored
    // in the schema's shape, and coercing it again could only change it.
    return current;
  }

  switch (node.kind) {
    case "hidden":
      // Never from the request.
      return node.value;

    case "string": {
      if (value === null || value === undefined) return undefined;
      const text = typeof value === "string" ? value : String(value);
      const trimmed = text.trim();
      // An empty optional field means "not set", which is an absent key. For a
      // required one it stays empty so validation can say so.
      if (trimmed === "" && node.optional) return undefined;
      return text;
    }

    case "number": {
      if (value === null || value === undefined || value === "") return undefined;
      if (typeof value === "number") return value;
      const parsed = Number(String(value).trim());
      // A non-numeric string is handed on unchanged so the error names the
      // field, rather than being silently turned into NaN.
      return Number.isFinite(parsed) ? parsed : value;
    }

    case "boolean":
      return value === true || value === "true" || value === "on";

    case "enum":
      return typeof value === "string" ? value : undefined;

    case "image": {
      if (!value || typeof value !== "object") return undefined;
      const raw = value as Record<string, unknown>;
      const src = typeof raw.src === "string" ? raw.src.trim() : "";
      // No file means no image, rather than an image of nothing.
      if (src === "" && node.optional) return undefined;
      const width = Number(raw.width);
      const height = Number(raw.height);
      return {
        src,
        alt: typeof raw.alt === "string" ? raw.alt : "",
        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
        ...(Number.isFinite(height) && height > 0 ? { height } : {}),
      };
    }

    case "array": {
      /**
       * An optional list that is absent stays absent.
       *
       * Coercing it to `[]` would rewrite the document on a save that changed
       * nothing — the shape check compares a save with no edits against what is
       * stored, and `undefined -> []` is a difference. It is also a difference
       * with a meaning: a question with no tick-box options is not the same
       * record as a question that never had any.
       */
      if (value === undefined || value === null) {
        return node.optional ? undefined : [];
      }
      if (!Array.isArray(value)) return [];

      /**
       * Entries are matched to their stored selves by `id`, never by position.
       *
       * Reordering a list is an ordinary edit, so index N of the submission is
       * routinely a different entry from index N of what is stored — matching
       * by position would hand a locked value to the wrong entry, which is a
       * worse outcome than not enforcing the lock at all. An entry with no
       * match is new, and a new entry has no stored value to hold it to.
       */
      const stored = new Map<string, unknown>();
      if (Array.isArray(current)) {
        for (const entry of current) {
          if (entry && typeof entry === "object" && "id" in (entry as object)) {
            stored.set(String((entry as Record<string, unknown>).id), entry);
          }
        }
      }

      return value.map((entry) => {
        const id =
          entry && typeof entry === "object" && "id" in (entry as object)
            ? String((entry as Record<string, unknown>).id)
            : null;
        return coerceToTree(
          entry,
          node.element,
          id === null ? undefined : stored.get(id)
        );
      });
    }

    /**
     * One of several shapes, picked by the value's own discriminator.
     *
     * The submitted discriminator decides which shape to rebuild against, NOT
     * the stored one. Those differ exactly when somebody has just changed a
     * block's type, which is an ordinary edit and the one this has to get
     * right — trusting storage would rebuild the new block against the old
     * shape and drop every field the client had just filled in.
     *
     * `current` is only passed through when the type has NOT changed. A locked
     * field's value is taken from the stored entry, and after a type change the
     * stored entry is a different shape whose keys mean different things; a
     * `heading` held over from a text block is not the `heading` of the image
     * block that replaced it. Treating a retyped block as new is both the
     * honest reading and the safe one.
     *
     * An unrecognised discriminator falls back to the first option rather than
     * throwing. The alternative is a save that fails on a value the client
     * cannot see or edit, and the schema still gets the last word.
     */
    case "variant": {
      const submitted =
        value && typeof value === "object"
          ? String((value as Record<string, unknown>)[node.discriminator] ?? "")
          : "";
      const option =
        node.options.find((o) => o.value === submitted) ?? node.options[0];
      if (!option) return undefined;

      const storedType =
        current && typeof current === "object"
          ? String((current as Record<string, unknown>)[node.discriminator] ?? "")
          : "";

      const coerced = coerceToTree(
        value,
        option.node,
        storedType === option.value ? current : undefined
      ) as Record<string, unknown>;

      // The discriminator is a hidden node inside the option, so it survives on
      // its own — but a block whose type was just changed submits the NEW type
      // while the hidden node still holds the old literal. Set it from the
      // option that was actually used, which is the one thing that cannot be
      // wrong.
      return { ...coerced, [node.discriminator]: option.value };
    }

    case "object": {
      if (!value || typeof value !== "object") {
        return node.optional ? undefined : {};
      }
      const raw = value as Record<string, unknown>;
      const from =
        current && typeof current === "object" && !Array.isArray(current)
          ? (current as Record<string, unknown>)
          : undefined;
      const out: Record<string, unknown> = {};
      for (const { key, node: child } of node.fields) {
        const coerced = coerceToTree(raw[key], child, from?.[key]);
        // An absent key is how the schema reads "not set". Writing `undefined`
        // into the object would serialise to null in JSONB.
        if (coerced !== undefined) out[key] = coerced;
      }
      return out;
    }

    default:
      return value;
  }
}

/**
 * JSON with object keys in sorted order.
 *
 * Used to compare content before and after an edit. Plain `JSON.stringify`
 * would report a change whenever a round trip through Postgres reordered a
 * JSONB object's keys, which would fill the history with revisions that changed
 * nothing.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}
