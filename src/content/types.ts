/**
 * Content model for the CharityWorks site.
 *
 * Every interface here is a plain, JSON-serializable shape that maps cleanly onto
 * a database row or CMS document. Phase 2 (the client-facing admin panel) replaces
 * the hand-authored modules in `src/content/pages/` with rows fetched through
 * `src/lib/content.ts` — the field names below become the column/field names, and
 * every editable record carries a stable `id` to serve as its primary key.
 *
 * Rules that keep that migration cheap:
 *   1. No copy lives in a component. It all lives here.
 *   2. Every repeated record has a stable `id` that is never derived from an array index.
 *   3. Images are `ImageRef` objects, never bare strings, so an upload record can slot in.
 */

/** A page slug. Doubles as the primary key of the future `pages` table. */
export type PageSlug =
  | "home"
  | "auction-info"
  | "auction-items"
  | "auctioneers"
  | "faqs"
  | "testimonials"
  | "contact";

/**
 * An image. Kept as an object rather than a URL string so a Phase 2 upload
 * record (storage key, dimensions, uploader, alt text) can replace it in place.
 */
export interface ImageRef {
  src: string;
  /** Required, not optional — alt text is an SEO and accessibility deliverable. */
  alt: string;
  width?: number;
  height?: number;
}

/** Per-page search metadata. Consumed by each route's `generateMetadata`. */
export interface SeoMeta {
  /** The <title>. Written full-length here; the layout does not append a suffix. */
  title: string;
  /** Meta description. Aim for 140-160 characters. */
  description: string;
  /** Primary search terms this page targets. Documentation for editors, not a meta tag. */
  targetTerms: string[];
  /** Path relative to the site root, used to build the canonical URL. */
  path: string;
}

export type ButtonVariant = "primary" | "secondary" | "solid";

export interface CtaRef {
  id: string;
  label: string;
  href: string;
  variant: ButtonVariant;
}

/** The eyebrow / title / lede trio that opens most sections. */
export interface SectionHeader {
  eyebrow?: string;
  title: string;
  lede?: string;
}

export interface Step {
  id: string;
  /** Displayed step number. Explicit rather than index-derived so steps can be reordered. */
  number: string;
  /** Decorative emoji. Rendered aria-hidden. */
  icon: string;
  title: string;
  body: string;
}

/**
 * One labelled specific about a lot — "Certificate of Authenticity", "Framed
 * size", "Retail value", "Lead time" and so on.
 *
 * Deliberately a free-form label/value pair rather than fixed fields: what is
 * known differs by category, and a fixed shape would either force empty rows or
 * invite filling them in with guesses. A row that is not supplied is a row that
 * is not shown.
 *
 * These are claims about goods a nonprofit will resell to its donors, so every
 * value must come from the client. Nothing here may be inferred from a
 * photograph or a description.
 */
export interface ItemDetail {
  label: string;
  value: string;
}

/** A single lot within an auction category. */
export interface CategoryItem {
  id: string;
  name: string;
  description: string;
  /** Photograph of the actual piece. Absent on generally-described categories. */
  image?: ImageRef;
  /** Per-item disclaimer, e.g. jersey availability wording required by the client. */
  note?: string;
  /**
   * Verified specifics, shown as a definition list on the item card. Optional
   * throughout: the catalog ships with these empty pending the client's own
   * figures, and the card simply renders without the block until they arrive.
   */
  details?: ItemDetail[];
}

/**
 * A titled block of lots within a category.
 *
 * Exists so tiers can be kept visually distinct — the memorabilia page must
 * separate hand-signed pieces from reproduced/laser-signature ones, which are
 * a materially different (and cheaper) product. Collapsing them into one list
 * would misrepresent what a bidder is getting.
 */
export interface CategoryGroup {
  id: string;
  /** Sub-heading. Omitted when a category has a single unlabelled group. */
  title?: string;
  /** Optional explanatory line under the sub-heading. */
  blurb?: string;
  items: CategoryItem[];
}

/** A catalog category. Renders as a bento tile and as its own detail page. */
export interface AuctionItem {
  id: string;
  /** URL segment under /auction-items. */
  slug: string;
  /** Decorative emoji shown before the title. Rendered aria-hidden. */
  icon: string;
  title: string;
  blurb: string;
  image: ImageRef;
  /** Grid footprint in the bento layout. */
  span?: "wide" | "tall";
  /** Heading used on the category's own page. */
  heading: string;
  /** Longer introduction shown on the category page. */
  intro: string;
  seo: SeoMeta;
  groups: CategoryGroup[];
  /**
   * True when the client lists this only as a category, with no named lots —
   * the page then describes what the category contains rather than claiming
   * specific stock. Drives a different availability notice.
   */
  generalOnly?: boolean;
}

export interface ValueProp {
  id: string;
  icon: string;
  title: string;
  body: string;
}

/** One row of the donor incentive (Las Vegas package) grid. */
export interface DonorPerk {
  id: string;
  emoji: string;
  action: string;
  reward: string;
  note: string;
}

export interface Auctioneer {
  id: string;
  name: string;
  /** Shown in the avatar circle when no photograph exists. */
  initials: string;
  /**
   * Coverage area exactly as the client states it. Optional: two of the roster
   * have no territory published, and inventing one would assert coverage the
   * client has not claimed.
   */
  territory?: string;
  /** Short headline above the bio, e.g. "Enthusiasm. Professionalism. Results." */
  tagline?: string;
  /** Bio paragraphs, in order. */
  bio: string[];
  /** Footnoted role, e.g. "Senior Auctioneer / Consultant". */
  credential?: string;
  /** Accolade badge, e.g. "Million Dollar Paddle Raise". */
  accolade?: string;
  image?: ImageRef;
}

