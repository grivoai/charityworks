import type { AuctionInfoPage } from "../types";
import { steps } from "../collections/steps";
import { pricingPoints, eventFormats } from "../collections/value-props";

export const auctionInfoPage: AuctionInfoPage = {
  slug: "auction-info",
  heading: "How Consignment Auction Items Work for Nonprofits",

  seo: {
    title:
      "How Consignment Auction Items for Nonprofits Work | CharityWorks",
    description:
      "Learn how nonprofit consignment auctions work: choose items at 75% of retail, open bidding at retail, return anything unsold, and pay only for what sells.",
    targetTerms: [
      "consignment auction items for nonprofits",
      "how charity auctions work",
      "nonprofit fundraising consultant",
    ],
    path: "/auction-info",
  },

  intro: {
    eyebrow: "Auction Info",
    title: "Effortless Fundraising in 3 Steps",
    lede: "From first browse to final check — we make raising money simple, flexible, and completely risk-free.",
  },

  steps,

  pricing: {
    header: {
      eyebrow: "The Model",
      title: "What It Costs — And What You Keep",
      lede: "There is no upfront cost and no hidden fee. Here is exactly how the money works.",
    },
    points: pricingPoints,
  },

  formats: {
    header: {
      eyebrow: "Event Formats",
      title: "Silent, Live, Virtual — Or All Three",
      lede: "We support every format and will help you pick the right mix for your audience.",
    },
    items: eventFormats,
  },

  mobileBidding: {
    heading: "Ask us about our Mobile Bidding Platform",
    body: "Let guests bid right from their phones for higher engagement and bigger totals.",
  },

  // Sits after the event formats and above the closing call to action.
  video: {
    heading: "How donation matching works",
    lede: "A short walkthrough of matching gifts, and how they lift what a paddle raise brings in.",
    embedUrl:
      "https://drive.google.com/file/d/1nLCpPgzkKCQ6MxfT9-frUY28noxADT8K/preview",
  },

  cta: {
    id: "cta-auction-info",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
