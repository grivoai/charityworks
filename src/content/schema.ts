import { z } from "zod";

/**
 * Runtime schema for the CharityWorks content model.
 *
 * Phase 1 kept the content in TypeScript modules, where the compiler guaranteed
 * every shape. Phase 2 stores it as `jsonb`, which is `unknown` at runtime — so
 * that guarantee has to be rebuilt here rather than lost.
 *
 * These schemas do three jobs:
 *   1. Validate on write, so malformed content cannot be saved.
 *   2. Parse on read, so a bad row fails loudly instead of rendering `undefined`.
 *   3. Generate the admin's form fields, so there is one description of a shape
 *      rather than a schema and a hand-built form that drift apart.
 *
 * `src/content/types.ts` re-exports the inferred types under their original
 * names, so nothing that imports from `@/content/types` had to change.
 *
 * On `.describe()`: it is not documentation for developers — that is what the
 * comments are for. Every `.describe()` here is help text that will be rendered
 * next to an input in the admin, so it is addressed to whoever is filling the
 * field in, and it is where the content rules that used to live in a code
 * comment get told to the person they actually constrain.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Non-empty after trimming. Most content fields are required to say something. */
const text = z.string().trim().min(1);

/** Optional free text. Empty strings normalise to undefined so "" and unset agree. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const pageSlugSchema = z.enum([
  "home",
  "auction-info",
  "auction-items",
  "auction-planner",
  "auctioneers",
  "faqs",
  "testimonials",
  "contact",
]);

/**
 * An image. An object rather than a URL string so an upload record (storage
 * key, dimensions, uploader, alt text) slots in without a shape change.
 */
