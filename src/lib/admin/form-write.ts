import { CORE_FORM_FIELDS } from "@/lib/admin/locks";

/**
 * The rules a saved contact form has to satisfy, as a pure function.
 *
 * The same shape as `catalog-write.ts`: the invariants that cannot be expressed
 * in a Zod schema live here, take the submission and the stored document, and
 * either return a corrected document or refuse. Being pure is what lets the
 * check script run every one of them without a database.
 *
 * There are two, and they pull in opposite directions.
 *
 * THE SIX CORE QUESTIONS MUST SURVIVE. `app/api/contact/route.ts` submits their
 * keys and the n8n workflow writes them to fixed spreadsheet columns; `email` is
 * how anyone ever gets replied to. The lock hides their remove buttons, and this
 * is what makes that a rule rather than a rendering.
 *
 * A NEW QUESTION MUST GET A KEY WITHOUT ANYONE BEING ASKED FOR ONE. The key is
 * machine-facing — nobody adding "How did you hear about us?" should have to
 * think about `custom_how_did_you_hear`, and nobody should be able to type
 * `email` into it either. So it is derived from the label here, once, and then
 * locked like the others.
 *
 * The `custom_` prefix is not decoration. The payload posted to n8n is flat, and
 * a question named `source` or `interestId` would land on top of the context the
 * endpoint adds. Prefixing makes that collision impossible to express.
 */

export class FormWriteError extends Error {}

/** A question the client added, as opposed to one the pipeline requires. */
export function isCoreField(name: string): boolean {
  return (CORE_FORM_FIELDS as readonly string[]).includes(name);
}

const PREFIX = "custom_";
const MAX_NAME = 48;

/** "How did you hear about us?" -> "custom_how_did_you_hear_about_us" */
function keyFromLabel(label: string): string {
  const body = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_NAME - PREFIX.length)
    .replace(/_+$/g, "");
  return PREFIX + (body || "question");
}

function unique(candidate: string, taken: Set<string>): string {
  if (!taken.has(candidate)) return candidate;
  for (let n = 2; n < 200; n += 1) {
    const next = `${candidate}_${n}`;
    if (!taken.has(next)) return next;
  }
  throw new FormWriteError(
    "There are too many questions with that wording. Reword one of them."
  );
}

interface LooseField {
  id?: unknown;
  name?: unknown;
  label?: unknown;
  [key: string]: unknown;
}

function fieldsOf(document: unknown): LooseField[] | null {
  const form = (document as { form?: { fields?: unknown } } | null)?.form;
  return Array.isArray(form?.fields) ? (form.fields as LooseField[]) : null;
}

/**
 * Fills in the key for any newly added question, and refuses a form that has
 * lost one of the six.
 *
 * Runs between coercion and validation, because a question the client just
 * added has no key yet — and an empty required string would otherwise fail
 * validation on an input they were never shown.
 *
 * A field that already existed keeps its stored key. Coercion has already put
 * it back (the key is a locked field), so this only has to leave it alone.
 */
export function applyContactFormRules(next: unknown, current: unknown): unknown {
  const fields = fieldsOf(next);
  // Not the shape this is about. Zod is about to say so, in its own words.
  if (!fields) return next;

  const storedIds = new Set(
    (fieldsOf(current) ?? []).map((field) => String(field.id ?? ""))
  );

  const taken = new Set<string>();
  for (const field of fields) {
    if (typeof field.name === "string" && field.name !== "") {
      if (storedIds.has(String(field.id ?? ""))) taken.add(field.name);
    }
  }

  const resolved = fields.map((field) => {
    const known = storedIds.has(String(field.id ?? ""));
    const name = typeof field.name === "string" ? field.name : "";

    if (known && name !== "") return field;

    const label = typeof field.label === "string" ? field.label : "";
    const key = unique(keyFromLabel(label), taken);
    taken.add(key);
    return { ...field, name: key };
  });

  const present = new Set(resolved.map((field) => String(field.name)));
  const lost = CORE_FORM_FIELDS.filter((name) => !present.has(name));
  if (lost.length > 0) {
    throw new FormWriteError(
      `The enquiry system needs ${lost.length === 1 ? "a question" : "questions"} ` +
        `for ${lost.join(", ")}, and this save would remove ` +
        `${lost.length === 1 ? "it" : "them"}. Add ` +
        `${lost.length === 1 ? "it" : "them"} back before saving.`
    );
  }

  // Two questions filed under one key means one of the answers is lost.
  const names = resolved.map((field) => String(field.name));
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) {
    throw new FormWriteError(
      `Two questions are filed under "${duplicate}", so only one of the two ` +
        `answers would be kept. Reword one of them.`
    );
  }

  const document = next as Record<string, unknown>;
  return {
    ...document,
    form: { ...(document.form as Record<string, unknown>), fields: resolved },
  };
}
