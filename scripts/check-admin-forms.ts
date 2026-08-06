/**
 * Proves the admin's generated forms cover the content model completely.
 *
 * The editor rebuilds a submitted document against a field tree derived from the
 * Zod schema, keeping only the keys that tree declares. That is the right trust
 * boundary — but it means any field the tree fails to describe is a field that
 * SAVING SILENTLY DELETES. The client would open a page, change a heading, press
 * save, and lose a section they never touched, with no error anywhere.
 *
 * So the check that matters is a no-op round trip: take the real content, pass
 * it through the same coercion a save performs, and require the result to be
 * identical. If it is, saving without editing cannot lose anything, which is the
 * property the whole editor rests on.
 *
 * Run with:  npm run check:admin
 * (the react-server condition lets `server-only` modules load outside Next.)
 */

import { pageSchemas } from "@/content/schema";
import type { PageSlug } from "@/content/types";
import type { FieldNode } from "@/lib/admin/field-node";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForPage } from "@/lib/admin/locks";
import { coerceToTree, stableStringify } from "@/lib/admin/coerce";

import { homePage } from "@/content/pages/home";
import { auctionInfoPage } from "@/content/pages/auction-info";
import { auctionItemsPage } from "@/content/pages/auction-items";
import { auctionPlannerPage } from "@/content/pages/auction-planner";
import { auctioneersPage } from "@/content/pages/auctioneers";
import { faqsPage } from "@/content/pages/faqs";
import { testimonialsPage } from "@/content/pages/testimonials";
import { contactPage } from "@/content/pages/contact";

const PAGES: Record<PageSlug, unknown> = {
  home: homePage,
  "auction-info": auctionInfoPage,
  "auction-items": auctionItemsPage,
  "auction-planner": auctionPlannerPage,
  auctioneers: auctioneersPage,
  faqs: faqsPage,
  testimonials: testimonialsPage,
  contact: contactPage,
};

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

/** Walks a tree, counting leaves and collecting anything it cannot edit. */
function survey(
  node: FieldNode,
  path: string,
  out: { fields: number; opaque: string[]; locked: string[] }
): void {
  if (node.locked) out.locked.push(path);

  switch (node.kind) {
    case "object":
      for (const { key, node: child } of node.fields) {
        survey(child, path ? `${path}.${key}` : key, out);
      }
      break;
    case "array":
      if (node.fixedLength) out.locked.push(`${path} (fixed length)`);
      survey(node.element, `${path}.*`, out);
      break;
    case "opaque":
      out.opaque.push(path);
      break;
    case "hidden":
      break;
    default:
      // Structural values (an entry's id) are carried, not edited.
      if (!node.hideInForm) out.fields += 1;
  }
}

/**
 * Finds where two documents diverge, so a failure names the field rather than
 * printing two walls of JSON.
 */
function firstDifference(a: unknown, b: unknown, path = ""): string | null {
  if (stableStringify(a) === stableStringify(b)) return null;

  const bothObjects =
    a && b && typeof a === "object" && typeof b === "object" &&
    !Array.isArray(a) && !Array.isArray(b);

  if (bothObjects) {
    const keys = new Set([
      ...Object.keys(a as object),
      ...Object.keys(b as object),
    ]);
    for (const key of keys) {
      const found = firstDifference(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key
      );
      if (found) return found;
    }
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return `${path} — ${a.length} entries before, ${b.length} after`;
    }
    for (let i = 0; i < a.length; i += 1) {
      const found = firstDifference(a[i], b[i], `${path}.${i}`);
      if (found) return found;
    }
  }

  return `${path || "(root)"} — before: ${JSON.stringify(a)?.slice(0, 90)} / after: ${JSON.stringify(b)?.slice(0, 90)}`;
}

console.log("Checking the admin's generated page forms\n");

let totalFields = 0;

for (const slug of Object.keys(PAGES) as PageSlug[]) {
  const content = PAGES[slug];
  const tree = buildFieldTree(pageSchemas[slug], locksForPage(slug));

  const out = { fields: 0, opaque: [] as string[], locked: [] as string[] };
  survey(tree, "", out);
  totalFields += out.fields;

  /* 1. Every field must be editable, or deliberately locked — never neither. */
  for (const path of out.opaque) {
    fail(`${slug}: "${path}" has no input, so it cannot be edited in the admin`);
  }

  /* 2. The content must survive a save that changes nothing. */
  const roundTripped = coerceToTree(content, tree);
  const difference = firstDifference(content, roundTripped);
  if (difference) {
    fail(`${slug}: saving without editing would change ${difference}`);
  }

  /* 3. What comes back must still satisfy the schema. */
  const parsed = pageSchemas[slug].safeParse(roundTripped);
  if (!parsed.success) {
    fail(
      `${slug}: the round trip no longer validates — ` +
        parsed.error.issues
          .slice(0, 2)
          .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
          .join("; ")
    );
  }

  const lockNote = out.locked.length ? `, ${out.locked.length} locked` : "";
  console.log(
    `  ${difference || out.opaque.length ? "FAIL" : "ok  "}  ` +
      `${slug.padEnd(16)} ${String(out.fields).padStart(3)} fields${lockNote}`
  );
}

/* 4. The locks that protect the lead pipeline must actually be in place. */
const contactTree = buildFieldTree(pageSchemas.contact, locksForPage("contact"));
const contactSurvey = { fields: 0, opaque: [] as string[], locked: [] as string[] };
survey(contactTree, "", contactSurvey);

for (const expected of ["form.fields.*.name", "form.fields (fixed length)", "seo.path"]) {
  if (!contactSurvey.locked.includes(expected)) {
    fail(
      `the contact page is missing the lock on "${expected}" — ` +
        `the enquiry pipeline reads these keys`
    );
  }
}

console.log(`\n  ${totalFields} editable fields across 8 pages`);

if (failures > 0) {
  console.error(`\n  ${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("  All checks passed\n");
