/**
 * Turning what somebody typed into a key the system can hold.
 *
 * Used wherever the client names a thing and the system needs a stable
 * identifier for it that they should not have to invent — contact channel ids
 * today, and page addresses shortly. Deliberately free of imports so both the
 * server actions and the check scripts can use it.
 *
 * `form-write.ts` has its own copy of this shape for contact form field names,
 * and it stays separate on purpose: those keys carry a `custom_` prefix, are
 * capped to a length the enquiry pipeline agreed to, and their collision rule
 * throws a message about questions. Merging the two would mean one function
 * with three flags, which is how the version that is subtly wrong for one
 * caller gets written.
 */

/**
 * A lowercase, hyphenated form of `text`.
 *
 * Normalises accents first so "Café" becomes "cafe" rather than "caf", and
 * collapses everything else to single hyphens. Returns `fallback` when the
 * input has no usable characters at all — an emoji-only label should not
 * produce an empty id.
 */
export function slugify(text: string, fallback: string): string {
  const body = text
    .toLowerCase()
    .normalize("NFKD")
    // Strip the combining marks NFKD just split off.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return body || fallback;
}

/**
 * `candidate`, or the first numbered variant of it that is free.
 *
 * Returns null rather than looping forever when a plausible number of variants
 * are all taken; every caller has a better error to give than this one does.
 */
export function uniqueSlug(
  candidate: string,
  taken: Set<string>,
  limit = 200
): string | null {
  if (!taken.has(candidate)) return candidate;
  for (let n = 2; n < limit; n += 1) {
    const next = `${candidate}-${n}`;
    if (!taken.has(next)) return next;
  }
  return null;
}