export const imageRefSchema = z.object({
  src: text,
  alt: text.describe(
    "Describe what the photo shows, for screen readers and search engines. " +
      "Required — an image with no alt text is a gap in both."
  ),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const seoMetaSchema = z.object({
  title: text.describe(
    "The browser tab and search result title. Written full length — nothing is appended to it."
  ),
  description: text.describe(
    "The grey line under the title in search results. Aim for 140–160 characters."
  ),
  targetTerms: z
    .array(text)
    .describe(
      "Search terms this page is meant to win. Notes for you — these are not published anywhere."
    ),
  path: text.describe("Path from the site root, e.g. /auction-items."),
});

export const buttonVariantSchema = z.enum(["primary", "secondary", "solid"]);

export const ctaRefSchema = z.object({
  id: text,
  label: text.describe("The words on the button."),
  href: text.describe("Where it goes. A path like /contact, or a full URL."),
  variant: buttonVariantSchema,
});

/** The eyebrow / title / lede trio that opens most sections. */
export const sectionHeaderSchema = z.object({
  eyebrow: optionalText.describe("Small label above the title."),
  title: text,
  lede: optionalText.describe("One or two lines under the title."),
});

export const stepSchema = z.object({
  id: text,
  number: text.describe(
    "The number shown on the step. Set explicitly rather than counted, so steps can be reordered."
  ),
  icon: text.describe(
    'An icon name from the set (e.g. "guitar", "shield-check", "handshake"). Decorative — screen readers skip it.'
  ),
  title: text,
  body: text,
});

export const valuePropSchema = z.object({
  id: text,
  icon: text.describe(
    'An icon name from the set (e.g. "guitar", "shield-check", "handshake"). Decorative — screen readers skip it.'
  ),
  title: text,
  body: text,
});

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

/**
 * One labelled specific about a lot.
 *
 * A free-form label/value pair rather than fixed fields: what is known differs
 * by category, and a fixed shape would either force empty rows or invite
 * filling them in with guesses. A row that is not supplied is not shown.
 */
export const itemDetailSchema = z.object({
  label: text.describe('For example "Framed size", "Includes", "Lead time".'),
  value: text.describe(
    "Must come from the client. Do not describe what a photo appears to show, " +
      "and do not include prices, retail values or estimates — the site quotes " +
      "no figure for any individual lot."
  ),
});

export const categoryItemSchema = z.object({
  id: text,
  name: text,
  description: text,
  image: imageRefSchema.optional(),
  note: optionalText.describe(
    "A disclaimer shown under this lot only, e.g. required availability wording."
  ),
  details: z
    .array(itemDetailSchema)
    .optional()
    .describe(
      "Verified specifics, shown as a list on the card. Leave empty until the " +
        "client supplies them — the card simply renders without the block."
    ),
});

/**
 * A titled block of lots within a category.
 *
 * Exists so tiers stay visually distinct — hand-signed pieces must be separable
 * from reproduced or laser-signature ones, which are a materially different and
 * cheaper product. Collapsing them into one list would misrepresent what a
 * bidder is getting.
 */
export const categoryGroupSchema = z.object({
  id: text,
  title: optionalText,
  blurb: optionalText,
  items: z.array(categoryItemSchema),
});

export const auctionItemSchema = z.object({
  id: text,
  slug: text.describe("URL segment under /auction-items."),
  icon: text.describe(
    'An icon name from the set (e.g. "guitar", "shield-check", "handshake"). Decorative — screen readers skip it.'
  ),
  title: text,
  blurb: text.describe(
    "Appears in three places: the tile on the home and auction items pages, " +
      "the line under the heading on this category's own page, and the auction " +
      "planner's results card. Editing it changes all three."
  ),
  image: imageRefSchema,
  span: z.enum(["wide", "tall"]).optional(),
  heading: text.describe("The main heading on this category's own page."),
  intro: text.describe("The longer introduction on this category's own page."),
  seo: seoMetaSchema,
  groups: z.array(categoryGroupSchema),
  generalOnly: z
    .boolean()
    .optional()
    .describe(
      "On when this is listed as a category with no named lots. The page then " +
        "describes what the category contains rather than claiming specific stock."
    ),
});

/* ------------------------------------------------------------------ */
/* People and social proof                                             */
/* ------------------------------------------------------------------ */

export const donorPerkSchema = z.object({
  id: text,
  emoji: text,
  action: text,
  reward: text,
  note: text,
});

export const auctioneerSchema = z.object({
  id: text,
  name: text,
  initials: text.describe("Shown in the circle when there is no photograph."),
  territory: optionalText.describe(
    "Where they work, exactly as the client states it. Leave empty if the " +
      "client has not published one — inventing a territory asserts coverage " +
      "they have not claimed."
  ),
  tagline: optionalText,
  bio: z.array(text).describe("Bio paragraphs, in order."),
  credential: optionalText,
  accolade: optionalText,
  image: imageRefSchema.optional(),
});

export const partnerSchema = z.object({
  id: text,
  name: text,
  role: text,
  bio: z.array(text),
  closer: optionalText,
  image: imageRefSchema.optional(),
});

export const testimonialSchema = z.object({
  id: text,
  quote: text,
  author: text,
  role: text,
  rating: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 to 5. Rendered as stars, with a text equivalent for screen readers."),
});

export const faqItemSchema = z.object({
  id: text,
  question: text,
  answer: text,
});

/* ------------------------------------------------------------------ */
/* Site globals                                                        */
/* ------------------------------------------------------------------ */

export const navLinkSchema = z.object({
  id: text,
  label: text,
  href: text,
});

export const contactChannelSchema = z.object({
  id: text,
  icon: text,
  label: text,
  value: text,
  href: optionalText.describe(
    "Leave empty for rows that are not clickable, such as the service area."
  ),
});

export const formFieldTypeSchema = z.enum([
  "text",
  "email",
  "tel",
  "date",
  "textarea",
]);

export const formFieldSchema = z.object({
  id: text,
  name: text.describe(
    "The key this field is submitted under. Fixed for the built-in fields — " +
      "the lead pipeline reads these names."
  ),
  label: text,
  type: formFieldTypeSchema,
  placeholder: optionalText,
  required: z.boolean(),
  width: z
    .enum(["half", "full"])
    .describe("Half sits two-per-row on desktop; full spans the form."),
});

export const siteContentSchema = z.object({
  name: text,
  logo: z.object({ lead: text, accent: text }),
  tagline: text,
  strapline: text,
  description: text,
  nav: z.array(navLinkSchema),
  navCta: ctaRefSchema,
  contact: z.object({
    phone: text,
    phoneHref: text,
    email: z.email(),
    secondaryEmail: z.email(),
    principals: text,
    serviceArea: text,
    offices: text,
    channels: z.array(contactChannelSchema),
  }),
  /**
   * Calendly scheduling, offered on the contact form's success state.
   *
   * `url` is the one field here that may legitimately be empty: emptying it
   * disables the widget and the success state falls back to the thank-you
   * message alone, so the scheduling link can be pulled without a code change.
   */
  booking: z.object({
    url: z
      .union([z.literal(""), z.url()])
      .describe(
        "The bare scheduling link, with no ?query on the end — parameters are " +
          "added automatically. Leave empty to switch the booking widget off."
      ),
    heading: text,
    lede: text,
    fallbackLabel: text.describe(
      "The plain link shown if the booking widget cannot load."
    ),
  }),
  footer: z.object({
    exploreHeading: text,
    contactHeading: text,
    legal: text,
  }),
});

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const basePage = {
  seo: seoMetaSchema,
  heading: text.describe("The page's main heading. There is exactly one."),
};

export const homePageSchema = z.object({
  ...basePage,
  slug: z.literal("home"),
  hero: z.object({
    pill: text,
    headingLead: text.describe("First line of the heading, in white."),
    headingAccent: text.describe("Second line, in the gold gradient."),
    sub: text,
    primaryCta: ctaRefSchema,
    secondaryCta: ctaRefSchema,
    stats: z.array(z.object({ id: text, value: text, label: text })),
  }),
  why: z.object({ header: sectionHeaderSchema, items: z.array(valuePropSchema) }),
  process: z.object({
    header: sectionHeaderSchema,
    steps: z.array(stepSchema),
    cta: ctaRefSchema,
  }),
  /**
   * No `items` here. The tiles are the first few catalog categories, read live
   * from the catalog tables. Storing a copy in this record would freeze it: a
   * category added in the admin would appear on its own page and be missing
   * from the home page, which is the kind of bug the client finds rather than
   * we do.
   */
  itemsTeaser: z.object({
    header: sectionHeaderSchema,
    cta: ctaRefSchema,
  }),
  testimonialsTeaser: z.object({
    header: sectionHeaderSchema,
    cta: ctaRefSchema,
  }),
  donor: z.object({
    tag: text,
    header: sectionHeaderSchema,
    perks: z.array(donorPerkSchema),
  }),
  closing: z.object({ header: sectionHeaderSchema, cta: ctaRefSchema }),
});

export const auctionInfoPageSchema = z.object({
  ...basePage,
  slug: z.literal("auction-info"),
  intro: sectionHeaderSchema,
  steps: z.array(stepSchema),
  pricing: z.object({
    header: sectionHeaderSchema,
    points: z.array(valuePropSchema),
  }),
  formats: z.object({
    header: sectionHeaderSchema,
    items: z.array(valuePropSchema),
  }),
  mobileBidding: z.object({ heading: text, body: text }),
  cta: ctaRefSchema,
});

/** Also carries no `items` — the grid reads the catalog. See HomePage above. */
export const auctionItemsPageSchema = z.object({
  ...basePage,
  slug: z.literal("auction-items"),
  intro: sectionHeaderSchema,
  note: text,
  cta: ctaRefSchema,
});

export const auctioneersPageSchema = z.object({
  ...basePage,
  slug: z.literal("auctioneers"),
  intro: sectionHeaderSchema,
  positioning: text,
  differentiators: z.object({
    header: sectionHeaderSchema,
    items: z.array(valuePropSchema),
  }),
  /**
   * No figure belongs in either field. The site quotes no price for anything —
   * those conversations happen on the phone — so the offer is described in
   * relative terms ("half their usual base rate") rather than an amount.
   */
  offer: z.object({
    headline: text,
    detail: text.describe(
      "Describe the offer without naming a price. The site quotes no figures — " +
        "pricing is a phone conversation."
    ),
  }),
  rosterHeading: text,
  auctioneers: z.array(auctioneerSchema),
  partners: z.object({
    title: text,
    blurb: text,
    items: z.array(partnerSchema),
  }),
  cta: ctaRefSchema,
});

export const faqsPageSchema = z.object({
  ...basePage,
  slug: z.literal("faqs"),
  intro: sectionHeaderSchema,
  faqs: z.array(faqItemSchema),
  cta: ctaRefSchema,
});

export const testimonialsPageSchema = z.object({
  ...basePage,
  slug: z.literal("testimonials"),
  intro: sectionHeaderSchema,
  testimonials: z.array(testimonialSchema),
  cta: ctaRefSchema,
});

export const contactPageSchema = z.object({
  ...basePage,
  slug: z.literal("contact"),
  intro: sectionHeaderSchema,
  form: z.object({
    fields: z.array(formFieldSchema),
    submitLabel: text,
    successMessage: text.describe(
      "Shown after a successful submission, above the booking widget."
    ),
    errorMessage: text,
  }),
  mobileNote: z.object({ heading: text, body: text }),
});

/* ------------------------------------------------------------------ */
/* Auction planner                                                     */
/* ------------------------------------------------------------------ */

export const plannerQuestionIdSchema = z.enum([
  "eventType",
  "attendance",
  "format",
  "priceBand",
  "interests",
]);

export const plannerOptionSchema = z.object({
  id: text,
  label: text,
  summaryLabel: text.describe("Echoed back as a chip on the results screen."),
  weights: z
    .record(z.string(), z.number())
    .optional()
    .describe(
      "Points this answer adds to each auction category. An answer with no " +
        "weights is deliberately neutral, so 'not sure' costs nothing rather " +
        "than skewing the result."
    ),
  exclusive: z
    .boolean()
    .optional()
    .describe(
      "Clears every other choice when picked. Used by 'Not sure' on the " +
        "multi-select question so it stays an answer rather than becoming one " +
        "more thing to tick alongside real preferences."
    ),
});

export const plannerQuestionSchema = z.object({
  id: plannerQuestionIdSchema,
  prompt: text,
  help: optionalText,
  maxChoices: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Set only on multi-select questions. Absent means pick exactly one."),
  options: z.array(plannerOptionSchema),
});

export const auctionPlannerPageSchema = z.object({
  ...basePage,
  slug: z.literal("auction-planner"),
  intro: sectionHeaderSchema,
  start: z.object({ blurb: text, button: text, duration: text }),
  results: z.object({
    heading: text,
    lede: text,
    answersLabel: text,
    picksHeading: text,
    restart: text,
  }),
  /**
   * Shown only when the auction runs live, in whole or in part.
   *
   * The body has to state where the roster actually works. Seven of the nine
   * publish a territory and six of those are Californian, while the catalog
   * side of the business serves all 50 states — so a bare "book an auctioneer"
   * would promise a reach this roster does not have.
   */
  auctioneerCard: z.object({
    heading: text,
    body: text.describe(
      "Say where the roster actually works. The auctioneers are " +
        "California-focused even though the catalog serves all 50 states."
    ),
    linkLabel: text,
    href: text,
  }),
  cta: ctaRefSchema,
});

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

/** Every page, discriminated on slug so a row parses to its concrete shape. */
export const anyPageSchema = z.discriminatedUnion("slug", [
  homePageSchema,
  auctionInfoPageSchema,
  auctionItemsPageSchema,
  auctionPlannerPageSchema,
  auctioneersPageSchema,
  faqsPageSchema,
  testimonialsPageSchema,
  contactPageSchema,
]);

/**
 * Slug to schema. The repository uses this to pick the right parser for a row,
 * which is what makes `getPage("home")` return a validated `HomePage` rather
 * than `unknown` cast into hope.
 */
export const pageSchemas = {
  home: homePageSchema,
  "auction-info": auctionInfoPageSchema,
  "auction-items": auctionItemsPageSchema,
  "auction-planner": auctionPlannerPageSchema,
  auctioneers: auctioneersPageSchema,
  faqs: faqsPageSchema,
  testimonials: testimonialsPageSchema,
  contact: contactPageSchema,
} as const;

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */
/* Re-exported from content/types.ts under these same names, so every existing
   `import type { ... } from "@/content/types"` keeps working unchanged. */

export type PageSlug = z.infer<typeof pageSlugSchema>;
export type ImageRef = z.infer<typeof imageRefSchema>;
export type SeoMeta = z.infer<typeof seoMetaSchema>;
export type ButtonVariant = z.infer<typeof buttonVariantSchema>;
export type CtaRef = z.infer<typeof ctaRefSchema>;
export type SectionHeader = z.infer<typeof sectionHeaderSchema>;
export type Step = z.infer<typeof stepSchema>;
export type ValueProp = z.infer<typeof valuePropSchema>;
export type ItemDetail = z.infer<typeof itemDetailSchema>;
export type CategoryItem = z.infer<typeof categoryItemSchema>;
export type CategoryGroup = z.infer<typeof categoryGroupSchema>;
export type AuctionItem = z.infer<typeof auctionItemSchema>;
export type DonorPerk = z.infer<typeof donorPerkSchema>;
export type Auctioneer = z.infer<typeof auctioneerSchema>;
export type Partner = z.infer<typeof partnerSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type NavLink = z.infer<typeof navLinkSchema>;
export type ContactChannel = z.infer<typeof contactChannelSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;

export type HomePage = z.infer<typeof homePageSchema>;
export type AuctionInfoPage = z.infer<typeof auctionInfoPageSchema>;
export type AuctionItemsPage = z.infer<typeof auctionItemsPageSchema>;
export type AuctionPlannerPage = z.infer<typeof auctionPlannerPageSchema>;
export type AuctioneersPage = z.infer<typeof auctioneersPageSchema>;
export type FaqsPage = z.infer<typeof faqsPageSchema>;
export type TestimonialsPage = z.infer<typeof testimonialsPageSchema>;
export type ContactPage = z.infer<typeof contactPageSchema>;
export type AnyPage = z.infer<typeof anyPageSchema>;

export type PlannerQuestionId = z.infer<typeof plannerQuestionIdSchema>;
export type PlannerOption = z.infer<typeof plannerOptionSchema>;
export type PlannerQuestion = z.infer<typeof plannerQuestionSchema>;

/** Maps each slug to its concrete page type, so `getPage('home')` returns `HomePage`. */
export interface PageMap {
  home: HomePage;
  "auction-info": AuctionInfoPage;
  "auction-items": AuctionItemsPage;
  "auction-planner": AuctionPlannerPage;
  auctioneers: AuctioneersPage;
  faqs: FaqsPage;
  testimonials: TestimonialsPage;
  contact: ContactPage;
}

/** The section of a page that renders no differently but is stored separately. */
export type DonorSection = HomePage["donor"];
