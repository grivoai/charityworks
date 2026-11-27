import { z } from "zod";

import { imageRefSchema } from "@/content/schema";
import { guitarPrices } from "@/content/guitar-prices";
import { travelVoucher, voucherBooking, voucherTerms } from "@/content/voucher-program";

/**
 * The three HIDDEN pages, as documents the admin can edit:
 *
 *   /guitar-prices                  slug "guitar-prices"
 *   /travel_voucher                 slug "travel-voucher"
 *   /terms-and-conditions-voucher   slug "voucher-terms"
 *
 * They are stored in the `pages` table beside the eight built-in pages and
 * edited with the same form, the same save action and the same history. They
 * are kept OUT of `pageSlugSchema` on purpose. That list drives the sitemap,
 * /llms.txt, the seed and the admin's nav-link picker, and a hidden page must
 * be in none of them. Leaving them out of it is what keeps them hidden.
 *
 * THE FALLBACK. Each page's wording is still in the code
 * (`guitar-prices.ts`, `voucher-program.ts`), and `HIDDEN_PAGE_DEFAULTS` below
 * turns it into a document. A page renders that document whenever its row is
 * missing or does not match the schema, so it can never go blank. It is also
 * where an edit starts: no row exists until Lauri's first save, and the first
 * version in the history is this wording.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Non-empty after trimming, as in schema.ts. */
const text = z.string().trim().min(1);

/** Optional free text. An empty input means "not set", as in schema.ts. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const paragraphs = (help: string) =>
  z.array(text).describe(`${help} One box per paragraph.`);

/** The browser tab and link-preview wording. The page is never in search results. */
const hiddenSeoSchema = z.object({
  title: text.describe(
    "The browser tab title. The site's name is added after it. This page is " +
      "hidden from search engines, so it is never a search result."
  ),
  description: text.describe(
    "Shown when the link is shared in a message or on social media."
  ),
});

const bookingSchema = z.object({
  label: text.describe("The words on the gold button at the foot of the page."),
  href: text.describe("Where the button goes. A full web address."),
});

/* ------------------------------------------------------------------ */
/* /guitar-prices                                                      */
/* ------------------------------------------------------------------ */

export const pricedGuitarSchema = z.object({
  id: text,
  name: text.describe('The first line of the card, e.g. "Morgan Wallen".'),
  kind: text.describe('The line under the name, e.g. "Hand-Signed Acoustic Guitar".'),
  price: text.describe('As it should read, e.g. "$950".'),
  image: imageRefSchema,
});

/** Text shown under a row of two guitars. Every part is optional except the paragraphs list. */
export const guitarSectionSchema = z.object({
  id: text,
  heading: optionalText.describe("Optional. A large heading above the paragraphs."),
  paragraphs: paragraphs("The section's paragraphs. Leave the list empty for none."),
  bullets: z
    .array(text)
    .describe("Optional. A bulleted list under the paragraphs."),
  guideLine: optionalText.describe(
    "Optional. A line followed by the Download PDF button. Both appear only " +
      'while the "Hand-Signed Guitars - Fundraising Info" document is uploaded ' +
      "in Documents."
  ),
  highlightLead: optionalText.describe(
    "Optional. The line introducing the large list below it."
  ),
  highlights: z
    .array(text)
    .describe('Optional. A large list, e.g. "Silent Auction", "Live Auction", "Raffle".'),
});

export const guitarPricesPageSchema = z.object({
  slug: z.literal("guitar-prices"),
  seo: hiddenSeoSchema,
  heading: text.describe("The large heading at the top of the page."),
  lede: text.describe("The paragraph under the heading."),
  paragraphs: paragraphs("The paragraphs after that, before the verification link."),
  verify: z.object({
    lead: text.describe("The words before the verification link."),
    href: text.describe("The verification web address. It is shown as the link text too."),
  }),
  closingParagraphs: paragraphs("The paragraphs after the verification link."),
  priceLabel: text.describe('Printed before every price, e.g. "Charity Price".'),
  consignmentLabel: text.describe('Printed under every price, e.g. "(Consignment)".'),
  guitars: z
    .array(pricedGuitarSchema)
    .min(1)
    .describe(
      "The guitars, two to a row, in this order. Drag to reorder. Adding or " +
        "removing one moves every later guitar along; the text sections stay " +
        "where they are."
    ),
  sections: z
    .array(guitarSectionSchema)
    .describe(
      "The text under each row of guitars: the first section goes under the " +
        "first row, the second under the second, and so on. The last row has " +
        "the closing section instead; any spare sections go just above it."
    ),
  closing: z.object({
    heading: optionalText.describe("Optional. The heading under the last row of guitars."),
    guideBefore: text.describe(
      "The words before the guide's linked title. This line and the Download " +
        'PDF button appear only while the "Hand-Signed Guitars - Fundraising ' +
        'Info" document is uploaded in Documents.'
    ),
    guideTitle: text.describe("The guide's title, which links to the PDF."),
    guideAfter: text.describe("The words after the guide's title."),
  }),
  guideButton: text.describe("The words on both Download PDF buttons."),
  booking: bookingSchema,
});

