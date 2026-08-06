/**
 * Marks a rendered element as the visible form of one content field.
 *
 * The admin's preview column shows the real page in an iframe and lets the
 * client click a heading to jump to the input that sets it. Nothing in the DOM
 * connects `<h1>Charity Auction FAQs</h1>` to the `heading` field, so the
 * connection has to be declared here, at the point of rendering.
 *
 * Matching rendered text back to the JSON instead was considered and rejected:
 * two fields holding the same words — a CTA labelled "Get Started" in two
 * places — are indistinguishable that way, and it fails silently and only
 * sometimes, which is the worst way for a mapping to fail.
 *
 * Deliberately tiny and dependency-free. It runs on the public site, where the
 * whole cost of this feature is a handful of inert `data-` attributes: no
 * JavaScript is added to any public page, and the pages stay statically
 * prerendered.
 *
 *   <h1 {...editable("heading")}>{page.heading}</h1>
 *
 * Apply it to the innermost element whose text *is* that one field. An element
 * holding a field plus other words would highlight too much and, worse, suggest
 * that editing it changes all of them.
 */

/** What `editable()` spreads onto an element. Empty when there is no path. */
export type EditableMark = { "data-cw"?: string };

/**
 * Passing `undefined` produces no attribute at all, and that is the mechanism
 * rather than a guard.
 *
 * Shared components take an optional path *prefix* and pass it through `at()`.
 * A component rendering something that is not page content — the testimonial
 * marquee on the home page reads a static collection, not the page record — is
 * simply used without a prefix, and is then correctly not clickable. The failure
 * worth avoiding is a marker that points at a plausible but wrong field, so
 * silence is the default and a marker is the deliberate act.
 */
export function editable(path: string | undefined): EditableMark {
  return path ? { "data-cw": path } : {};
}

/**
 * Builds a child path, propagating "not editable here" through a whole subtree.
 *
 *   at("faqs", 3, "question")   →  "faqs.3.question"
 *   at(undefined, 3, "question") →  undefined
 *
 * The second case is what lets a component be written once and used both with
 * page content and without it.
 */
export function at(
  prefix: string | undefined,
  ...segments: Array<string | number>
): string | undefined {
  if (prefix === undefined) return undefined;
  return [prefix, ...segments].filter((s) => s !== "").join(".");
}
