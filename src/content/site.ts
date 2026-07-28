import type { SiteContent } from "./types";

/**
 * Global site content — brand, navigation, contact details, footer.
 * In Phase 2 this becomes a single editable `site_settings` record.
 */
export const site: SiteContent = {
  name: "CharityWorks",
  logo: { lead: "Charity", accent: "Works" },
  tagline: "The Complete Source For All Your Fundraising & Auction Needs",
  strapline: "Raise More. Risk Nothing.",
  description:
    "The Complete Source For All Your Fundraising & Auction Needs. Premium consignment auction items with zero risk and zero upfront cost.",

  nav: [
    { id: "nav-home", label: "Home", href: "/" },
    { id: "nav-auction-info", label: "Auction Info", href: "/auction-info" },
    { id: "nav-auction-items", label: "Auction Items", href: "/auction-items" },
    { id: "nav-auctioneers", label: "Auctioneers", href: "/auctioneers" },
    { id: "nav-faqs", label: "FAQs", href: "/faqs" },
    { id: "nav-testimonials", label: "Testimonials", href: "/testimonials" },
    { id: "nav-contact", label: "Contact", href: "/contact" },
  ],

  // Shortened for the compact nav slot; the full "Get Your Free Fundraising Plan"
  // wording is used on the in-page CTAs where there is room for it.
  navCta: {
    id: "cta-nav",
    label: "Get Your Free Plan",
    href: "/contact",
    variant: "primary",
  },

  contact: {
    phone: "(925) 250-6968",
    phoneHref: "tel:9252506968",
    email: "Ira@CharityWorks.net",
    secondaryEmail: "info@CharityWorks.net",
    principals: "Ira & Lauri Klein",
    serviceArea: "All 50 States",
    offices: "No. & So. CA · Tacoma WA · Chicago IL · NJ & NY",
    channels: [
      {
        id: "channel-phone",
        icon: "📞",
        label: "Call Us",
        value: "(925) 250-6968",
        href: "tel:9252506968",
      },
      {
        id: "channel-email",
        icon: "✉️",
        label: "Email Us",
        value: "Ira@CharityWorks.net",
        href: "mailto:Ira@CharityWorks.net",
      },
      {
        id: "channel-area",
        icon: "📍",
        label: "Service Area",
        value: "All 50 States",
      },
    ],
  },

  footer: {
    exploreHeading: "Explore",
    contactHeading: "Contact",
    legal: "All rights reserved.",
  },
};

/**
 * Canonical origin, used for canonical tags, OpenGraph URLs and the sitemap.
 * Set NEXT_PUBLIC_SITE_URL in the Vercel project to the production domain.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.charityworks.net"
).replace(/\/$/, "");
