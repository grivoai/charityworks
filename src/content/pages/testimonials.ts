import type { TestimonialsPage } from "../types";
import { testimonials } from "../collections/testimonials";

export const testimonialsPage: TestimonialsPage = {
  slug: "testimonials",
  heading: "Nonprofit Fundraising Results & Client Testimonials",

  seo: {
    title: "Nonprofit Client Results & Testimonials | CharityWorks",
    description:
      "See what nonprofits raised with CharityWorks — from $30,000 at a local museum gala to $422,500 in a single night. Real results from real organizations.",
    targetTerms: [
      "charity auction results",
      "nonprofit fundraising testimonials",
      "gala auction ideas",
    ],
    path: "/testimonials",
  },

  intro: {
    eyebrow: "Testimonials",
    title: "Loved by Nonprofits Nationwide",
    lede: "Real results from real organizations who raised more — and risked nothing.",
  },

  testimonials,

  cta: {
    id: "cta-testimonials",
    label: "Get Your Free Fundraising Plan",
    href: "/contact",
    variant: "primary",
  },
};
