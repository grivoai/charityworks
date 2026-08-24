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

  /**
   * Deliberately down here rather than on the home page. It explains one
   * programme — donation matching — to somebody already reading about how the
   * auctions work, which is a different job from a hero.
   */
  video: {
    heading: "How donation matching works",
    lede: "A short walkthrough of matching gifts, and how they lift what a paddle raise brings in.",
    embedUrl:
      "https://drive.google.com/file/d/1nLCpPgzkKCQ6MxfT9-frUY28noxADT8K/preview",
  },

  cta: {
    id: "cta-faqs",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
