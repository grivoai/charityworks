/**
 * Parses every existing content module through its Zod schema.
 *
 * TypeScript already proves the shapes match — the content modules are typed
 * against these same inferred types, so a clean `tsc` means the structure is
 * right. This checks what the compiler cannot: the runtime constraints. A
 * required string that is present but empty, a rating outside 1–5, a malformed
 * email, a booking URL that is not a URL. Those all typecheck and all fail at
 * the database boundary.
 *
 * It has to pass before the seed runs. A schema that rejects the site's own
 * content would either block the migration or, worse, quietly drop fields.
 *
 *     npm run check:content
 */
import {
  anyPageSchema,
  auctionItemSchema,
  auctioneerSchema,
  faqItemSchema,
  partnerSchema,
  plannerQuestionSchema,
  siteContentSchema,
  stepSchema,
  testimonialSchema,
  valuePropSchema,
} from "../src/content/schema";
import type { ZodType } from "zod";

import { site } from "../src/content/site";
import { homePage } from "../src/content/pages/home";
import { auctionInfoPage } from "../src/content/pages/auction-info";
import { auctionItemsPage } from "../src/content/pages/auction-items";
import { auctionPlannerPage } from "../src/content/pages/auction-planner";
import { auctioneersPage } from "../src/content/pages/auctioneers";
import { faqsPage } from "../src/content/pages/faqs";
import { testimonialsPage } from "../src/content/pages/testimonials";
import { contactPage } from "../src/content/pages/contact";

import { auctionItems } from "../src/content/collections/auction-items";
import { auctioneers, auctioneerPartners } from "../src/content/collections/auctioneers";
import { faqs } from "../src/content/collections/faqs";
import { steps } from "../src/content/collections/steps";
import { testimonials } from "../src/content/collections/testimonials";
import { valueProps } from "../src/content/collections/value-props";
import { plannerQuestions } from "../src/content/collections/planner-rules";

let failures = 0;
let checked = 0;

function check(label: string, schema: ZodType, value: unknown) {
  checked++;
  const result = schema.safeParse(value);
  if (result.success) {
    console.log(`  ok    ${label}`);
    return;
  }

  failures++;
  console.log(`  FAIL  ${label}`);
  for (const issue of result.error.issues) {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    console.log(`          ${path}: ${issue.message}`);
  }
}

function checkEach(label: string, schema: ZodType, values: readonly unknown[]) {
  values.forEach((value, index) => {
    const id =
      value && typeof value === "object" && "id" in value
        ? String((value as { id: unknown }).id)
        : `#${index}`;
    check(`${label}[${id}]`, schema, value);
  });
}

console.log("\nSite globals");
check("site", siteContentSchema, site);

console.log("\nPages");
for (const page of [
  homePage,
  auctionInfoPage,
  auctionItemsPage,
  auctionPlannerPage,
  auctioneersPage,
  faqsPage,
  testimonialsPage,
  contactPage,
]) {
  check(`page:${page.slug}`, anyPageSchema, page);
}

console.log("\nCollections");
checkEach("category", auctionItemSchema, auctionItems);
checkEach("auctioneer", auctioneerSchema, auctioneers);
checkEach("partner", partnerSchema, auctioneerPartners);
checkEach("faq", faqItemSchema, faqs);
checkEach("step", stepSchema, steps);
checkEach("testimonial", testimonialSchema, testimonials);
checkEach("valueProp", valuePropSchema, valueProps);
checkEach("plannerQuestion", plannerQuestionSchema, plannerQuestions);

/* The catalog is the deep one: categories hold groups hold items hold details.
   The category parse above covers it, but count the leaves so the output says
   how much was actually verified rather than just "9 categories ok". */
const lots = auctionItems.reduce(
  (total, category) =>
    total + category.groups.reduce((n, group) => n + group.items.length, 0),
  0
);

console.log(
  `\n  ${checked} shapes checked (${lots} lots inside the categories)`
);
console.log(
  failures === 0
    ? "  CONTENT PARITY OK — every module satisfies its schema\n"
    : `  ${failures} FAILURE(S)\n`
);

process.exit(failures === 0 ? 0 : 1);
