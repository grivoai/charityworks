import type { FaqsPage } from "../types";
import { faqs } from "../collections/faqs";

export const faqsPage: FaqsPage = {
  slug: "faqs",
  heading: "Charity Auction FAQs for Nonprofits",

  seo: {
    title: "Charity Auction FAQs for Nonprofits | CharityWorks",
    description:
      "Answers to common questions about nonprofit consignment auctions: costs, lead times, silent vs live formats, payment terms and the territory we cover.",
    targetTerms: [
      "charity auction FAQ",
      "consignment auction items for nonprofits",
      "how do charity auctions work",
    ],
    path: "/faqs",
  },

  intro: {
    eyebrow: "FAQs",
    title: "Questions, Answered",
    lede: "Everything you need to know before your next fundraiser.",
  },

  faqs,

  cta: {
    id: "cta-faqs",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
