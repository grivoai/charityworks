import type { PlannerQuestion } from "../types";

/**
 * The auction planner's questions and its scoring table.
 *
 * Every weight lives here as data, so the recommendation is deterministic and
 * auditable: the same answers always produce the same three categories, and
 * changing what the tool recommends is a change to this file rather than to
 * logic. `src/lib/planner.ts` does nothing but add these numbers up.
 *
 * On what the weights are grounded in — an earlier version of this comment
 * claimed they encoded the client's own description of each category. That was
 * wrong, and worth recording so it is not assumed again. Phrases like "the
 * workhorse of a silent auction" and "lifts the average bid" come from the
 * `intro` fields in auction-items.ts, which were written during the Phase 1
 * rebuild. None of them appear anywhere in the client's original site.
 *
 * What the client actually publishes is one line per category, preserved
 * verbatim in each category's `blurb`. Those lines say what a category is and
 * who it appeals to; they say nothing about live versus silent format or about
 * price bands, which is most of what this table has to decide.
 *
 * So: the format and price weights are a fundraising heuristic, not a claim
 * sourced from the client. They point someone at a sensible starting place.
 * The results screen is worded to match, and the recommendation is offered as
 * a conversation starter rather than an answer.
 */

/** Category ids the planner can recommend. */
export const PLANNER_CATEGORIES = [
  "item-vacations",
  "item-signed-guitars",
  "item-memorabilia",
  "item-jewelry",
  "item-handbags",
  "item-gold-albums",
] as const;

/**
 * `item-bucket-list` and `item-meet-greets` are gone from every list and every
 * weight below. They are not retired lots — all 13 of them are still on the
 * site, inside `item-vacations`, which is now one page with three groups. A
 * quiz that recommended a category the catalog no longer serves would send
 * someone to a redirect.
 *
 * Their weights were folded in by MAX rather than by sum. A weight answers "how
 * well does this category fit", and the merged category fits at least as well
 * as its best part; adding them together would have inflated it against the
 * categories it competes with, which answers a different question.
 */

/**
 * `item-taylor-swift-guitar` is deliberately absent. It is an SEO landing page
 * whose two lots also appear under Hand-Signed Guitars, so letting it compete
 * would show the same guitar twice in a set of three recommendations. It stays
 * fully browsable; it just does not score.
 */

/**
 * Order used to break ties, broadest appeal first.
 *
 * Answering "not sure" to everything leaves every category on equal points, and
 * this decides what that returns. Vacations and memorabilia lead because they
 * carry the widest range of price points, which is the safest thing to put in
 * front of someone who has not told us much.
 */
export const PLANNER_TIE_BREAK = [
  "item-vacations",
  "item-memorabilia",
  "item-gold-albums",
  "item-signed-guitars",
  "item-jewelry",
  "item-handbags",
] as const;

/** How many categories the results screen shows. */
export const PLANNER_PICK_COUNT = 3;

