/**
 * Wording that used to be written into the page code and is now a field.
 *
 * Each constant is what the site said before the field existed, and stays as
 * the field's default. A stored record that predates the field parses with
 * this filled in, so the live pages read exactly as they did until someone
 * edits the field — and clearing a field in the admin puts this back rather
 * than leaving a gap on the page.
 *
 * Kept here rather than beside the pages that draw it so the schema can import
 * it without pulling a page's content module, and with it the whole catalog,
 * into the admin's form code.
 */

/**
 * The key for the gold star, shown above any section of a category that has a
 * starred lot in it. Site-wide: the star means the same thing on every
 * category, so one sentence says it everywhere.
 *
 * It says what the star means and nothing more. The site quotes no figure for
 * any individual lot, so the star marks a tier and the opening bid stays a
 * conversation — which is also what makes the mark durable as costs move.
 */
export const DEFAULT_AFFORDABLE_NOTE =
  "marks our more affordable lots — ask us for the opening bid on any of them.";

/** At the foot of every category page. Inventory turns over constantly. */
export const DEFAULT_AVAILABILITY_NOTE =
  "Inventory changes constantly — contact us to confirm current availability for your event date.";

/** The closing band on Auction Info, above its button. */
export const DEFAULT_AUCTION_INFO_CLOSING = {
  heading: "Ready to Supercharge Your Next Fundraiser?",
  lede: "Tell us about your event and we'll build a risk-free plan to help you raise more than ever.",
};

/** The box above the category tiles on Auction Items that leads to the planner. */
export const DEFAULT_PLANNER_PROMO = {
  lead: "Not sure where to start?",
  text: "Answer five questions and we’ll point you at the categories that suit your event.",
  link: "Find what’s best for your auction",
};
