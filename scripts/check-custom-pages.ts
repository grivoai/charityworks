/**
 * Guards the addresses client-built pages are allowed to take.
 *
 * THE FAILURE THIS EXISTS FOR IS SILENT ON BOTH SIDES.
 *
 * Next resolves static route segments before dynamic ones. A custom page given
 * the slug `faqs` saves cleanly, shows in the admin as published and live, and
 * is never served — every request for /faqs keeps hitting the hand-written FAQ
 * page. No error is raised anywhere. The client would be looking at a page they
 * built, told it was live, unable to find it, and nothing in the logs would say
 * why.
 *
 * `reserved-paths.ts` refuses those slugs, but it can only refuse the ones it
 * knows about, and it holds a hand-written list. A new route added under
 * app/(site) would shadow a slug that this list still says is free. So the
 * check that matters is not "is the list valid" — it is "does the list still
 * match the filesystem".
 *
 *   npm run check:custom-pages
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { customPageSchema } from "@/content/schema";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { COMMON_LOCKS } from "@/lib/admin/locks";
import { BUILT_IN_PAGES, checkSlug, couldBeCustomPage } from "@/lib/reserved-paths";
import {
  PAGE_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  templateById,
} from "@/lib/admin/page-templates";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => { failures++; console.error(`  FAIL  ${m}`); };
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

/* ------------------------------------------------------------------ */
/* 1. The reserved list matches the routes that actually exist         */
/* ------------------------------------------------------------------ */

const SITE_DIR = "app/(site)";

/**
 * Every first path segment the (site) group serves from a real directory.
 *
 * `[slug]` is the dynamic route these pages are served BY, so it is skipped —
 * it is the thing being protected, not a thing to protect against.
 */
function staticSegments(): string[] {
  return readdirSync(SITE_DIR)
    .filter((entry) => statSync(join(SITE_DIR, entry)).isDirectory())
    .filter((entry) => !entry.startsWith("[") && !entry.startsWith("("));
}

const onDisk = staticSegments().sort();
const declared = [...BUILT_IN_PAGES].sort();

for (const segment of onDisk) {
  check(
    !couldBeCustomPage(segment),
    `/${segment} is a real route and is refused as a page address`
  );
}

// The other direction: a route that was deleted leaves a word reserved for no
// reason, which is harmless but misleading, and usually means the rename was
// only half done.
for (const segment of declared) {
  check(
    onDisk.includes(segment),
    `BUILT_IN_PAGES lists "${segment}", which still exists under app/(site)`
  );
}

check(
  onDisk.join(",") === declared.join(","),
  `BUILT_IN_PAGES is in step with the filesystem` +
    (onDisk.join(",") === declared.join(",")
      ? ""
      : `\n        on disk:  ${onDisk.join(", ")}\n        declared: ${declared.join(", ")}`)
);

/* ------------------------------------------------------------------ */
/* 2. The application's own routes are refused                         */
/* ------------------------------------------------------------------ */

for (const path of ["admin", "api", "d", "_next", "sitemap.xml", "robots.txt", "favicon.ico"]) {
  check(!couldBeCustomPage(path), `/${path} is refused as a page address`);
}

/* ------------------------------------------------------------------ */
/* 3. Malformed addresses are refused with a reason                    */
/* ------------------------------------------------------------------ */

const malformed: [string, string][] = [
  ["", "empty"],
  ["Spring Gala", "spaces and capitals"],
  ["spring/gala", "a slash"],
  ["-gala", "a leading hyphen"],
  ["gala-", "a trailing hyphen"],
  ["../etc/passwd", "traversal"],
  ["gala?x=1", "a query string"],
  ["GALA", "capitals"],
  ["a".repeat(61), "too long"],
];
for (const [value, why] of malformed) {
  const verdict = checkSlug(value);
  check(!verdict.ok, `refused: ${why}`);
  if (!verdict.ok) {
    check(
      verdict.reason.length > 10,
      `  …and says why, rather than just "invalid"`
    );
  }
}

