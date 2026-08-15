import type { SiteContent } from "./types";

/**
 * Global site content — brand, navigation, contact details, footer.
 *
 * SEED FIXTURE. This is no longer read at runtime once the database holds a
 * `site_settings` row; `scripts/seed.ts` inserts it and `getSite()` reads the
 * row from then on. It stays in the repo for two reasons: it is what the seed
 * inserts, and it is the documented fallback when the Supabase environment
 * variables are absent, which is what lets the site build before the database
 * exists. See `src/lib/content.ts`.
 *
 * Editing this file does not change the live site. Edit it in the admin.
 *
 * `siteUrl` and `noindex` used to live here and now live in
 * `@/lib/site-config` — they are deployment configuration rather than content,
 * and must not become editable.
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
        icon: "phone",
        label: "Call Us",
        value: "(925) 250-6968",
        href: "tel:9252506968",
      },
      {
        id: "channel-email",
        icon: "mail",
        label: "Email Us",
        value: "Ira@CharityWorks.net",
        href: "mailto:Ira@CharityWorks.net",
      },
      {
        id: "channel-area",
        icon: "map-pin",
        label: "Service Area",
        value: "All 50 States",
      },
    ],
  },

  /**
   * Ira's scheduling link. Stored bare: ContactForm appends the embed's own
   * parameters, and a query string saved here would be silently overwritten
   * by them.
   */
  booking: {
    url: "https://calendly.com/iraklein82/new-meeting",
    heading: "Pick a time to talk with Ira",
    lede:
      "Thirty minutes, and you'll leave knowing what would work for your event and what it would raise.",
    fallbackLabel: "Open the booking calendar →",
  },

  footer: {
    exploreHeading: "Explore",
    contactHeading: "Contact",
    legal: "All rights reserved.",
  },
};
