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
   * The home page has a `heading` because every page does — it is part of the
   * shared base schema — but the home route never renders it. Its headline is
   * built from the two hero lines instead. Found while marking the page up for
   * the preview: nothing on screen could be tied to this field, because nothing
   * on screen comes from it.
   *
   * Left editable it would be the worst kind of field: one the client changes,
   * saves successfully, and then cannot find on the site.
   */
  home: [
    {
      pattern: "heading",
      mode: "readonly",
      reason:
        "The home page's headline is the two lines in the Hero section below — " +
        "'First line of the heading' and 'Second line'. Every page carries a " +
        "heading field, but this one is not shown anywhere.",
    },
    {
      pattern: "donor.header.eyebrow",
      mode: "readonly",
      reason:
        "That block shows its tag, title and lede, but no eyebrow. Editing " +
        "this would change nothing on the page.",
    },
    {
      pattern: "closing.cta.label",
      mode: "readonly",
      reason:
        "The closing section ends with the enquiry form rather than a button, " +
        "so this label is never shown.",
    },
  ],

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
  /**
   * Two more fields that render nowhere, found the same way — by trying to
   * point at them on the page and finding nothing to point at.
   *
   * `intro.title` holds a copy of the h1 and is never read; the differentiators
   * block renders its eyebrow and title but not its lede. Both are locked
   * rather than deleted: removing them means a migration, and the schema is
   * shared. If either was meant to appear, showing it is a small change to the
   * route — say so and it can be unlocked.
   */
  auctioneers: [
    {
      pattern: "intro.title",
      mode: "readonly",
      reason:
        "Not shown on this page. The heading at the top is the field above, " +
        "and this one duplicates it without ever being rendered.",
    },
    {
      pattern: "differentiators.header.lede",
      mode: "readonly",
      reason:
        "This section shows its eyebrow and title, but not a lede. Editing " +
        "this would change nothing on the page.",
    },
  ],

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
