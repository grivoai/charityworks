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

import type { PlannerQuestion } from "./types";

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

/**
 * The auction planner's questions and answers, as the site has asked them
 * since launch — the wording only. Which answer scores what stays in
 * `collections/planner-rules.ts`, matched to this by question and answer id,
 * and the schema refuses wording whose questions or answers differ from it.
 *
 * Every question's text, help line and answer labels can be edited on the
 * Auction planner page; the count, the order and the ids cannot.
 */
export const DEFAULT_PLANNER_QUESTIONS: PlannerQuestion[] = [
  {
    id: "eventType",
    prompt: "What kind of event are you running?",
    options: [
      { id: "gala", label: "Gala or dinner", summaryLabel: "Gala or dinner" },
      { id: "golf", label: "Golf tournament", summaryLabel: "Golf tournament" },
      { id: "faith", label: "Faith-based fundraiser", summaryLabel: "Faith-based fundraiser" },
      { id: "school-university", label: "School or university", summaryLabel: "School or university" },
      { id: "other", label: "Something else", summaryLabel: "Other event" },
    ],
  },
  {
    id: "attendance",
    prompt: "About how many guests do you expect?",
    options: [
      { id: "under-100", label: "Under 100", summaryLabel: "Under 100 guests" },
      { id: "100-250", label: "100 – 250", summaryLabel: "100–250 guests" },
      { id: "250-500", label: "250 – 500", summaryLabel: "250–500 guests" },
      { id: "500-plus", label: "500+", summaryLabel: "500+ guests" },
      { id: "unsure", label: "Not sure yet", summaryLabel: "Guest count TBC" },
    ],
  },
  {
    id: "format",
    prompt: "How will the auction run?",
    help: "A live auction needs a few headline lots. A silent auction needs breadth.",
    options: [
      { id: "live", label: "Live auction", summaryLabel: "Live auction" },
      { id: "silent", label: "Silent auction", summaryLabel: "Silent auction" },
      { id: "both", label: "Both", summaryLabel: "Live and silent" },
      { id: "undecided", label: "Not decided yet", summaryLabel: "Format TBC" },
    ],
  },
  {
    id: "priceBand",
    prompt: "What do your top auction items usually sell for?",
    help: "Your own past results — it tells us where to pitch the recommendation.",
    options: [
      { id: "under-500", label: "Under $500", summaryLabel: "Top lots under $500" },
      { id: "500-1500", label: "$500 – $1,500", summaryLabel: "Top lots $500–1,500" },
      { id: "1500-5000", label: "$1,500 – $5,000", summaryLabel: "Top lots $1,500–5,000" },
      { id: "5000-plus", label: "$5,000+", summaryLabel: "Top lots $5,000+" },
      { id: "unsure", label: "Not sure", summaryLabel: "Past results TBC" },
    ],
  },
  {
    id: "interests",
    prompt: "What does your crowd respond to?",
    help: "Pick up to three.",
    options: [
      { id: "travel", label: "Travel & experiences", summaryLabel: "Travel & experiences" },
      { id: "music", label: "Music & memorabilia", summaryLabel: "Music & memorabilia" },
      { id: "sports", label: "Sports", summaryLabel: "Sports" },
      { id: "jewelry", label: "Jewelry & accessories", summaryLabel: "Jewelry & accessories" },
      { id: "celebrity", label: "Celebrity access", summaryLabel: "Celebrity access" },
      { id: "unsure", label: "Not sure", summaryLabel: "Open to anything" },
    ],
  },
];