export const plannerQuestions: PlannerQuestion[] = [
  /**
   * Scores nothing, deliberately. Every option here carries no weights.
   *
   * The earlier version nudged categories by event type — jewelry for a
   * luncheon, memorabilia for a school fundraiser — and none of it was sourced.
   * Nothing the client publishes says a synagogue bids differently from a
   * university, so those numbers were invented and have been removed rather
   * than reworded.
   *
   * The question stays because the answer is worth having: it travels to the
   * lead as `quizEventType`, which is real information for the follow-up
   * conversation. The recommendation itself rests on format, price band and
   * stated interests.
   *
   * The options themselves are drawn from the client's real material where it
   * exists. Galas appear across the original site and in the auctioneer bios
   * ("specializes in benefit galas"); there is a real golf client (Cal Men's
   * Golf) and a real faith client (Congregation B'nai Shalom); "school or
   * university" covers the two college-athletics clients in the testimonials.
   * "Luncheon or breakfast" and "church" were assumptions with no support
   * anywhere in the client's material — the one faith client is a synagogue —
   * and are gone.
   */
  {
    id: "eventType",
    prompt: "What kind of event are you running?",
    options: [
      { id: "gala", label: "Gala or dinner", summaryLabel: "Gala or dinner" },
      { id: "golf", label: "Golf tournament", summaryLabel: "Golf tournament" },
      {
        id: "faith",
        label: "Faith-based fundraiser",
        summaryLabel: "Faith-based fundraiser",
      },
      {
        id: "school-university",
        label: "School or university",
        summaryLabel: "School or university",
      },
      { id: "other", label: "Something else", summaryLabel: "Other event" },
    ],
  },

  {
    id: "attendance",
    prompt: "About how many guests do you expect?",
    options: [
      {
        id: "under-100",
        label: "Under 100",
        summaryLabel: "Under 100 guests",
        weights: {
          "item-jewelry": 1,
          "item-handbags": 1,
          "item-gold-albums": 1,
        },
      },
      {
        id: "100-250",
        label: "100 – 250",
        summaryLabel: "100–250 guests",
        weights: { "item-vacations": 1, "item-memorabilia": 1 },
      },
      {
        id: "250-500",
        label: "250 – 500",
        summaryLabel: "250–500 guests",
        weights: {
          "item-vacations": 1,
          "item-signed-guitars": 1,
        },
      },
      {
        id: "500-plus",
        label: "500+",
        summaryLabel: "500+ guests",
        weights: {
          "item-vacations": 2,
          "item-signed-guitars": 1,
        },
      },
      { id: "unsure", label: "Not sure yet", summaryLabel: "Guest count TBC" },
    ],
  },

  {
    id: "format",
    prompt: "How will the auction run?",
    help: "A live auction needs a few headline lots. A silent auction needs breadth.",
    options: [
      {
        id: "live",
        label: "Live auction",
        summaryLabel: "Live auction",
        weights: {
          // 3 because the headline travel lots and the celebrity access that
          // earned this are inside this category now, not because getaways as
          // a whole became live-auction lots.
          "item-vacations": 3,
          "item-signed-guitars": 2,
          // Leans live, not silent. The reverse used to be true here, on the
          // strength of a description of memorabilia as breadth to fill a
          // table — which was invented. What the client actually publishes is
          // "The WOW factor that creates buzz and drives up every bid", and
          // buzz is a live-room property.
          "item-memorabilia": 2,
        },
      },
      {
        id: "silent",
        label: "Silent auction",
        summaryLabel: "Silent auction",
        weights: {
          "item-jewelry": 3,
          "item-handbags": 3,
          "item-gold-albums": 2,
          "item-vacations": 2,
          "item-memorabilia": 1,
        },
      },
      {
        id: "both",
        label: "Both",
        summaryLabel: "Live and silent",
        /**
         * Between the two rather than a mechanical halving of them. Halving and
         * rounding down put every category on exactly one point, which is the
         * same as scoring nothing at all — the question stopped discriminating.
         * These keep both the headline lots and the breadth in play.
         */
        weights: {
          "item-vacations": 2,
          "item-memorabilia": 2,
          "item-jewelry": 2,
          "item-handbags": 2,
          "item-signed-guitars": 1,
          "item-gold-albums": 1,
        },
      },
      {
        id: "undecided",
        label: "Not decided yet",
        summaryLabel: "Format TBC",
      },
    ],
  },

  {
    id: "priceBand",
    prompt: "What do your top auction items usually sell for?",
    help: "Your own past results — it tells us where to pitch the recommendation.",
    options: [
      {
        id: "under-500",
        label: "Under $500",
        summaryLabel: "Top lots under $500",
        weights: {
          "item-jewelry": 3,
          "item-memorabilia": 2,
          "item-handbags": 2,
          "item-gold-albums": 2,
          "item-vacations": 1,
        },
      },
      {
        id: "500-1500",
        label: "$500 – $1,500",
        summaryLabel: "Top lots $500–1,500",
        weights: {
          "item-vacations": 3,
          "item-memorabilia": 3,
          "item-gold-albums": 3,
          "item-signed-guitars": 2,
          "item-jewelry": 2,
          "item-handbags": 2,
        },
      },
      {
        id: "1500-5000",
        label: "$1,500 – $5,000",
        summaryLabel: "Top lots $1,500–5,000",
        weights: {
          "item-signed-guitars": 3,
          "item-vacations": 2,
          "item-memorabilia": 2,
          "item-gold-albums": 2,
          "item-jewelry": 1,
        },
      },
      {
        id: "5000-plus",
        label: "$5,000+",
        summaryLabel: "Top lots $5,000+",
        weights: {
          "item-vacations": 3,
          "item-signed-guitars": 2,
          "item-memorabilia": 1,
          "item-gold-albums": 1,
        },
      },
      {
        id: "unsure",
        label: "Not sure",
        summaryLabel: "Past results TBC",
        /* Flat across every category: it moves nothing, so an honest "not sure"
           neither helps nor hurts a category's chances. */
        weights: {
          "item-vacations": 1,
          "item-signed-guitars": 1,
          "item-memorabilia": 1,
          "item-jewelry": 1,
          "item-handbags": 1,
          "item-gold-albums": 1,
        },
      },
    ],
  },

  {
    id: "interests",
    prompt: "What does your crowd respond to?",
    help: "Pick up to three.",
    maxChoices: 3,
    options: [
      {
        id: "travel",
        label: "Travel & experiences",
        summaryLabel: "Travel & experiences",
        weights: { "item-vacations": 3 },
      },
      {
        id: "music",
        label: "Music & memorabilia",
        summaryLabel: "Music & memorabilia",
        weights: { "item-signed-guitars": 3, "item-gold-albums": 3 },
      },
      {
        id: "sports",
        label: "Sports",
        summaryLabel: "Sports",
        weights: { "item-memorabilia": 3 },
      },
      {
        id: "jewelry",
        label: "Jewelry & accessories",
        summaryLabel: "Jewelry & accessories",
        weights: { "item-jewelry": 3, "item-handbags": 3 },
      },
      {
        id: "celebrity",
        label: "Celebrity access",
        summaryLabel: "Celebrity access",
        // Meet & Greets is a group inside the travel category now, so
        // celebrity access scores it. The recommendation card will say
        // "Travel & Experiences" for an answer about celebrities, which is
        // accurate — that is where the Bocelli and Warriors lots live.
        weights: { "item-vacations": 3, "item-signed-guitars": 1 },
      },
      {
        id: "unsure",
        label: "Not sure",
        summaryLabel: "Open to anything",
        exclusive: true,
      },
    ],
  },
];

/*
 * There is no per-category note map here, on purpose.
 *
 * There was one, and its eight lines were mostly invented — a "mid-tier lot",
 * a category suiting "a broad range of budgets", memorabilia as breadth to
 * fill a table. Audited against the client's original site, one of the eight
 * was grounded.
 *
 * The results card uses each category's `blurb` instead. Those are the
 * client's own one-line descriptions, verbatim, and they already say what a
 * category is and who it appeals to. Anything written to sit alongside them
 * can only add words the client did not say.
 */
