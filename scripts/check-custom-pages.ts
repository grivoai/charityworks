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

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { customPageSchema, pageBlockSchema } from "@/content/schema";
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
/** How many options each variant node offers, in the order they are reached. */
const variantSizes: number[] = [];
const walk = (node: unknown) => {
  const n = node as { kind?: string; fields?: { node: unknown }[]; element?: unknown; options?: { node: unknown }[] };
  if (n.kind === "opaque") opaque++;
  if (n.kind === "variant") variantSizes.push((n.options ?? []).length);
  if (n.kind === "object") for (const f of n.fields ?? []) walk(f.node);
  if (n.kind === "array" && n.element) walk(n.element);
  if (n.kind === "variant") for (const o of n.options ?? []) walk(o.node);
};
walk(buildFieldTree(customPageSchema, COMMON_LOCKS));

check(opaque === 0, "no field of a custom page is uneditable");
/**
 * Both unions the editor has to draw, counted by their options.
 *
 * There are two, and they are different sizes on purpose: the page's block
 * list, and the smaller set of things that may sit inside a column. Asserting
 * the SIZES rather than just the count is what makes this catch a block type
 * quietly dropped from a union — the shape of the tree would be unchanged and
 * a bare count of two would still pass.
 *
 * A third variant appearing means something has been nested that was not meant
 * to be. Columns holding page blocks rather than column items would show up
 * here as recursion the editor cannot draw, which is the failure this is
 * really watching for.
 */
const PAGE_BLOCK_TYPES = 7;
const COLUMN_ITEM_TYPES = 3;

