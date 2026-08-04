import type { AuctionItemsPage } from "../types";
import { auctionItems } from "../collections/auction-items";

export const auctionItemsPage: AuctionItemsPage = {
  slug: "auction-items",
  heading: "Charity Auction Items for Galas & Fundraisers",

  seo: {
    title:
      "Charity Auction Items & Celebrity Signed Guitar Fundraiser Packages | CharityWorks",
    description:
      "Browse 1,000+ charity auction items: celebrity signed guitars, sports memorabilia, luxury travel, jewelry and meet & greets. Risk-free consignment for nonprofits.",
    targetTerms: [
      "charity auction items",
      "celebrity signed guitar fundraiser",
      "gala auction ideas",
    ],
    path: "/auction-items",
  },

  intro: {
    eyebrow: "Auction Items",
    title: "Over 1,000 Items to Choose From",
    lede: "A curated catalog built to thrill every audience — and drive bids sky-high.",
  },

  items: auctionItems,

  note: "Every item is offered on consignment. Feature what you like at your event, return whatever does not sell, and pay only for the items that find a bidder.",

  // Not "Request the Full Catalog": there is no catalog document to send, and a
  // lead arriving expecting a PDF makes the first reply an apology.
  cta: {
    id: "cta-auction-items",
    label: "Ask About Items for Your Event",
    href: "/contact",
    variant: "primary",
  },
};
