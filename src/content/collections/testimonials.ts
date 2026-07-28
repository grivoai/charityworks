import type { Testimonial } from "../types";

/**
 * Client testimonials. Shared between the Home marquee and the /testimonials page,
 * so the copy exists once. Phase 2: a `testimonials` table.
 */
export const testimonials: Testimonial[] = [
  {
    id: "t-darby",
    quote:
      "Using your virtual event we were able to double our normal revenue while eliminating large expenses.",
    author: "Jim Darby",
    role: "Auctioneer/MC, Cal Baseball Program",
    rating: 5,
  },
  {
    id: "t-demersman",
    quote:
      "We raised almost $30,000 — $5,000 more than our goal. I highly recommend working with Charity Works.",
    author: "Jim DeMersman",
    role: "Executive Director, Museum on Main",
    rating: 5,
  },
  {
    id: "t-faulkenberg",
    quote:
      "We raised over $50,000 which is the most we ever made from any gala at our synagogue.",
    author: "Alyssa Faulkenberg",
    role: "Executive Director, Congregation B'nai Shalom",
    rating: 5,
  },
  {
    id: "t-kallen",
    quote: "We raised more than $100,000 and your firm made it possible.",
    author: "Elliot Kallen",
    role: "President, A Brighter Day",
    rating: 5,
  },
  {
    id: "t-chun",
    quote:
      "We raised $422,500 that night, and the result speaks for itself.",
    author: "Walter Chun",
    role: "Head Men's Golf Coach, Cal Men's Golf",
    rating: 5,
  },
  {
    id: "t-nora",
    quote: "Outstanding customer service! You two are a great team.",
    author: "Nora",
    role: "Elderly Wish Foundation",
    rating: 5,
  },
];