check(
  variantSizes.length === 2,
  `the editor draws exactly two unions — page blocks and column items (found ${variantSizes.length})`
);
check(
  variantSizes.includes(PAGE_BLOCK_TYPES),
  `the block list offers all ${PAGE_BLOCK_TYPES} block types (found ${variantSizes.join(", ")})`
);
check(
  variantSizes.includes(COLUMN_ITEM_TYPES),
  `a column offers all ${COLUMN_ITEM_TYPES} item types (found ${variantSizes.join(", ")})`
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

/* ------------------------------------------------------------------ */
/* Block layout options                                                */
/* ------------------------------------------------------------------ */

/**
 * The layout controls, and the three ways they can quietly stop working.
 *
 * 1. A BLOCK STORED BEFORE THEY EXISTED must still parse, and must land on
 *    the layout it already rendered with. These fields were added to pages
 *    that were already live, and `.default()` is the only thing standing
 *    between that and every existing page failing its schema. A default
 *    changed by hand — narrow to contained, say — would restyle live pages
 *    on the next deploy with nothing to show it had happened.
 *
 * 2. A VALUE WITH NO CLASS renders as an unstyled section. The schema and the
 *    stylesheet are two files with no compiler between them, so the mapping
 *    is asserted here rather than assumed.
 *
 * 3. THE TWO BAND BLOCKS must stay out of it. Both paint themselves a dark
 *    navy and write in white; a cream background on either is white on
 *    cream. Their exclusion is a decision, so it is written down as one.
 */

/** What a block looked like before layout fields existed. */
const legacyBlocks: Record<string, Record<string, unknown>> = {
  richText: { id: "b1", type: "richText", body: "Body." },
  imageAndText: {
    id: "b2",
    type: "imageAndText",
    image: { src: "/x.jpg", alt: "A photograph." },
    body: "Body.",
    imageSide: "left",
  },
  questions: { id: "b3", type: "questions", items: [] },
  catalogTeaser: { id: "b4", type: "catalogTeaser", count: 3 },
};

/** The layout each block rendered with before the controls existed. */
const legacyLayout: Record<string, Record<string, string>> = {
  richText: { width: "narrow", spacing: "normal", align: "left", background: "auto" },
  imageAndText: { width: "contained", spacing: "normal", background: "auto" },
  questions: { width: "contained", spacing: "normal", align: "centre", background: "auto" },
  catalogTeaser: { width: "contained", spacing: "normal", align: "centre", background: "auto" },
};

for (const [type, block] of Object.entries(legacyBlocks)) {
  const parsed = pageBlockSchema.safeParse(block);
  if (!parsed.success) {
    fail(
      `a ${type} block stored before the layout fields no longer parses: ` +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.map(String).join(".")} ${i.message}`)
          .join("; ")
    );
    continue;
  }

  const got = parsed.data as unknown as Record<string, string>;
  const want = legacyLayout[type];
  const wrong = Object.entries(want).filter(([k, v]) => got[k] !== v);

  check(
    wrong.length === 0,
    wrong.length === 0
      ? `a legacy ${type} block keeps the layout it already had`
      : `a legacy ${type} block would be restyled on deploy: ` +
          wrong
            .map(([k, v]) => `${k} should default to ${v}, got ${got[k]}`)
            .join("; ")
  );
}

/* Every combination a client can reach is one the schema accepts. */
{
  const widths = ["narrow", "contained", "full"];
  const spacings = ["tight", "normal", "loose"];
  const aligns = ["left", "centre"];
  const backgrounds = ["auto", "paper", "cream"];
  let tried = 0;
  let rejected = 0;

  for (const [type, block] of Object.entries(legacyBlocks)) {
    const hasAlign = "align" in legacyLayout[type];
    for (const width of widths) {
      for (const spacing of spacings) {
        for (const background of backgrounds) {
          for (const align of hasAlign ? aligns : [undefined]) {
            tried += 1;
            const candidate: Record<string, unknown> = {
              ...block,
              width,
              spacing,
              background,
            };
            if (align) candidate.align = align;
            if (!pageBlockSchema.safeParse(candidate).success) rejected += 1;
          }
        }
      }
    }
  }

  check(
    rejected === 0,
    `all ${tried} layout combinations across the four content blocks are valid` +
      (rejected === 0 ? "" : ` (${rejected} rejected)`)
  );
}

/* Every value maps to a class that exists. */
{
  // Comments stripped first, the same way check-admin-nav strips them from
  // TypeScript: the block comment above these rules NAMES them, so prose
  // about a class would otherwise satisfy a search for the class. That is
  // how this check passed a rename of .wrap-full the first time it was tried.
  const css = readFileSync("app/globals.css", "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
  const needed = [
    "wrap-narrow",
    "wrap-full",
    "pad-tight",
    "pad-loose",
    "center",
    // Columns. `block-column` is a prefix of `block-columns`, which is
    // exactly why the match below is token-aware rather than a substring.
    "block-columns",
    "block-column",
    "is-equal",
    "is-wide-left",
    "is-wide-right",
    "is-thirds",
    "column-title",
    "block-column-media",
  ];

  // Whole class tokens, not substrings. `css.includes(".wrap-full")` is also
  // true of `.wrap-fullwidth`, so renaming a class would slip past a plain
  // search and leave this green while the class it names no longer exists —
  // which is the exact drift the check is here to catch.
  const present = (name: string) =>
    new RegExp("\\." + name + "(?![\\w-])").test(css);

  const missing = needed.filter((name) => !present(name));
  check(
    missing.length === 0,
    missing.length === 0
      ? `every layout value has a class in globals.css (${needed.length} checked)`
      : `layout values with no class: ${missing.map((n) => "." + n).join(", ")}`
  );
}

/* The band blocks stay out of it, on purpose. */
for (const type of ["callToAction", "enquiryForm"]) {
  const option = (pageBlockSchema.def.options as unknown[]).find((o) => {
    const shape = (o as { def: { shape: Record<string, unknown> } }).def.shape;
    const lit = shape.type as { def?: { values?: string[] } };
    return lit?.def?.values?.[0] === type;
  });
  const shape = (option as { def: { shape: Record<string, unknown> } }).def.shape;
  check(
    !("background" in shape) && !("width" in shape),
    `${type} carries no layout controls — it paints its own dark band`
  );
}
/* ------------------------------------------------------------------ */
/* Columns                                                             */
/* ------------------------------------------------------------------ */

/**
 * Columns hold their own small union, and must never hold page blocks.
 *
 * The bound is the interesting half. Two and three are laid out; one is not a
 * column layout and four in a 1200px page gives each 280px, narrower than the
 * measure any of the three item shapes was drawn for. Both refusals have to
 * explain themselves, for the same reason every slug refusal does.
 */
{
  const item = (n: number) => ({
    id: `ci${n}`,
    type: "text" as const,
    body: `Column ${n}.`,
  });
  const column = (n: number) => ({ id: `col${n}`, items: [item(n)] });
  const block = (count: number) => ({
    id: "cb1",
    type: "columns",
    ratio: "equal",
    columns: Array.from({ length: count }, (_, i) => column(i + 1)),
  });

  for (const count of [2, 3]) {
    check(
      pageBlockSchema.safeParse(block(count)).success,
      `a ${count}-column block is valid`
    );
  }

  for (const count of [1, 4]) {
    const parsed = pageBlockSchema.safeParse(block(count));
    check(!parsed.success, `${count} column(s) is refused`);
    if (!parsed.success) {
      const said = parsed.error.issues.map((i) => i.message).join(" ");
      check(
        /column/i.test(said) && !/^Invalid/i.test(said),
        "  …and says why, rather than just \"invalid\""
      );
    }
  }

  /* Every item shape a column offers is valid inside one. */
  const shapes: Record<string, unknown> = {
    text: { id: "i1", type: "text", body: "Words." },
    image: { id: "i2", type: "image", image: { src: "/x.jpg", alt: "A photograph." } },
    button: {
      id: "i3",
      type: "button",
      cta: { id: "c1", label: "Go", href: "/contact", variant: "primary" },
    },
  };
  for (const [name, shape] of Object.entries(shapes)) {
    const candidate = {
      id: "cb2",
      type: "columns",
      ratio: "equal",
      columns: [{ id: "cA", items: [shape] }, { id: "cB", items: [] }],
    };
    check(
      pageBlockSchema.safeParse(candidate).success,
      `a column may hold a ${name}`
    );
  }

  /* And must not hold a page block. A column taking a richText — the page-scale
     shape rather than the column-scale one — is what nesting would look like
     on its way in. */
  const nested = {
    id: "cb3",
    type: "columns",
    ratio: "equal",
    columns: [
      { id: "cA", items: [{ id: "n1", type: "richText", body: "Words." }] },
      { id: "cB", items: [] },
    ],
  };
  check(
    !pageBlockSchema.safeParse(nested).success,
    "a column refuses a page block, so columns cannot nest"
  );

  /* The columns block still carries the Tier 1 layout controls. */
  const laid = pageBlockSchema.safeParse(block(2));
  if (laid.success) {
    const got = laid.data as unknown as Record<string, string>;
    check(
      got.width === "contained" &&
        got.spacing === "normal" &&
        got.align === "left" &&
        got.background === "auto",
      "a columns block defaults to the same layout as the other content blocks"
    );
  }
}
console.log(
  `\n${failures === 0 ? "CUSTOM PAGES OK" : `${failures} check(s) failed`}\n`
);
process.exit(failures === 0 ? 0 : 1);
