/**
 * Guards the three hidden pages: /guitar-prices, /travel_voucher and
 * /terms-and-conditions-voucher (src/content/hidden-pages.ts).
 *
 * 1. NOT ONE WORD MOVES. The fallback documents are built from the code
 *    modules that were live before these pages became editable. Every string
 *    in those modules must be in its document, and the document must survive
 *    the schema and an unedited save unchanged.
 * 2. THEY STAY HIDDEN. Not a PageSlug (which feeds the sitemap, /llms.txt and
 *    the seed), not in BUILT_IN_PAGES (the nav-link picker), the sitemap's read
 *    is limited to the built-in slugs, and each route says noindex, nofollow,
 *    nocache at the address the vouchers print.
 *
 *   npm run check:hidden-pages
 */

import { readFileSync } from "node:fs";

import {
  HIDDEN_PAGE_DEFAULTS,
  HIDDEN_PAGE_PATHS,
  HIDDEN_PAGE_SLUGS,
  hiddenPageSchemas,
  resolveHiddenPage,
} from "@/content/hidden-pages";
import { pageSlugSchema } from "@/content/schema";
import { guitarPrices } from "@/content/guitar-prices";
import { travelVoucher, voucherBooking, voucherTerms } from "@/content/voucher-program";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import type { FieldNode } from "@/lib/admin/field-node";
import { locksForPage } from "@/lib/admin/locks";
import { BUILT_IN_PAGES, HIDDEN_PAGES } from "@/lib/reserved-paths";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function opaquePaths(node: FieldNode, path: string, out: string[] = []): string[] {
  if (node.kind === "opaque") out.push(path);
  if (node.kind === "object") node.fields.forEach((f) => opaquePaths(f.node, path ? `${path}.${f.key}` : f.key, out));
  if (node.kind === "array") opaquePaths(node.element, `${path}.*`, out);
  return out;
}

console.log("Checking the hidden pages\n");

/* 1. Wording */

/** What was on each live page, from the code modules. Not the guide's
    document address, which is not wording and stays in code. */
const BEFORE = {
  "guitar-prices": strings({ ...guitarPrices, guideDocumentSlug: undefined }),
  "travel-voucher": strings([travelVoucher, voucherBooking]),
  "voucher-terms": strings([voucherTerms, voucherBooking]),
} as const;

for (const slug of HIDDEN_PAGE_SLUGS) {
  const doc = HIDDEN_PAGE_DEFAULTS[slug];
  const have = new Set(strings(doc));
  const missing = BEFORE[slug].filter((s) => !have.has(s));
  check(missing.length === 0, `${slug}: every string from the code is in the fallback${missing.length ? ` (missing: ${missing.slice(0, 3).join(" | ")})` : ""}`);

  const parsed = hiddenPageSchemas[slug].safeParse(doc);
  check(parsed.success, `${slug}: the fallback is valid`);
  if (parsed.success) check(deepEqual(parsed.data, doc), `${slug}: validating the fallback changes nothing`);

  const tree = buildFieldTree(hiddenPageSchemas[slug], locksForPage(slug));
  const opaque = opaquePaths(tree, "");
  check(opaque.length === 0, `${slug}: every field has an input${opaque.length ? ` (none for ${opaque.join(", ")})` : ""}`);

  const roundTripped = coerceToTree(doc, tree, doc);
  const reparsed = hiddenPageSchemas[slug].safeParse(roundTripped);
  check(reparsed.success && deepEqual(reparsed.data, doc), `${slug}: saving without editing changes nothing`);

  check(resolveHiddenPage(slug, null).page.slug === slug && !resolveHiddenPage(slug, null).problem, `${slug}: no row shows the code's wording`);
  const broken = resolveHiddenPage(slug, { slug, heading: "" });
  check(deepEqual(broken.page, doc) && Boolean(broken.problem), `${slug}: a broken row shows the code's wording and says why`);
}

const guitars = HIDDEN_PAGE_DEFAULTS["guitar-prices"].guitars;
check(guitars.length === 10, "guitar-prices: ten guitars");
check(
  guitars.map((g) => g.price).join(" ") === "$975 $950 $900 $950 $1275 $1600 $750 $750 $1500 $975",
  "guitar-prices: the prices, in order, are the live ones"
);
check(HIDDEN_PAGE_DEFAULTS["guitar-prices"].sections.length === 4, "guitar-prices: four text sections between five rows");
check(HIDDEN_PAGE_DEFAULTS["travel-voucher"].faqs.length === 12, "travel-voucher: twelve questions");
check(HIDDEN_PAGE_DEFAULTS["voucher-terms"].terms.length === 15, "voucher-terms: fifteen terms");

/* 2. Hidden */

const pageSlugs: readonly string[] = pageSlugSchema.options;
const builtIn: readonly string[] = BUILT_IN_PAGES;
const hiddenRoutes: readonly string[] = HIDDEN_PAGES;
for (const slug of HIDDEN_PAGE_SLUGS) {
  const path = HIDDEN_PAGE_PATHS[slug];
  const segment = path.slice(1);
  check(!pageSlugs.includes(slug), `${slug}: not a built-in page slug, so not in the sitemap, /llms.txt or the seed`);
  check(!builtIn.includes(segment), `${path}: not in BUILT_IN_PAGES, so not offered in the nav-link picker`);
  check(hiddenRoutes.includes(segment), `${path}: listed in HIDDEN_PAGES`);

  const route = readFileSync(`app/(site)/${segment}/page.tsx`, "utf8");
  check(
    /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*nocache:\s*true\s*\}/.test(route),
    `${path}: noindex, nofollow, nocache`
  );
  check(route.includes(`const PATH = "${path}";`), `${path}: canonical address unchanged`);
}
check(
  HIDDEN_PAGE_PATHS["travel-voucher"] === "/travel_voucher" &&
    HIDDEN_PAGE_PATHS["voucher-terms"] === "/terms-and-conditions-voucher" &&
    HIDDEN_PAGE_PATHS["guitar-prices"] === "/guitar-prices",
  "the three addresses are the ones printed on vouchers"
);

const source = readFileSync("src/lib/content-source-supabase.ts", "utf8");
check(
  source.includes('.in("slug", pageSlugSchema.options)'),
  "the sitemap's page list reads the built-in slugs only, never a hidden page's row"
);
// Code only: the file's comments explain that these pages are left out.
const llms = readFileSync("app/llms.txt/route.ts", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
for (const path of Object.values(HIDDEN_PAGE_PATHS)) {
  check(!llms.includes(path), `${path}: not in /llms.txt`);
}

console.log(failures ? `\n${failures} FAILED` : "\nHIDDEN PAGES OK");
process.exit(failures ? 1 : 0);