/** A non-auctioneer partner the client features on the same page. */
export interface Partner {
  id: string;
  name: string;
  role: string;
  bio: string[];
  closer?: string;
  image?: ImageRef;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  /** 1-5. Rendered as stars with an accessible text equivalent. */
  rating: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
}

export interface ContactChannel {
  id: string;
  icon: string;
  label: string;
  value: string;
  /** Absent for non-actionable rows such as the service area. */
  href?: string;
}

/** A single field in the contact form. Shaped to become a Phase 2 form-builder record. */
export interface FormField {
  id: string;
  /** Submitted key. Becomes the column name for stored submissions. */
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "date" | "textarea";
  placeholder?: string;
  required: boolean;
  /** Layout width within the two-column form grid. */
  width: "half" | "full";
}

/** Global site content: brand, navigation, contact details, footer. */
export interface SiteContent {
  name: string;
  /** Brand name split for the two-tone logo treatment. */
  logo: { lead: string; accent: string };
  tagline: string;
  strapline: string;
  description: string;
  nav: NavLink[];
  navCta: CtaRef;
  contact: {
    phone: string;
    phoneHref: string;
    email: string;
    secondaryEmail: string;
    principals: string;
    serviceArea: string;
    offices: string;
    channels: ContactChannel[];
  };
  /**
   * Calendly scheduling, offered on the contact form's success state so a lead
   * can book immediately instead of waiting on the follow-up.
   *
   * An empty `url` disables the widget and the success state falls back to the
   * thank-you message alone, so the scheduling link can be changed or pulled
   * without touching a component.
   */
  booking: {
    /** Bare scheduling URL — no query string; params are added at embed time. */
    url: string;
    /** Heading above the widget. */
    heading: string;
    /** One line of context under the heading. */
    lede: string;
    /** Text of the plain link shown if the embed cannot load. */
    fallbackLabel: string;
  };
  footer: {
    exploreHeading: string;
    contactHeading: string;
    legal: string;
  };
}

/* ------------------------------------------------------------------ */
/* Page shapes                                                         */
/* ------------------------------------------------------------------ */

/** Fields shared by every page. */
export interface BasePage {
  slug: PageSlug;
  seo: SeoMeta;
  /** The page's single <h1>. */
  heading: string;
}

export interface HomePage extends BasePage {
  slug: "home";
  hero: {
    pill: string;
    /** Split so the gold gradient can be applied to the second line only. */
    headingLead: string;
    headingAccent: string;
    sub: string;
    primaryCta: CtaRef;
    secondaryCta: CtaRef;
    stats: { id: string; value: string; label: string }[];
  };
  why: { header: SectionHeader; items: ValueProp[] };
  process: { header: SectionHeader; steps: Step[]; cta: CtaRef };
  itemsTeaser: { header: SectionHeader; items: AuctionItem[]; cta: CtaRef };
  testimonialsTeaser: { header: SectionHeader; cta: CtaRef };
  donor: DonorSection;
  closing: { header: SectionHeader; cta: CtaRef };
}

/** The donor incentive block. Lives on Home below the testimonials. */
export interface DonorSection {
  tag: string;
  header: SectionHeader;
  perks: DonorPerk[];
}

export interface AuctionInfoPage extends BasePage {
  slug: "auction-info";
  intro: SectionHeader;
  steps: Step[];
  pricing: { header: SectionHeader; points: ValueProp[] };
  formats: { header: SectionHeader; items: ValueProp[] };
  mobileBidding: { heading: string; body: string };
  cta: CtaRef;
}

export interface AuctionItemsPage extends BasePage {
  slug: "auction-items";
  intro: SectionHeader;
  items: AuctionItem[];
  note: string;
  cta: CtaRef;
}

export interface AuctioneersPage extends BasePage {
  slug: "auctioneers";
  intro: SectionHeader;
  /** Paragraph setting up why this roster is curated. */
  positioning: string;
  differentiators: { header: SectionHeader; items: ValueProp[] };
  offer: { headline: string; detail: string };
  rosterHeading: string;
  auctioneers: Auctioneer[];
  partners: { title: string; blurb: string; items: Partner[] };
  cta: CtaRef;
}

export interface FaqsPage extends BasePage {
  slug: "faqs";
  intro: SectionHeader;
  faqs: FaqItem[];
  cta: CtaRef;
}

export interface TestimonialsPage extends BasePage {
  slug: "testimonials";
  intro: SectionHeader;
  testimonials: Testimonial[];
  cta: CtaRef;
}

export interface ContactPage extends BasePage {
  slug: "contact";
  intro: SectionHeader;
  form: {
    fields: FormField[];
    submitLabel: string;
    successMessage: string;
    errorMessage: string;
  };
  mobileNote: { heading: string; body: string };
}

export type AnyPage =
  | HomePage
  | AuctionInfoPage
  | AuctionItemsPage
  | AuctioneersPage
  | FaqsPage
  | TestimonialsPage
  | ContactPage;

/** Maps each slug to its concrete page type, so `getPage('home')` returns `HomePage`. */
export interface PageMap {
  home: HomePage;
  "auction-info": AuctionInfoPage;
  "auction-items": AuctionItemsPage;
  auctioneers: AuctioneersPage;
  faqs: FaqsPage;
  testimonials: TestimonialsPage;
  contact: ContactPage;
}
