import type { HomePage } from "../types";
import { valueProps } from "../collections/value-props";
import { steps, donorPerks } from "../collections/steps";

export const homePage: HomePage = {
  slug: "home",
  // Mirrors what the rendered <h1> says. The hero splits it across two lines
  // via headingLead/headingAccent. Search terms are carried by the title tag,
  // the visible sub-headline and the section H2s rather than by hidden text.
  heading: "Raise More. Risk Nothing.",

  seo: {
    title:
      "Nonprofit Fundraising Consultant & Charity Auction Items | CharityWorks",
    description:
      "Consignment auction items for nonprofit galas and fundraisers in all 50 states. No upfront cost — you only pay for what sells. Get a free fundraising plan.",
    targetTerms: [
      "nonprofit fundraising consultant",
      "charity auction items",
      "consignment auction items for nonprofits",
    ],
    path: "/",
  },

  hero: {
    pill: "The Complete Source For All Your Fundraising & Auction Needs",
    headingLead: "Raise More.",
    headingAccent: "Risk Nothing.",
    sub: "Premium consignment auction items for nonprofits across all 50 states. No upfront costs. No risk. Only pay for what you sell.",
    // One clear primary action; the secondary is deliberately low-emphasis
    // so the hero has a single obvious next step.
    primaryCta: {
      id: "cta-hero-primary",
      label: "Browse Auction Items",
      href: "/auction-items",
      variant: "primary",
    },
    secondaryCta: {
      id: "cta-hero-secondary",
      label: "How It Works",
      href: "/auction-info",
      variant: "secondary",
    },
    // The one figure still treated as a figure. The other three cards became
    // ways into the catalog; a count of items is worth less to a visitor than
    // a door marked "guitars".
    badge: { value: "30+", label: "Years Experience" },
    // Straight into the two categories the client sells most of, plus the
    // auctioneer roster. Sub-lines are the categories' own blurbs rather than
    // new copy, so the tile and the page it opens say the same thing.
    tiles: [
      {
        id: "hero-tile-guitars",
        icon: "guitar",
        label: "Hand-Signed Guitars",
        sub: "Celebrity & rock legends",
        href: "/auction-items/signed-guitars",
      },
      {
        id: "hero-tile-vacations",
        icon: "palm-tree",
        label: "Affordable Vacations",
        sub: "Crowd-pleasing getaways",
        href: "/auction-items/vacations",
      },
      {
        id: "hero-tile-auctioneers",
        icon: "gavel",
        label: "Elite Auctioneers",
        sub: "They drive bids higher",
        href: "/auctioneers",
      },
    ],
    // The donor incentive, promoted into the hero.
    //
    // "Free Vacations" is the client's own name for the programme — the legacy
    // site calls it the "FREE Vacation Voucher Program" — so this is their
    // wording rather than a description invented here.
    //
    // IT LEANS ON THE TWO LINES BELOW IT, which is why they are not decoration.
    // Read alone on a site whose main business is selling vacation packages,
    // "Free Vacations" could be taken to mean the catalog is free. `sub` says
    // whose cost it is not, and `href` goes to the FAQ section that explains
    // what the package actually contains and that conditions apply. Changing
    // either of those without re-reading this label is the way this becomes a
    // claim the client cannot stand behind.
    offer: {
      icon: "sparkles",
      label: "Free Vacations",
      sub: "Hotels & shows for every donor — free to your nonprofit",
      /* The FAQ answer, not the donor section further down this page. The
         card makes a claim — a free Vegas package for every donor — and the
         thing a reader wants next is what that actually means, which is an
         explanation rather than four reward tiles. The tiles are still one
         click on from there. */
      href: "/faqs#free-vacation-program",
      cue: "What is this? →",
    },
  },

  why: {
    header: {
      eyebrow: "Why CharityWorks",
      title: "Everything Stacked in Your Favor",
      lede: "Three decades of expertise, an unbeatable model, and white-glove service from start to finish.",
    },
    items: valueProps,
  },

  process: {
    header: {
      eyebrow: "How It Works",
      title: "Effortless Fundraising in 3 Steps",
      lede: "From first browse to final check — we make raising money simple, flexible, and completely risk-free.",
    },
    steps,
    cta: {
      id: "cta-home-process",
      label: "See How Consignment Works",
      href: "/auction-info",
      variant: "solid",
    },
  },

  itemsTeaser: {
    header: {
      eyebrow: "Auction Items",
      title: "Dozens of Items to Choose From",
      lede: "A curated catalog built to thrill every audience — and drive bids sky-high.",
    },
    cta: {
      id: "cta-home-items",
      label: "View All Auction Items",
      href: "/auction-items",
      variant: "solid",
    },
  },

  testimonialsTeaser: {
    header: {
      eyebrow: "Testimonials",
      title: "Loved by Nonprofits Nationwide",
      lede: "Real results from real organizations who raised more — and risked nothing.",
    },
    cta: {
      id: "cta-home-testimonials",
      label: "Read All Testimonials",
      href: "/testimonials",
      variant: "secondary",
    },
  },

  // Secondary hook, deliberately placed below the testimonials rather than
  // competing with the primary reasons to choose CharityWorks.
  donor: {
    tag: "Free Donor Incentive Program",
    header: {
      title: "Give Every Donor a Free Gift — At Zero Cost To You",
      lede: "Reward every supporter with a Las Vegas Vacation Package — hotels and shows donated by our partners, so it costs your nonprofit absolutely nothing.",
    },
    perks: donorPerks,
  },

  closing: {
    header: {
      eyebrow: "Get Your Free Fundraising Plan",
      title: "Ready to Supercharge Your Next Fundraiser?",
      lede: "Tell us about your event and we'll build a risk-free plan to help you raise more than ever.",
    },
    cta: {
      id: "cta-home-closing",
      label: "Get Your Free Fundraising Plan",
      href: "/contact",
      variant: "primary",
    },
  },
};
