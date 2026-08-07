/**
 * The serializable description of one editable field.
 *
 * This is the contract between the two halves of the content editor: the server
 * derives a tree of these from a Zod schema, and a client component renders it.
 * It has to be plain JSON, because a Zod schema cannot cross that boundary.
 *
 * Types only — no imports, so a client component can use them freely.
 */

export interface NodeBase {
  /** The label shown next to the input. */
  label: string;
  /** Help text, taken from the schema's `.describe()`. */
  description?: string;
  /** Whether the schema allows this value to be absent. */
  optional: boolean;
  /**
   * Set when the field is shown but must not be edited, holding the reason why.
   * A locked field still round-trips — it is rendered read-only, not dropped.
   */
  locked?: string;
  /**
   * Kept in the document but given no input at all.
   *
   * For values that are structural rather than editorial — an entry's `id`,
   * which exists to tell two entries apart and means nothing to the person
   * writing the words. Note this is NOT the same as a `hidden` node: that
   * carries one fixed value from the schema, which would overwrite every entry
   * in a list with the same one. A field marked this way is an ordinary field
   * whose real value is preserved; it simply is not drawn.
   */
  hideInForm?: boolean;
}

export interface StringNode extends NodeBase {
  kind: "string";
  /** Render as a textarea rather than a single-line input. */
  multiline: boolean;
  /** Drives the input's `type`, so phones show the right keyboard. */
  format?: "email" | "url";
  /** The schema rejects an empty value. */
  required: boolean;
}

export interface NumberNode extends NodeBase {
  kind: "number";
  min?: number;
  max?: number;
}

export interface BooleanNode extends NodeBase {
  kind: "boolean";
}

export interface EnumNode extends NodeBase {
  kind: "enum";
  values: string[];
}

export interface ObjectNode extends NodeBase {
  kind: "object";
  fields: Array<{ key: string; node: FieldNode }>;
}

export interface ArrayNode extends NodeBase {
  kind: "array";
  element: FieldNode;
  /**
   * A blank element, built from the element schema, so "Add" does not have to
   * reimplement the shape in the browser.
   */
  template: unknown;
  /** Set when items may be edited but not added or removed, holding the reason. */
  fixedLength?: string;
  /**
   * Set when the list can grow, but some of its entries cannot be removed.
   *
   * Data rather than a predicate, because this tree is serialised to the
   * browser — a function cannot cross that boundary. An entry whose `key` field
   * holds one of `values` keeps its remove button hidden and shows the reason.
   *
   * The contact form is what this exists for: the six questions the enquiry
   * pipeline reads are fixed, and any question the client adds is theirs to
   * remove. "Fixed length" could not express that.
   */
  protect?: { key: string; values: string[]; reason: string };
}

/**
 * An `{ src, alt, width?, height? }` object.
 *
 * Special-cased rather than rendered as four text inputs so the editor can show
 * the picture. Alt text sits beside it deliberately: it is the field most often
 * left behind when an image is swapped.
 */
export interface ImageNode extends NodeBase {
  kind: "image";
}

/** A fixed value, such as a page's slug. Preserved on save, never shown. */
export interface HiddenNode extends NodeBase {
  kind: "hidden";
  value: unknown;
}

/** A shape the editor has no input for. Shown read-only rather than silently dropped. */
export interface OpaqueNode extends NodeBase {
  kind: "opaque";
  reason: string;
}

export type FieldNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | EnumNode
  | ObjectNode
  | ArrayNode
  | ImageNode
  | HiddenNode
  | OpaqueNode;

/** Field-level validation errors, keyed by dotted path, e.g. `hero.stats.0.value`. */
export type FieldErrors = Record<string, string>;
