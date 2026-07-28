import type { AuctioneersPage } from "../types";
import { auctioneers, auctioneerPartners } from "../collections/auctioneers";

export const auctioneersPage: AuctioneersPage = {
  slug: "auctioneers",
  heading: "Elevate Your Fundraising Event with Our Elite Charity Auctioneers",

  seo: {
    title: "Professional Charity & Benefit Auctioneers in California | CharityWorks",
    description:
      "Book an elite benefit auctioneer for your nonprofit gala. California fundraisers book at half the usual base rate in year one — from $1,500. Meet the roster.",
    targetTerms: [
      "charity auctioneer california",
      "benefit auctioneer for nonprofit gala",
      "nonprofit fundraising consultant",
    ],
    path: "/auctioneers",
  },

  intro: {
    eyebrow: "Auctioneers",
    title: "Elevate Your Fundraising Event with Our Elite Charity Auctioneers",
    lede: "The right auctioneer is the key to maximizing your Day of Event revenue. A skilled charity auctioneer doesn't just run an auction — they create energy, engage donors, and drive bids higher.",
  },

  positioning:
    "Not all auctioneers are the same. The professionals on our exclusive list are among California's elite fundraising auctioneers, carefully selected for their expertise, passion, and proven ability to generate results.",

  differentiators: {
    header: {
      eyebrow: "What Sets Them Apart",
      title: "Four Things You Get With Every Booking",
    },
    items: [
      {
        id: "auc-diff-engagement",
        icon: "🔥",
        title: "Unmatched Engagement",
        body: "They create an exciting, high-energy atmosphere that captivates your audience.",
      },
      {
        id: "auc-diff-consultation",
        icon: "🧭",
        title: "Strategic Consultation",
        body: "From event planning to the final gavel drop, they provide expert insights to optimize your fundraising strategy.",
      },
      {
        id: "auc-diff-revenue",
        icon: "📈",
        title: "Revenue Maximization",
        body: "They help identify the most effective revenue streams for your unique event and audience.",
      },
      {
        id: "auc-diff-guests",
        icon: "🤝",
        title: "A Seamless Guest Experience",
        body: "They ensure every attendee feels valued, comfortable, and eager to bid.",
      },
    ],
  },

  offer: {
    headline: "From $1,500",
    detail:
      "Exclusive offer for first-time clients: book one of our elite auctioneers for your next event at half their usual base rate. First-year introductory rate, available to California fundraisers only.",
  },

  rosterHeading: "Meet the Auctioneers",
  auctioneers,

  partners: {
    title: "Event Planning & Catering Partner",
    blurb:
      "Not an auctioneer — a partner we work alongside on full-service event production.",
    items: auctioneerPartners,
  },

  cta: {
    id: "cta-auctioneers",
    label: "Check Auctioneer Availability",
    href: "/contact",
    variant: "primary",
  },
};