export type GuitarPricesPage = z.infer<typeof guitarPricesPageSchema>;
export type PricedGuitar = z.infer<typeof pricedGuitarSchema>;
export type GuitarSection = z.infer<typeof guitarSectionSchema>;

/* ------------------------------------------------------------------ */
/* /travel_voucher                                                     */
/* ------------------------------------------------------------------ */

export const voucherFaqSchema = z.object({
  id: text,
  question: text,
  answer: paragraphs("The answer."),
  bullets: z.array(text).describe("Optional. A bulleted list under the answer."),
});

export const travelVoucherPageSchema = z.object({
  slug: z.literal("travel-voucher"),
  seo: hiddenSeoSchema,
  heading: text.describe("The large heading at the top of the page."),
  lede: text.describe("The line under the heading."),
  steps: paragraphs("How the program works, one step per box, in order."),
  explanation: paragraphs("The paragraphs after the steps, on the tinted band."),
  faqHeading: text.describe("The heading above the questions."),
  faqs: z.array(voucherFaqSchema).describe("The questions and answers, in order."),
  booking: bookingSchema.describe(
    "The button under the questions. The terms page has its own copy of this button."
  ),
  /** A text link under that button. Drawn only when both halves are set. */
  eventLinkLabel: optionalText.describe(
    'Optional text link under the button, e.g. "See how it works at your event". ' +
      "Shown only when the address below is filled in too."
  ),
  eventLinkHref: optionalText.describe(
    "Where that text link goes, e.g. /#donor. Leave empty to hide the link."
  ),
});

export type TravelVoucherPage = z.infer<typeof travelVoucherPageSchema>;

/* ------------------------------------------------------------------ */
/* /terms-and-conditions-voucher                                       */
/* ------------------------------------------------------------------ */

export const voucherTermsPageSchema = z.object({
  slug: z.literal("voucher-terms"),
  seo: hiddenSeoSchema,
  heading: text.describe("The large heading at the top of the page."),
  lede: text.describe("The line under the heading."),
  terms: z.array(text).describe("The terms, one bullet per box, in order."),
  dining: z.object({
    heading: text,
    paragraphs: paragraphs("The gift card details."),
  }),
  booking: bookingSchema.describe(
    "The button at the foot of the page. The travel voucher page has its own copy of this button."
  ),
});

export type VoucherTermsPage = z.infer<typeof voucherTermsPageSchema>;

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const hiddenPageSchemas = {
  "guitar-prices": guitarPricesPageSchema,
  "travel-voucher": travelVoucherPageSchema,
  "voucher-terms": voucherTermsPageSchema,
} as const;

export type HiddenPageSlug = keyof typeof hiddenPageSchemas;

export interface HiddenPageMap {
  "guitar-prices": GuitarPricesPage;
  "travel-voucher": TravelVoucherPage;
  "voucher-terms": VoucherTermsPage;
}

export const HIDDEN_PAGE_SLUGS = Object.keys(hiddenPageSchemas) as HiddenPageSlug[];

export function isHiddenPageSlug(value: unknown): value is HiddenPageSlug {
  return typeof value === "string" && value in hiddenPageSchemas;
}

/**
 * The public address of each. These are the old site's addresses, printed on
 * vouchers and handed out, so they must never change.
 */
export const HIDDEN_PAGE_PATHS: Record<HiddenPageSlug, string> = {
  "guitar-prices": "/guitar-prices",
  "travel-voucher": "/travel_voucher",
  "voucher-terms": "/terms-and-conditions-voucher",
};

export const HIDDEN_PAGE_LABELS: Record<HiddenPageSlug, string> = {
  "guitar-prices": "Guitar prices",
  "travel-voucher": "Travel voucher: how it works & FAQ",
  "voucher-terms": "Travel voucher: terms and conditions",
};

