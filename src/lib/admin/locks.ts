import type { PageSlug } from "@/content/types";

/**
 * Fields that are shown but must not be edited here.
 *
 * A locked field is rendered read-only with its reason visible, rather than
 * hidden. Hiding it would leave the client wondering where a value they can see
 * on the site is set; showing it greyed out answers that.
 *
 * This exists because "everything in the schema is editable" is not true, and
 * the places it stops being true are exactly the places an edit breaks
 * something the client cannot see.
 */
export interface LockRule {
  /** Dotted path, with `*` matching any array index. */
  pattern: string;
  mode: "readonly" | "fixed-length";
  reason: string;
}

/** Applies to every page. */
export const COMMON_LOCKS: LockRule[] = [
  {
    pattern: "seo.path",
    mode: "readonly",
    reason:
      "The page's address is set by the site's routing, not here. Changing it " +
      "would only make the sitemap disagree with reality.",
  },
];

export const PAGE_LOCKS: Partial<Record<PageSlug, LockRule[]>> = {
  /**
   * The contact form's field *names* are the lead pipeline's contract.
   *
   * `app/api/contact/route.ts` checks required answers against this list and
   * submits these exact keys, and the n8n workflow writes them to fixed
   * spreadsheet columns. Renaming `email` here would not error anywhere — it
   * would quietly start filing enquiries with an empty email column.
   *
   * The wording of a label, its placeholder, whether it is required and where it
   * sits are all safe, and all editable.
   */
  contact: [
    {
      pattern: "form.fields.*.name",
      mode: "readonly",
      reason:
        "The name this answer is filed under. The enquiry pipeline reads these " +
        "exact keys, so it is fixed — the label above it is what visitors see, " +
        "and that is yours to change.",
    },
    {
      pattern: "form.fields",
      mode: "fixed-length",
      reason:
        "Adding or removing a question changes what the enquiry pipeline " +
        "receives, so it is done in the form builder rather than here.",
    },
  ],
};

/** Matches a dotted path against a pattern, where `*` stands for any segment. */
export function matchesPattern(path: string, pattern: string): boolean {
  const a = path.split(".");
  const b = pattern.split(".");
  if (a.length !== b.length) return false;
  return b.every((segment, i) => segment === "*" || segment === a[i]);
}

export function locksForPage(slug: PageSlug): LockRule[] {
  return [...COMMON_LOCKS, ...(PAGE_LOCKS[slug] ?? [])];
}

export function findLock(
  path: string,
  mode: LockRule["mode"],
  locks: LockRule[]
): string | undefined {
  return locks.find((l) => l.mode === mode && matchesPattern(path, l.pattern))
    ?.reason;
}
