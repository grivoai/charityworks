import type { FaqItem } from "../types";

/**
 * FAQ entries. Rendered as an accordion and emitted as FAQPage JSON-LD,
 * which is why answers are kept as plain text rather than markup.
 * Phase 2: a `faqs` table.
 */
export const faqs: FaqItem[] = [
  {
    id: "faq-how-it-works",
    question: "How does the CharityWorks program work?",
    answer:
      "You choose from dozens of consignment items in our catalog, feature them at your event, and only pay us for what sells. You are never invoiced for unsold items, but your nonprofit pays the return shipping on unsold physical items. Travel and experience packages are PDFs, so there is nothing to send back.",
  },
  {
    id: "faq-silent-or-live",
    question: "Should we have a silent and/or live auction?",
    answer:
      "Both work beautifully. Silent auctions are perfect for a high volume of items, while a live auction creates excitement around your headline packages. Many events run both, and we'll help you decide the right mix — including virtual formats.",
  },
  {
    id: "faq-costs",
    question: "What are the costs?",
    answer:
      "Nonprofits receive items at 75% of retail and start the bidding at the retail price. You keep every single dollar raised above our set price. There are no upfront costs and no hidden fees.",
  },
  {
    id: "faq-auctioneer",
    question: "Should I use your auctioneer?",
    answer:
      "The right auctioneer is the single biggest driver of Day of Event revenue. Our elite roster specializes in nonprofit galas and knows exactly how to read a room and maximize every bid — and California fundraisers can book at half the usual rate in year one.",
  },
  {
    id: "faq-how-many-items",
    question: "How many items should I have?",
    answer:
      "It depends on your audience size and event format. We'll consult with you to build a balanced selection that fits your crowd's demographics — and because popular packages can be sold more than once, you have plenty of flexibility.",
  },
  {
    id: "faq-lead-time",
    question: "How much lead time do I need?",
    answer:
      "Travel and experience packages can arrive in as little as a few hours, because we email them to you as PDFs. Guitars and other physical items take 2 to 3 weeks to ship. Faster delivery of a physical item is possible only if your nonprofit pays for express shipping.",
  },
  {
    id: "faq-payment",
    question: "How and when do we pay?",
    answer:
      "We invoice you after your event for only the items that sold. You simply mail us a check — no payment is required upfront.",
  },
  {
    id: "faq-territory",
    question: "What territory do you cover?",
    answer:
      "All 50 states. With offices in Northern & Southern California, Tacoma WA, Chicago IL, New Jersey and New York, we serve nonprofits coast to coast.",
  },
  {
    id: "faq-mistakes",
    question: "What are the common mistakes to avoid?",
    answer:
      "The biggest mistakes are underselling your headline items, skipping a professional auctioneer, and limiting your catalog. Start bidding at retail, lean on our consultation, and offer enough variety for every guest — we'll guide you through all of it.",
  },
];
