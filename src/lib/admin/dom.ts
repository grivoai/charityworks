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

/**
 * On wording written into the page code rather than any field (see `fixed()`
 * in lib/editable.ts). A separate attribute, not a reserved `data-cw` value, so
 * nothing that resolves a `data-cw` to a field ever meets one.
 */
export const FIXED_ATTR = "data-cw-fixed";

/**
 * Puts a list entry on screen with the cursor in one of its fields.
 *
 * `path` is the field's, because only fields carry a path marker; the entry
 * around it is found from there. Scrolled to the top, flashed with the halo
 * the preview uses for a field it found, and focused without a second scroll.
 * Used for the lot picked on the list page and for a lot just duplicated.
 */
export function focusEntryField(path: string): void {
  const field = document.querySelector<HTMLElement>(
    `[${FIELD_PATH_ATTR}="${CSS.escape(path)}"]`
  );
  if (!field) return;

  const entry = field.closest<HTMLElement>(".admin-item") ?? field;
  entry.scrollIntoView({ block: "start", behavior: "auto" });
  // Removed first so a second copy of the same lot flashes again.
  entry.classList.remove("is-found");
  void entry.offsetWidth;
  entry.classList.add("is-found");

  const input = field.querySelector<HTMLElement>(
    "input:not([type=hidden]), textarea"
  );
  input?.focus({ preventScroll: true });
}