/* ------------------------------------------------------------------ */
/* 4. A sensible address is allowed                                    */
/* ------------------------------------------------------------------ */

for (const value of ["spring-gala-2026", "gala", "a1", "our-team"]) {
  check(checkSlug(value).ok, `allowed: /${value}`);
}

// And a slug already used by another page is refused separately from a
// reserved one, because the fix is different.
const clash = checkSlug("gala", new Set(["gala"]));
check(!clash.ok && /already uses/.test(clash.reason), "a slug another page holds is refused");

/* ------------------------------------------------------------------ */
/* 5. Every field of a page is editable in the panel                   */
/* ------------------------------------------------------------------ */

let opaque = 0;
let variants = 0;
const walk = (node: unknown) => {
  const n = node as { kind?: string; fields?: { node: unknown }[]; element?: unknown; options?: { node: unknown }[] };
  if (n.kind === "opaque") opaque++;
  if (n.kind === "variant") variants++;
  if (n.kind === "object") for (const f of n.fields ?? []) walk(f.node);
  if (n.kind === "array" && n.element) walk(n.element);
  if (n.kind === "variant") for (const o of n.options ?? []) walk(o.node);
};
walk(buildFieldTree(customPageSchema, COMMON_LOCKS));

check(opaque === 0, "no field of a custom page is uneditable");
check(
  variants === 1,
  `the block list is a variant node the editor can draw (found ${variants})`
);

/* ------------------------------------------------------------------ */
/* Starting templates                                                  */
/* ------------------------------------------------------------------ */

/**
 * Every template still builds a page the schema accepts.
 *
 * A template is written by hand against a schema that is not, so the two drift
 * the moment a block gains a required field. The failure is quiet in the worst
 * way: `createCustomPage` parses the document it has just assembled, and a
 * template that no longer fits turns into "That page could not be created. Try
 * a different title." — a message about the title, for a fault in the
 * template, shown to somebody whose title was fine.
 *
 * Ids are minted here the way the action mints them, because a template
 * deliberately carries none.
 */
const mintId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

for (const template of PAGE_TEMPLATES) {
  const blocks = template.blocks.map((block) => {
    const built: Record<string, unknown> = { ...block, id: mintId("block") };
    if (block.type === "questions") {
      built.items = block.items.map((item) => ({ ...item, id: mintId("q") }));
    }
    if (block.type === "callToAction") {
      built.cta = { ...block.cta, id: mintId("cta") };
    }
    return built;
  });

  const parsed = customPageSchema.safeParse({
    slug: "template-probe",
    title: "Template Probe",
    visibility: "public",
    seo: {
      title: "Template Probe",
      description: "Template Probe — CharityWorks.",
      targetTerms: [],
      path: "/template-probe",
    },
    intro: template.intro,
    blocks,
  });

  check(
    parsed.success,
    parsed.success
      ? `template "${template.id}" builds a valid page (${blocks.length} block(s))`
      : `template "${template.id}" does not fit the schema: ` +
          parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.map(String).join(".")} ${i.message}`)
            .join("; ")
  );
}

/* Ids are minted per creation, never written into a template: two pages built
   from one template sharing block ids is exactly how coercion comes to hand
   one block's protected values to another. */
for (const template of PAGE_TEMPLATES) {
  check(
    !JSON.stringify(template.blocks).includes('"id"'),
    `template "${template.id}" carries no hard-coded ids`
  );
}

check(
  templateById(undefined).id === DEFAULT_TEMPLATE_ID &&
    templateById("no-such-template").id === DEFAULT_TEMPLATE_ID,
  "an unknown template id falls back to the blank one rather than failing"
);

check(
  new Set(PAGE_TEMPLATES.map((t) => t.id)).size === PAGE_TEMPLATES.length,
  "every template id is distinct"
);

console.log(
  `\n${failures === 0 ? "CUSTOM PAGES OK" : `${failures} check(s) failed`}\n`
);
process.exit(failures === 0 ? 0 : 1);
