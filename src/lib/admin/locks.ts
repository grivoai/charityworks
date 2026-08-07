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
  mode: "readonly" | "fixed-length" | "protected-entries";
  reason: string;
  /**
   * For `protected-entries`: an entry whose `key` field holds one of `values`
   * cannot be removed. The list can still grow, and everything else about a
   * protected entry stays editable.
   */
  key?: string;
  values?: string[];
}

/**
 * The six questions the enquiry pipeline reads, by the key each is filed under.
 *
 * The one list, imported by the lock below, by the save that refuses to lose
 * one, and by the endpoint that separates these answers from the client's own.
 * Three copies of six strings is how they come to disagree.
 */
export const CORE_FORM_FIELDS = [
  "name",
  "org",
  "email",
  "phone",
  "date",
  "message",
] as const;

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
        "The name this answer is filed under. It is set when the question is " +
        "added and then fixed, because the enquiry pipeline reads these exact " +
        "keys — the label above it is what visitors see, and that is yours.",
    },
    {
      /**
       * The list grows; six of its entries do not go away.
       *
       * Those six are the enquiry pipeline's contract — n8n writes them to
       * fixed spreadsheet columns and `email` is how anyone gets replied to.
       * Everything else about them is editable: wording, placeholder, whether
       * an answer is required, and where they sit.
       */
      pattern: "form.fields",
      mode: "protected-entries",
      key: "name",
      values: [...CORE_FORM_FIELDS],
      reason:
        "These six questions are the ones the enquiry system expects, so they " +
        "cannot be removed. Reword them freely, and add your own below.",
    },
  ],
};

/**
 * Locks for a catalog category.
 *
 * A category is assembled from three tables, and two of its fields are
 * load-bearing in ways nothing on the page hints at.
 */
export const CATEGORY_LOCKS: LockRule[] = [
  {
    pattern: "seo.path",
    mode: "readonly",
    reason:
      "The page's address, built from the URL name below. It is set by the " +
      "site's routing rather than typed here.",
  },
  {
    pattern: "slug",
    mode: "readonly",
    reason:
      "The category's web address. Changing it breaks every link already " +
      "pointing at this page — including any in a sent email — so it is done " +
      "deliberately rather than in passing.",
  },
  {
    /**
     * `catalog_groups` cascades on delete: removing a group takes its lots'
     * rows with it. Those ids are what `?interest=` resolves through, so the
     * one thing that must never happen silently is exactly what removing a
     * group would do. Wording and order stay editable.
     */
    pattern: "groups",
    mode: "fixed-length",
    reason:
      "Groups keep the lots inside them, and removing one would delete those " +
      "lots outright rather than retiring them. Lots themselves can be added " +
      "and removed freely.",
  },
];

export function locksForCategory(): LockRule[] {
  return CATEGORY_LOCKS;
}

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
  return findRule(path, mode, locks)?.reason;
}

/** The rule itself, for the modes that carry more than a reason. */
export function findRule(
  path: string,
  mode: LockRule["mode"],
  locks: LockRule[]
): LockRule | undefined {
  return locks.find((l) => l.mode === mode && matchesPattern(path, l.pattern));
}
