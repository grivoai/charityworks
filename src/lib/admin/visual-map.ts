import type { PageSlug } from "@/content/types";
import { matchesPattern } from "@/lib/admin/locks";

/**
 * Which fields the preview column can reach, and why the rest it cannot.
 *
 * The preview lets the client click what they see on the page to jump to the
 * field that sets it. Some fields are not on the page at all — the search
 * listing, a button's destination — so clicking will never find them. That is
 * fine, and it is exactly why this file exists: "not reachable visually" is
 * written down with a reason, rather than being something the client discovers
 * by clicking and getting nothing.
 *
 * Same shape as `locks.ts` on purpose. Both answer "which fields are special,
 * and why", and both are checked by a script rather than trusted.
 *
 * The form editor remains the complete surface. The preview is a shortcut into
 * it, never a replacement for it.
 */

export interface NotVisibleRule {
  /**
   * Dotted path. `*` matches one segment (an array index); a trailing `**`
   * matches the rest of the path, however deep.
   */
  pattern: string;
  reason: string;
}

/**
 * Pages whose markup carries markers yet.
 *
 * The rollout is one page at a time, so the check has to tell "not marked up
 * yet" apart from "marked up and missing a field" — otherwise it is red for
 * reasons nobody is acting on, and a red check nobody acts on is not a check.
 * Adding a slug here turns the check on for that page.
 */
export const MARKED_UP: PageSlug[] = ["faqs"];

/** Applies to every page. */
export const COMMON_NOT_VISIBLE: NotVisibleRule[] = [
  {
    pattern: "seo.**",
    reason:
      "The search listing. It is what Google shows, not something on the page, " +
      "so there is nothing to click.",
  },
];

export const PAGE_NOT_VISIBLE: Partial<Record<PageSlug, NotVisibleRule[]>> = {
  faqs: [
    {
      pattern: "cta.href",
      reason: "Where the button goes. The button's words are clickable; its destination is not.",
    },
    {
      pattern: "cta.variant",
      reason: "The button's style. Visible as an appearance, not as text.",
    },
  ],
};

export function notVisibleRules(slug: PageSlug): NotVisibleRule[] {
  return [...COMMON_NOT_VISIBLE, ...(PAGE_NOT_VISIBLE[slug] ?? [])];
}

/**
 * `*` for one segment, `**` for everything remaining.
 *
 * Deliberately a separate matcher rather than an extension of the one in
 * `locks.ts`. That one decides which fields are protected from editing, and
 * loosening a security matcher to save a few lines here is how a lock quietly
 * stops matching the thing it was written to protect.
 */
export function matchesVisualPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith(".**")) {
    const prefix = pattern.slice(0, -3);
    return path === prefix || path.startsWith(`${prefix}.`);
  }
  return matchesPattern(path, pattern);
}

export function notVisibleReason(
  slug: PageSlug,
  path: string
): string | undefined {
  return notVisibleRules(slug).find((rule) =>
    matchesVisualPattern(path, rule.pattern)
  )?.reason;
}

/**
 * `faqs.3.question` → `faqs.*.question`.
 *
 * Markers are written inside a `.map`, so one marker in the source covers every
 * entry in the list. Comparing at the pattern level rather than the index level
 * is also what keeps the check honest once the client starts adding and
 * deleting entries: the number of FAQs on the live site is not the number in the
 * repository, and it should not need to be.
 */
export function normalizeIndices(path: string): string {
  return path
    .split(".")
    .map((segment) => (/^\d+$/.test(segment) ? "*" : segment))
    .join(".");
}

/**
 * Splits a marker into the record it belongs to and the path within it.
 *
 * Most markers are a bare path, meaning "a field on the page being rendered".
 * A marker may name another page instead — `contact:form.successMessage` — for
 * content borrowed across pages: the home page renders its enquiry form from
 * the *contact* record (`app/(site)/page.tsx`), so a click there has to open
 * the contact editor rather than look for a field that does not exist on
 * `home`.
 */
export function parseMark(mark: string): { record?: string; path: string } {
  const colon = mark.indexOf(":");
  if (colon === -1) return { path: mark };
  return { record: mark.slice(0, colon), path: mark.slice(colon + 1) };
}
