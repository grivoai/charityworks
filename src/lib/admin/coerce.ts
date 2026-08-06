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
 * Validation still happens afterwards, in Zod. This does not decide whether the
 * content is valid, only that its shape is the schema's rather than the
 * browser's.
 */
export function coerceToTree(value: unknown, node: FieldNode): unknown {
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
      return value.map((entry) => coerceToTree(entry, node.element));
    }

    case "object": {
      if (!value || typeof value !== "object") {
        return node.optional ? undefined : {};
      }
      const raw = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const { key, node: child } of node.fields) {
        const coerced = coerceToTree(raw[key], child);
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
