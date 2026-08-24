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
   * matches the rest of the path, however deep; a leading `**` matches any
   * prefix, so `**.href` covers `cta.href` and `hero.primaryCta.href` alike.
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
export const MARKED_UP: PageSlug[] = [
  "home",
  "auction-items",
  "auction-info",
  "auction-planner",
  "auctioneers",
  "testimonials",
  "faqs",
  "contact",
];

/** Applies to every page. */
export const COMMON_NOT_VISIBLE: NotVisibleRule[] = [
  {
    pattern: "seo.**",
    reason:
      "The search listing. It is what Google shows, not something on the page, " +
      "so there is nothing to click.",
  },
  {
    pattern: "**.href",
    reason:
      "Where a link goes. The words on the button are clickable; its destination " +
      "is not something on the page.",
  },
  {
    pattern: "**.variant",
    reason: "A button's style. Visible as an appearance rather than as text.",
  },
];

export const PAGE_NOT_VISIBLE: Partial<Record<PageSlug, NotVisibleRule[]>> = {
  /**
   * The home page's `heading` is part of every page's shape but this route
   * never renders it — its headline comes from the two hero lines. Locked in
   * `locks.ts` for the same reason.
   */
  home: [
    {
      pattern: "heading",
      reason:
        "Not shown on the home page — the headline is the two lines in the " +
        "hero. Locked in the form for the same reason.",
    },
    {
      pattern: "donor.header.eyebrow",
      reason: "That block renders its tag, title and lede, but no eyebrow.",
    },
    {
      pattern: "closing.cta.label",
      reason: "The closing section ends with the enquiry form, not a button.",
    },
    {
      pattern: "hero.video.embedUrl",
      reason:
        "The player's address. It is what the frame loads, never text on the " +
        "page, so there is nothing to click — the form is the way in.",
    },
  ],
  auctioneers: [
    {
      pattern: "intro.title",
      reason: "A duplicate of the h1 that this page never renders.",
    },
    {
      pattern: "differentiators.header.lede",
      reason: "That section renders its eyebrow and title but no lede.",
    },
  ],
  contact: [
    {
      pattern: "intro.title",
      reason: "This page renders its heading and lede, but no section title.",
    },
    {
      pattern: "form.fields.*.name",
      reason:
        "The key each answer is filed under in the enquiry pipeline. Never " +
        "shown to a visitor — and fixed, for the reason given in the form.",
    },
    {
      pattern: "form.fields.*.type",
      reason:
        "What kind of box this is — a line, a paragraph, an email address. " +
        "Visible as a behaviour rather than as text.",
    },
    {
      pattern: "form.fields.*.required",
      reason: "Whether the question must be answered. Enforced, not displayed.",
    },
    {
      pattern: "form.fields.*.width",
      reason: "How wide the box sits in the grid. Layout, not wording.",
    },
  ],
  faqs: [
    {
      pattern: "video.embedUrl",
      reason:
        "The video's player address. What is on the page is the player itself; " +
        "which file it plays is a setting, in the same way a button's " +
        "destination is.",
    },
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

/**
 * The catalog is not a page, so it gets its own list.
 *
 * A category is one record rendered on four surfaces: its own page, the tiles
 * on the home and auction items pages, and the auction planner's results card.
 * The preview shows its own page, which is where nearly all of its words are —
 * and the fields that are NOT there are not missing markers, they are fields
 * that belong to the tile pointing at it. Saying which is which is the whole
 * point of writing this down.
 */
export const CATALOG_NOT_VISIBLE: NotVisibleRule[] = [
  {
    pattern: "slug",
    reason:
      "The category's web address. Part of the URL rather than anything on " +
      "the page, and locked in the form for the same reason.",
  },
  {
    pattern: "title",
    reason:
      "The short name on the tiles that link here — on the home page and the " +
      "auction items page. This page uses the longer heading instead.",
  },
  {
    pattern: "image.**",
    reason:
      "The category's own photograph, shown on those same tiles. The pictures " +
      "on this page belong to the individual lots.",
  },
  {
    pattern: "span",
    reason: "How wide the tile sits in the grid on the auction items page. Layout, not wording.",
  },
  {
    pattern: "generalOnly",
    reason:
      "A switch, not a piece of wording: it decides whether this category " +
      "describes what it contains or lists named lots.",
  },
  {
    pattern: "groups.*.items.*.documentSlug",
    reason:
      "Which brochure the lot's download button opens. The button's words are " +
      "the same on every lot; the file behind it is a setting, in the same way " +
      "a button's destination is.",
  },
];

/**
 * Marked up and working, but not in any category's HTML today.
 *
 * Item details are the clearest case of why this list is separate from "not on
 * the page". The markup is there and the moment a lot has figures they are as
 * clickable as anything else — no lot has any yet, which is the work
 * `docs/item-details-needed.md` is waiting on, not a gap in the preview.
 */
export const CATALOG_DEFERRED: NotVisibleRule[] = [
  {
    pattern: "groups.*.items.*.details.**",
    reason:
      "A lot's figures, shown under its description. No lot has any yet — see " +
      "docs/item-details-needed.md — so there is nothing rendered to click.",
  },
];

export function catalogNotVisibleReason(path: string): string | undefined {
  return [...COMMON_NOT_VISIBLE, ...CATALOG_NOT_VISIBLE].find((rule) =>
    matchesVisualPattern(path, rule.pattern)
  )?.reason;
}

export function catalogDeferredReason(path: string): string | undefined {
  return CATALOG_DEFERRED.find((rule) => matchesVisualPattern(path, rule.pattern))
    ?.reason;
}

export function notVisibleRules(slug: PageSlug): NotVisibleRule[] {
  return [...COMMON_NOT_VISIBLE, ...(PAGE_NOT_VISIBLE[slug] ?? [])];
}

/**
 * Marked up, and reachable — but not in the HTML the server sends.
 *
 * A third answer was needed once the planner was marked up. Its results screen
 * only exists after the five questions are answered, so the check cannot find
 * those markers by reading the page, yet they are there and they work: click
 * through the quiz in the preview and the fields are as clickable as any other.
 * The same applies to anything rendered only in a fallback branch.
 *
 * Recording them here rather than lumping them in with "not on the page" keeps
 * the distinction the client would notice. "Not on the page" means never
 * clickable, and the form is the only way in. This means "it is there once the
 * page is in the right state". Collapsing the two would quietly turn a working
 * field into one documented as broken.
 */
export const PAGE_DEFERRED: Partial<Record<PageSlug, NotVisibleRule[]>> = {
  /**
   * Both of these replace the form once it has been submitted, so neither is
   * in the page as served. Deliberately not exercised by any automated check:
   * submitting this form files a real lead and sends Ira a text message.
   */
  contact: [
    {
      pattern: "form.successMessage",
      reason:
        "Replaces the form after someone sends it. Visible in the preview only " +
        "after an actual submission, which is not something to test against.",
    },
    {
      pattern: "form.errorMessage",
      reason: "Shown only if a submission fails to send.",
    },
  ],
  faqs: [
    {
      pattern: "video.caption",
      reason:
        "A line under the video, for a credit or a note. The markup is there " +
        "and it becomes clickable the moment one is written — no caption is " +
        "set today, so there is nothing rendered to click.",
    },
    /**
     * The block itself is empty on this page now: the donation-matching video
     * moved to the home hero, and the field stayed optional precisely so it
     * could be cleared here without a deploy. The markup is unchanged and the
     * whole block becomes clickable again the moment a video is set.
     */
    {
      pattern: "video.heading",
      reason:
        "No video is set on this page — the donation-matching one moved to " +
        "the home hero. The block renders, and this with it, as soon as one is.",
    },
    {
      pattern: "video.lede",
      reason: "The line under that title, in the same unset block.",
    },
  ],
  auctioneers: [
    {
      pattern: "auctioneers.*.initials",
      reason:
        "The initials stand in for a missing photograph, so they only appear " +
        "for an auctioneer who has none. Every one currently has a photograph.",
    },
  ],
  "auction-planner": [
    {
      pattern: "results.**",
      reason: "The results screen, which appears once the five questions are answered.",
    },
    {
      pattern: "auctioneerCard.**",
      reason:
        "Shown on the results screen, and only when the answers point at a live auction.",
    },
    {
      pattern: "cta.label",
      reason: "The button at the end of the results screen.",
    },
  ],
};

export function deferredReason(
  slug: PageSlug,
  path: string
): string | undefined {
  return (PAGE_DEFERRED[slug] ?? []).find((rule) =>
    matchesVisualPattern(path, rule.pattern)
  )?.reason;
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
  if (pattern.startsWith("**.")) {
    const suffix = pattern.slice(3);
    return path === suffix || path.endsWith(`.${suffix}`);
  }
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
