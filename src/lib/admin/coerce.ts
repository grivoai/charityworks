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
