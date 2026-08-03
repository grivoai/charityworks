import type { PlannerQuestion } from "../types";

/**
 * The auction planner's questions and its scoring table.
 *
 * Every weight lives here as data, so the recommendation is deterministic and
 * auditable: the same answers always produce the same three categories, and
 * changing what the tool recommends is a change to this file rather than to
 * logic. `src/lib/planner.ts` does nothing but add these numbers up.
 *
 * The weights encode what the client already says about each category in its
 * own copy — jewelry as "the workhorse of a silent auction", handbags as a
 * mid-tier lot that lifts the average bid, experiences having "no retail price
 * a bidder can look up". This is a heuristic for pointing someone at a sensible
 * starting place, not a valuation, and the results screen is worded to match.
 */

/** Category ids the planner can recommend. */
export const PLANNER_CATEGORIES = [
  "item-vacations",
  "item-bucket-list",
  "item-signed-guitars",
  "item-memorabilia",
  "item-jewelry",
  "item-handbags",
  "item-meet-greets",
  "item-gold-albums",
] as const;

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
  "item-bucket-list",
  "item-handbags",
  "item-meet-greets",
] as const;

/** How many categories the results screen shows. */
export const PLANNER_PICK_COUNT = 3;

export const plannerQuestions: PlannerQuestion[] = [
  {
    id: "eventType",
    prompt: "What kind of event are you running?",
    options: [
      {
        id: "gala",
        label: "Gala or dinner",
        summaryLabel: "Gala or dinner",
        weights: {
          "item-bucket-list": 1,
          "item-signed-guitars": 1,
          "item-jewelry": 1,
        },
      },
      {
        id: "golf",
        label: "Golf tournament",
        summaryLabel: "Golf tournament",
        weights: { "item-memorabilia": 2, "item-vacations": 1 },
      },
      {
        id: "luncheon",
        label: "Luncheon or breakfast",
        summaryLabel: "Luncheon or breakfast",
        weights: {
          "item-jewelry": 1,
          "item-handbags": 1,
          "item-gold-albums": 1,
        },
      },
      {
        id: "school-church",
        label: "School or church fundraiser",
        summaryLabel: "School or church fundraiser",
        weights: {
          "item-vacations": 1,
          "item-memorabilia": 1,
          "item-gold-albums": 1,
        },
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
          "item-bucket-list": 1,
        },
      },
      {
        id: "500-plus",
        label: "500+",
        summaryLabel: "500+ guests",
        weights: {
          "item-bucket-list": 2,
          "item-meet-greets": 1,
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
          "item-bucket-list": 3,
          "item-meet-greets": 3,
          "item-signed-guitars": 2,
          "item-memorabilia": 1,
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
          "item-memorabilia": 2,
          "item-vacations": 2,
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
          "item-bucket-list": 2,
          "item-meet-greets": 2,
          "item-memorabilia": 2,
          "item-jewelry": 2,
          "item-handbags": 2,
          "item-signed-guitars": 1,
          "item-gold-albums": 1,
          "item-vacations": 1,
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
          "item-meet-greets": 1,
        },
      },
      {
        id: "1500-5000",
        label: "$1,500 – $5,000",
        summaryLabel: "Top lots $1,500–5,000",
        weights: {
          "item-signed-guitars": 3,
          "item-vacations": 2,
          "item-bucket-list": 2,
          "item-memorabilia": 2,
          "item-meet-greets": 2,
          "item-gold-albums": 2,
          "item-jewelry": 1,
        },
      },
      {
        id: "5000-plus",
        label: "$5,000+",
        summaryLabel: "Top lots $5,000+",
        weights: {
          "item-bucket-list": 3,
          "item-meet-greets": 3,
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
          "item-bucket-list": 1,
          "item-signed-guitars": 1,
          "item-memorabilia": 1,
          "item-jewelry": 1,
          "item-handbags": 1,
          "item-meet-greets": 1,
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
        weights: { "item-vacations": 3, "item-bucket-list": 3 },
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
        weights: { "item-meet-greets": 3, "item-signed-guitars": 1 },
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

/**
 * One line per category explaining when it earns its place, shown on the
 * recommended card. Written once and static — the results screen never
 * generates prose about why a category was picked, because a made-up
 * justification is worse than none.
 */
export const plannerCategoryNotes: Record<string, string> = {
  "item-vacations":
    "Wide appeal across a whole room, and priced so more than a handful of guests can bid.",
  "item-bucket-list":
    "One or two of these carry a live auction — they are what the room remembers.",
  "item-signed-guitars":
    "A headline lot that photographs well and needs no explanation from the stage.",
  "item-memorabilia":
    "Covers a wide range of price points, so it fills a table rather than resting on one big lot.",
  "item-jewelry":
    "The workhorse of a silent auction — it keeps bidding sheets busy across every table.",
  "item-handbags":
    "A mid-tier lot that draws guests to the table and lifts the average bid.",
  "item-meet-greets":
    "No retail price a bidder can look up, which is exactly why the bidding runs.",
  "item-gold-albums":
    "Framed display pieces that hold a wall and suit a broad range of budgets.",
};