/**
 * The PDF behind both Download PDF buttons on /guitar-prices.
 *
 * Not a field. The buttons point at whatever is uploaded in Documents under
 * this address, so replacing the PDF there replaces it here with no edit.
 */
export const GUITAR_GUIDE_DOCUMENT_SLUG = guitarPrices.guideDocumentSlug;

/* ------------------------------------------------------------------ */
/* Defaults: today's wording, from the code                            */
/* ------------------------------------------------------------------ */

const guitarDefault: GuitarPricesPage = {
  slug: "guitar-prices",
  seo: { ...guitarPrices.seo },
  heading: guitarPrices.about.heading,
  lede: guitarPrices.about.paragraphs[0],
  paragraphs: guitarPrices.about.paragraphs.slice(1),
  verify: { ...guitarPrices.about.verify },
  closingParagraphs: [...guitarPrices.about.closing],
  priceLabel: guitarPrices.priceLabel,
  consignmentLabel: guitarPrices.consignmentLabel,
  guitars: guitarPrices.rows.flatMap((row) =>
    row.guitars.map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      price: g.price,
      image: { ...g.image },
    }))
  ),
  sections: guitarPrices.rows.slice(0, -1).map((row, index) => {
    const after = row.after as typeof row.after & {
      bullets?: string[];
      guide?: { lead: string };
      ways?: { lead: string; items: string[] };
    };
    return {
      id: `section-${index + 1}`,
      ...(after.heading ? { heading: after.heading } : {}),
      paragraphs: [...after.paragraphs],
      bullets: [...(after.bullets ?? [])],
      ...(after.guide ? { guideLine: after.guide.lead } : {}),
      ...(after.ways ? { highlightLead: after.ways.lead } : {}),
      highlights: [...(after.ways?.items ?? [])],
    };
  }),
  closing: {
    ...(guitarPrices.rows.at(-1)?.after.heading
      ? { heading: guitarPrices.rows.at(-1)?.after.heading }
      : {}),
    guideBefore: guitarPrices.closingGuide.before,
    guideTitle: guitarPrices.closingGuide.title,
    guideAfter: guitarPrices.closingGuide.after,
  },
  guideButton: guitarPrices.guideButton,
  booking: { ...guitarPrices.booking },
};

const travelDefault: TravelVoucherPage = {
  slug: "travel-voucher",
  seo: { ...travelVoucher.seo },
  heading: travelVoucher.heading,
  lede: travelVoucher.lede,
  steps: [...travelVoucher.steps],
  explanation: [...travelVoucher.why],
  faqHeading: travelVoucher.faqHeading,
  faqs: travelVoucher.faqs.map((faq, index) => ({
    id: `faq-${index + 1}`,
    question: faq.question,
    answer: [...faq.answer],
    bullets: [...(("bullets" in faq && faq.bullets) || [])],
  })),
  booking: { ...voucherBooking },
};

const termsDefault: VoucherTermsPage = {
  slug: "voucher-terms",
  seo: { ...voucherTerms.seo },
  heading: voucherTerms.heading,
  lede: voucherTerms.lede,
  terms: [...voucherTerms.terms],
  dining: {
    heading: voucherTerms.dining.heading,
    paragraphs: [...voucherTerms.dining.paragraphs],
  },
  booking: { ...voucherBooking },
};

export const HIDDEN_PAGE_DEFAULTS: HiddenPageMap = {
  "guitar-prices": guitarDefault,
  "travel-voucher": travelDefault,
  "voucher-terms": termsDefault,
};

/** A fresh copy, so a caller cannot mutate the fallback for everyone after it. */
export function hiddenPageDefault<S extends HiddenPageSlug>(slug: S): HiddenPageMap[S] {
  return structuredClone(HIDDEN_PAGE_DEFAULTS[slug]);
}

/**
 * The stored document if it is valid, otherwise today's wording from the code.
 *
 * `problem` says why the fallback was used, for a log line. It is undefined
 * when the stored document was used, or when there was no row, which is normal
 * until the first save.
 */
export function resolveHiddenPage<S extends HiddenPageSlug>(
  slug: S,
  stored: unknown | null
): { page: HiddenPageMap[S]; problem?: string } {
  if (stored === null || stored === undefined) return { page: hiddenPageDefault(slug) };
  const parsed = hiddenPageSchemas[slug].safeParse(stored);
  if (parsed.success) return { page: parsed.data as HiddenPageMap[S] };
  return {
    page: hiddenPageDefault(slug),
    problem: parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.map(String).join(".") || "(page)"} ${i.message}`)
      .join("; "),
  };
}
