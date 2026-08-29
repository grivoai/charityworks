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

  /**
   * The free donor incentive.
   *
   * Written from what CharityWorks already publishes about the programme — the
   * donor section on the home page — and nothing else. The fulfilment partner's
   * own redemption terms are a separate document whose licensing is unresolved,
   * so the last paragraph acknowledges that conditions exist and names the
   * exclusions that stop "free" being read as "costs nothing to use", without
   * reproducing anybody's terms. Replace it with the specifics once that is
   * settled.
   */
  incentive: {
    eyebrow: "The Free Donor Incentive",
    heading: "What is the free vacation program?",
    /**
     * A crop of the Viva Las Vegas catalog photograph.
     *
     * The original carries a "$1500 or Less" starburst — the asking price of
     * that auction lot — which beside a heading reading "What is the free
     * vacation program?" says the opposite of what the section is for. The crop
     * keeps the half of the frame that is unmistakably Las Vegas (Paris, the
     * High Roller, the Bellagio fountains) and drops the badge.
     *
     * There are no photographs of the certificates themselves anywhere in the
     * project, and the only other Las Vegas image is a triptych of named
     * artists at the Sphere, which would imply tickets to those specific shows.
     */
    image: {
      src: "/images/free-vacation-vegas.jpg",
      alt: "The Las Vegas Strip lit up at night, representing the donor vacation package",
      width: 352,
      height: 314,
    },
    body:
      "Every guest at your event can be offered a Las Vegas vacation package — hotel nights and show tickets donated by our partners. It costs your nonprofit nothing: we supply the certificates, you hand them out.\n\n" +
      "It works as a behaviour tool rather than a giveaway. Nonprofits use it to reward the four moments that decide the night's total — buying a ticket, placing a bid, buying $100 in raffle, and making a pledge. A guest who would have bid once often bids twice when a certificate rides on it.\n\n" +
      "Recipients register their certificate with the fulfilment partner and choose their own dates. Conditions apply — advance booking and availability — and travel costs such as airfare, meals, taxes and resort fees are the traveller's own. We provide the current terms in writing so you can pass them on with the certificates.",
    cta: {
      id: "cta-faqs-incentive",
      label: "See how it works at your event",
      href: "/#donor",
      variant: "secondary",
    },
  },

  cta: {
    id: "cta-faqs",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
