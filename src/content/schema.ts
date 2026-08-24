import { z } from "zod";

import { EMBED_HOSTS, embedProblem, isAllowedEmbed } from "@/lib/embeds";

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
  /**
   * Optional and omitted when false, exactly as `generalOnly` is on the
   * category. The column is NOT NULL DEFAULT FALSE, so the row always has an
   * answer; the document only carries the key when the answer is yes.
   */
  affordableTier: z
    .boolean()
    .optional()
    .describe(
      "Puts a gold star beside this lot, marking it as one of the more " +
        "affordable ones. Still no figure on the page — the star says which " +
        "tier it is in, and the opening bid stays a conversation."
    ),
  documentSlug: optionalText.describe(
    "The address of this lot's brochure in Documents — the part after /d/, " +
      "e.g. 'dream-vacation-getaway'. Adds a Print / Download button to the " +
      "card. A name that matches no document simply shows no button."
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
  "checkboxes",
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
  /**
   * Only meaningful for `checkboxes`. Optional rather than a separate schema
   * per type: a discriminated union here would have to be discriminated in the
   * field tree, the coercer and the renderer as well, for one question.
   *
   * A `checkboxes` field with no options renders nothing at all, which is the
   * honest outcome — there is no box to tick.
   */
  options: z
    .array(text)
    .optional()
    .describe(
      "The tick boxes offered, one per line. Only used when the kind above is " +
        "'checkboxes'. Whatever is ticked is what arrives with the enquiry."
    ),
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
    /**
     * The one figure left in the hero as a figure. The other three cards used
     * to be numbers too; they are links to real pages now, because a visitor
     * who wants guitars is better served by a way in than by a count of them.
     */
    badge: z.object({
      value: text.describe('The figure itself, e.g. "30+".'),
      label: text.describe('What it counts, e.g. "Years Experience".'),
    }),
    /**
     * The floating cards on the right of the hero. Each is a way straight into
     * a page rather than a statistic, so `href` is required here — a tile that
     * goes nowhere is a card the visitor clicks and nothing happens.
     */
    tiles: z.array(
      z.object({
        id: text,
        icon: text.describe(
          "Icon name from the site's set, e.g. 'guitar', 'palm-tree', 'gavel'."
        ),
        label: text.describe("The card's own line, e.g. 'Hand-Signed Guitars'."),
        sub: text.describe("The smaller line beneath it."),
        href: text.describe("Where the card goes. A path like /auction-items/vacations."),
      })
    ),
    /**
     * The donor incentive, promoted into the hero.
     *
     * It sits with the copy rather than in the tile stack on purpose. The tiles
     * are doors into the catalog — things the visitor can go and buy. This is a
     * different kind of claim: a free gift the nonprofit gives its donors at no
     * cost to itself, and the one genuinely free thing on the page. Filed as a
     * fourth tile it would read as a fourth category and be believed less, not
     * more.
     *
     * Optional, so the offer can be taken out of the hero by clearing it rather
     * than by a deploy — the same reason the FAQ video block is optional.
     *
     * WORDING IS LOAD-BEARING HERE. The package is hotels and shows donated by
     * partners; it is not travel, and it is not a free vacation in the sense a
     * visitor scanning a hero would assume. `label` is the line most likely to
     * be read alone, so it is the line that has to survive being read alone.
     */
    offer: z
      .object({
        icon: text.describe(
          "Icon name from the site's set. 'sparkles' reads as a gift rather than as travel."
        ),
        label: text.describe(
          'The headline claim, e.g. "Free Vegas Giveaway". Say what it actually is — ' +
            'not "Free Vacations", which reads as the catalog being free.'
        ),
        sub: text.describe("The qualifying line beneath it — what the package actually includes."),
        href: text.describe(
          'Where it goes. "#donor" is the incentive section further down this page.'
        ),
        cue: optionalText.describe(
          'The small gold prompt, e.g. "See how it works →". Optional.'
        ),
      })
      .optional(),
    /**
     * The walkthrough video, offered as a control beside "How It Works" rather
     * than as a player.
     *
     * An always-visible iframe in the hero would put a third-party frame in
     * front of the first paint and push the tiles off the fold, so this stores
     * the URL and a `linkLabel`, and the hero renders a button that opens the
     * player in a dialog. That is why the field is `linkLabel` and not
     * `caption` as on the FAQ page — the string is the control, not a note
     * under a frame.
     *
     * `embedUrl` is checked against `lib/embeds.ts` on save and again where it
     * renders, for the reason set out on the FAQ page's copy of this block.
     */
    video: z
      .object({
        heading: text.describe("The dialog's title, e.g. 'How donation matching works'."),
        lede: optionalText.describe("A line under the title inside the dialog. Optional."),
        embedUrl: text
          .refine(isAllowedEmbed, { message: embedProblem("") ?? "" })
          .describe(
            "The player address, from " +
              EMBED_HOSTS +
              ". For Google Drive that is the file address ending in /preview, " +
              "not /view — /view shows a sign-in wall inside a frame."
          ),
        linkLabel: text.describe(
          'The button in the hero, e.g. "Watch: How Donation Matching Works".'
        ),
      })
      .optional(),
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
  /**
   * Optional, which is the whole reason this needed no migration for the other
   * seven pages — and it stays optional so the block can be taken off the page
   * by clearing it rather than by a deploy.
   *
   * `embedUrl` is checked against the host list in `lib/embeds.ts` on save AND
   * again where it renders. It is the one editable field on this site that
   * decides what runs in a frame on the domain, so it does not get to be
   * free text with a hopeful description.
   */
  video: z
    .object({
      heading: text,
      lede: optionalText,
      embedUrl: text
        .refine(isAllowedEmbed, { message: embedProblem("") ?? "" })
        .describe(
          "The player address, from " +
            EMBED_HOSTS +
            ". For Google Drive that is the file address ending in /preview, " +
            "not /view — /view shows a sign-in wall inside a frame."
        ),
      caption: optionalText.describe("A line under the player. Optional."),
    })
    .optional(),
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
    /**
     * Optional, so a stored document written before this field existed still
     * parses — there is no migration to run for the pages that do not set it.
     */
    note: optionalText.describe(
      "A short line above the send button, for whatever someone hesitating " +
        "over it needs to hear. Leave empty for no line."
    ),
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
/* ------------------------------------------------------------------ */
/* Custom pages                                                        */
/* ------------------------------------------------------------------ */

/**
 * The blocks a client-built page is assembled from.
 *
 * A discriminated union, which is the reason the field editor grew a `variant`
 * node — before that it met one of these and rendered "a shape the editor
 * cannot show yet".
 *
 * Every block carries `id`, and it is load-bearing rather than decorative:
 * coercion matches a submitted entry to its stored self by id, never by
 * position, so reordering a page is an ordinary edit instead of a way to hand
 * one block's protected values to another.
 *
 * Kept deliberately small. Six shapes that reuse components already on the
 * site beats twenty that need new ones, and every extra shape is another thing
 * the client has to choose between before they can write a sentence. The names
 * avoid acronyms because the picker's labels are generated from them —
 * `faqList` would read "Faq list".
 */
const blockBase = { id: text };

/**
 * The layout controls a client may set on a content block.
 *
 * Every one is an enum, and that is the whole design: each value maps to a
 * class that has been written and looked at, so every combination a client can
 * reach is one somebody designed. A free number here — "margin in pixels" —
 * would be the same feature with none of that guarantee.
 *
 * FACTORIES RATHER THAN CONSTANTS, because the default has to differ per block
 * to preserve what the site renders today: a rich text block is 860px wide and
 * left-aligned, while a questions block is 1200px with a centred heading.
 * Sharing one default would silently restyle every live page on deploy, which
 * is a strange thing for a feature about choosing layouts to do.
 *
 * `.default()` rather than `.optional()` so a block stored before these
 * existed parses into the shape it already had. `buildFieldTree` peels a
 * default the same way it peels an optional, so the form draws a select for
 * each of these without knowing they are new.
 *
 * The two band blocks — call to action and enquiry form — deliberately have
 * none of this. Both render into a dark navy treatment with white text, and a
 * cream background on either produces white on cream. A control that can only
 * be used to break the page is not a control.
 */
const blockWidth = (fallback: "narrow" | "contained" | "full") =>
  z
    .enum(["narrow", "contained", "full"])
    .describe(
      "How wide the block runs. Narrow is easiest to read; full spans the window."
    )
    .default(fallback);

const blockSpacing = () =>
  z
    .enum(["tight", "normal", "loose"])
    .describe("How much room the block leaves above and below itself.")
    .default("normal");

const blockAlign = (fallback: "left" | "centre") =>
  z
    .enum(["left", "centre"])
    .describe("Which way the heading and text sit.")
    .default(fallback);

const blockBackground = () =>
  z
    .enum(["auto", "paper", "cream"])
    .describe(
      "Auto shades every other automatic block, so reordering never leaves two " +
        "shaded sections side by side. Choosing paper or cream fixes this one."
    )
    .default("auto");

export const richTextBlockSchema = z.object({
  ...blockBase,
  type: z.literal("richText"),
  eyebrow: optionalText.describe("Small label above the heading."),
  heading: optionalText,
  body: text.describe("The paragraph or paragraphs. Blank lines start a new paragraph."),
  width: blockWidth("narrow"),
  spacing: blockSpacing(),
  align: blockAlign("left"),
  background: blockBackground(),
});

export const imageAndTextBlockSchema = z.object({
  ...blockBase,
  type: z.literal("imageAndText"),
  image: imageRefSchema,
  heading: optionalText,
  body: text,
  imageSide: z
    .enum(["left", "right"])
    .describe("Which side the picture sits on. Stacks above the text on a phone either way."),
  width: blockWidth("contained"),
  spacing: blockSpacing(),
  // No `align`: the picture and the text are a two-column grid, and which side
  // the picture sits on is already `imageSide`. A second control over the same
  // arrangement would only be a way to disagree with the first.
  background: blockBackground(),
});

export const callToActionBlockSchema = z.object({
  ...blockBase,
  type: z.literal("callToAction"),
  heading: text,
  lede: optionalText,
  cta: ctaRefSchema,
});

export const questionsBlockSchema = z.object({
  ...blockBase,
  type: z.literal("questions"),
  heading: optionalText,
  items: z.array(z.object({ id: text, question: text, answer: text })),
  width: blockWidth("contained"),
  spacing: blockSpacing(),
  align: blockAlign("centre"),
  background: blockBackground(),
});

export const enquiryFormBlockSchema = z.object({
  ...blockBase,
  type: z.literal("enquiryForm"),
  heading: text,
  lede: optionalText.describe(
    "The questions themselves come from the contact page, so there is one form to keep up to date."
  ),
});

export const catalogTeaserBlockSchema = z.object({
  ...blockBase,
  type: z.literal("catalogTeaser"),
  heading: optionalText,
  lede: optionalText,
  count: z
    .number()
    .int()
    .min(1)
    .max(12)
    .describe("How many categories to show, newest first."),
  width: blockWidth("contained"),
  spacing: blockSpacing(),
  align: blockAlign("centre"),
  background: blockBackground(),
});

/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

/**
 * What may sit inside a column.
 *
 * A SEPARATE, SMALLER UNION THAN `pageBlockSchema`, and deliberately not that
 * one. Letting a column hold page blocks would make the schema recursive —
 * columns inside columns inside columns — which `buildFieldTree` would walk
 * until it ran out of stack, and which is where page builders reliably produce
 * layouts nobody can read on a phone. There is no such thing as a nested
 * column here, and there is nothing to disable to keep it that way.
 *
 * The three shapes are chosen for a NARROW MEASURE rather than reused from the
 * page-scale blocks. An `imageAndText` block is already a two-column split, so
 * putting one inside a column is a split inside a split; a call to action and
 * an enquiry form are both full-width dark bands. Those three are excluded by
 * not being in this union, which is a stronger statement than excluding them
 * in a comment.
 */
export const columnTextSchema = z.object({
  id: text,
  type: z.literal("text"),
  heading: optionalText,
  body: text.describe("The paragraph or paragraphs. Blank lines start a new paragraph."),
});

export const columnImageSchema = z.object({
  id: text,
  type: z.literal("image"),
  image: imageRefSchema,
});

export const columnButtonSchema = z.object({
  id: text,
  type: z.literal("button"),
  cta: ctaRefSchema,
});

export const columnItemSchema = z.discriminatedUnion("type", [
  columnTextSchema,
  columnImageSchema,
  columnButtonSchema,
]);

export const pageColumnSchema = z.object({
  id: text,
  items: z.array(columnItemSchema),
});

/**
 * Two or three columns side by side, stacking on a phone.
 *
 * `ratio` is the one thing here that is not obvious. It sets the split for TWO
 * columns and has no effect on three, which are always equal — that is written
 * into its description because the form renders descriptions, and a control
 * that quietly does nothing in one configuration is the fault this feature has
 * already produced more than once.
 *
 * The count is not validated against the ratio, and that is deliberate. Tying
 * them together needs a cross-field rule, which in Zod means wrapping this
 * object in a refinement — and a wrapped object is no longer a plain
 * `ZodObject`, which is what `discriminatedUnion` requires of its members and
 * what `buildFieldTree` reads a shape off. The cost of the rule is larger than
 * the cost of the thing it would prevent, which is a column layout that is
 * merely equal rather than the ratio somebody picked. Nothing is hidden and
 * nothing is lost either way: the renderer lays out whatever columns exist.
 *
 * Bounded at two and three. One column is not a column layout, and four in a
 * 1200px page gives each 280px, which is narrower than the measure any of the
 * three item shapes was designed for.
 */
export const columnsBlockSchema = z.object({
  ...blockBase,
  type: z.literal("columns"),
  heading: optionalText,
  ratio: z
    .enum(["equal", "wide-left", "wide-right"])
    .describe(
      "The split between TWO columns. Three columns are always equal, and this " +
        "is ignored for them."
    )
    .default("equal"),
  columns: z
    .array(pageColumnSchema)
    .min(2, "A column layout needs at least two columns.")
    .max(3, "Three columns is the most that fits; use two for anything longer."),
  width: blockWidth("contained"),
  spacing: blockSpacing(),
  align: blockAlign("left"),
  background: blockBackground(),
});

export const pageBlockSchema = z.discriminatedUnion("type", [
  richTextBlockSchema,
  imageAndTextBlockSchema,
  callToActionBlockSchema,
  questionsBlockSchema,
  enquiryFormBlockSchema,
  catalogTeaserBlockSchema,
  columnsBlockSchema,
]);

/**
 * Whether a custom page is listed anywhere.
 *
 * `unlisted` means exactly what the word says and no more: not in the
 * navigation, not in the sitemap, and carrying `noindex, nofollow` — but still
 * served to anyone who has the address. It is NOT private, and the admin says
 * so in those words, because a client who reads "hidden" as "only the people I
 * send it to" will eventually put something on one that should not be public.
 *
 * Real privacy would mean an access gate, and that is a different feature with
 * a different cost. This one is honest about what it is.
 */
export const pageVisibilitySchema = z.enum(["public", "unlisted"]);

export const customPageSchema = z.object({
  slug: text,
  title: text.describe("Shown as the page's heading and in the navigation."),
  visibility: pageVisibilitySchema,
  seo: seoMetaSchema,
  intro: optionalText.describe("One or two lines under the heading. Optional."),
  blocks: z.array(pageBlockSchema),
});

export type PageBlock = z.infer<typeof pageBlockSchema>;
export type ColumnItem = z.infer<typeof columnItemSchema>;
export type PageColumn = z.infer<typeof pageColumnSchema>;

/**
 * A block as it is WRITTEN, before defaults are applied.
 *
 * `PageBlock` is the parsed shape, in which every layout field is present
 * because `.default()` has filled it in. A page template is written by hand
 * and should not have to restate a default to be valid, so it is typed against
 * the input side instead — where a defaulted field is optional. Typing the
 * templates against the output side made adding these four fields a
 * compile error in four templates that were already correct.
 */
export type PageBlockInput = z.input<typeof pageBlockSchema>;
export type CustomPage = z.infer<typeof customPageSchema>;
export type PageVisibility = z.infer<typeof pageVisibilitySchema>;

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
