/**
 * The one definition of an input's DOM id, shared by the form and the preview.
 *
 * The preview column finds the input for a clicked element by rebuilding this
 * id from the element's `data-cw` path, so the two must agree exactly. When it
 * lived inside SchemaFields.tsx that agreement was a coincidence waiting to be
 * broken by a refactor.
 */
export function domId(path: string): string {
  return path ? `f-${path.replace(/[^\w]/g, "-")}` : "f-root";
}

/**
 * The attribute a rendered element carries, and the one a form field carries.
 *
 * Both are needed because `domId` only runs one way: it replaces every dot and
 * bracket with a hyphen, so `faqs.0.question` and `faqs-0-question` produce the
 * same id and an id cannot be turned back into a path. Going from a focused
 * input back to the element that shows it — the preview's reverse highlight —
 * needs the path itself, unmangled.
 */
export const MARK_ATTR = "data-cw";
export const FIELD_PATH_ATTR = "data-cw-path";
