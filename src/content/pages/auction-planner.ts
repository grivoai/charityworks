import type { AuctionPlannerPage } from "../types";

export const auctionPlannerPage: AuctionPlannerPage = {
  slug: "auction-planner",
  heading: "Find What's Best for Your Auction",

  seo: {
    title: "Auction Item Planner for Nonprofits | CharityWorks",
    description:
      "Answer five quick questions about your event and see which consignment auction categories fit it best. No email required, results shown immediately.",
    targetTerms: [
      "what to auction at a fundraiser",
      "silent auction ideas for nonprofits",
      "charity auction item ideas",
    ],
    path: "/auction-planner",
  },

  intro: {
    eyebrow: "Auction Planner",
    title: "Find What's Best for Your Auction",
    lede: "Five questions about your event, and we'll point you at the categories that tend to work for rooms like yours.",
  },

  start: {
    blurb:
      "No email needed and nothing to sign up for — your results appear as soon as you finish. Every item is offered on consignment, so anything that does not sell comes back to us.",
    button: "Start the planner",
    duration: "Takes about a minute",
  },

  results: {
    heading: "Where we'd start",
    lede: "Based on what you told us, these three categories tend to suit events like yours. It is a starting point for a conversation, not a quote — availability and what actually fits your room are worth talking through.",
    answersLabel: "Your answers",
    picksHeading: "Three to look at first",
    restart: "Start over",
  },

  cta: {
    id: "cta-planner-results",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
