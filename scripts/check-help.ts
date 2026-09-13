/**
 * Keeps the help panel telling the truth.
 *
 * Help is the one part of the admin that nothing else exercises: a topic can
 * link to a screen that was renamed, describe a block that no longer exists,
 * or quote a limit that has since changed, and every other check stays green.
 * So each claim the help makes is compared with the thing it is a claim about:
 *
 *   - every linked address and every route a topic is keyed to exists under
 *     app/(admin)/admin, read off the filesystem as check-admin-nav does
 *   - every signed-in screen has at least one topic that is about it
 *   - every block type in the schema is described, by the label the picker
 *     shows for it, and every template in the library is named
 *   - the photograph and document limits and the embed hosts are the ones the
 *     rules enforce (they are imported, so this proves the import is still the
 *     right one)
 *   - the content is text — nothing in it could become markup
 *   - the panel is in the AdminShell bar and nowhere the sign-in screens render
 *
 *   npm run check:help
 * (the react-server condition lets the schema's `server-only` neighbours load.)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { HELP_TOPICS, topicsFor } from "@/lib/admin/help";
import { pageBlockSchema } from "@/content/schema";
import { humanize } from "@/lib/admin/schema-tree";
import { PAGE_TEMPLATES } from "@/lib/admin/page-templates";
import { MAX_IMAGE_BYTES } from "@/lib/admin/image-rules";
import { MAX_DOCUMENT_BYTES, formatBytes } from "@/lib/admin/document-rules";
import { EMBED_HOSTS } from "@/lib/embeds";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

console.log("Checking the help panel\n");

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

const ADMIN_DIR = "app/(admin)/admin";

/** Every admin route, as a URL path, with `[slug]` kept as written. */
function routes(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routes(full, `${prefix}/${entry}`));
    else if (entry === "page.tsx") out.push(prefix);
  }
  return out;
}
const ADMIN_ROUTES = routes(ADMIN_DIR, "/admin").sort();

/** A concrete pathname for a route, for `topicsFor` to match against. */
const concrete = (route: string) => route.replace(/\[[^\]]+\]/g, "example");

const exists = (path: string) => ADMIN_ROUTES.includes(path);
const under = (prefix: string) =>
  ADMIN_ROUTES.some((r) => r.startsWith(prefix) && r !== prefix.replace(/\/$/, ""));

for (const topic of HELP_TOPICS) {
  for (const route of topic.routes) {
    if (route === "*") continue;
    const real = route.endsWith("/") ? under(route) : exists(route);
    check(real, real ? `"${topic.id}" is keyed to ${route}, which exists` : `"${topic.id}" is keyed to ${route}, which no admin route matches`);
  }
  if (topic.link) {
    check(
      exists(topic.link.href),
      exists(topic.link.href)
        ? `"${topic.id}" links to ${topic.link.href}, which exists`
        : `"${topic.id}" links to ${topic.link.href}, which is not an admin route`
    );
  }
}

/* Screens that render no shell carry no panel and need no topic: the two
   sign-in screens, and the two preview routes that live inside an iframe. */
const SHELL_LESS = new Set([
  "/admin/login",
  "/admin/login/verify",
  "/admin/site/preview",
  "/admin/custom-pages/[slug]/preview",
]);

for (const route of ADMIN_ROUTES) {
  if (SHELL_LESS.has(route)) continue;
  const path = concrete(route);
  const { here } = topicsFor(path);
  /* "Of its own" means keyed to this route, not merely true everywhere. A
     topic may be both — signing in is general and is also what Security is
     about — and counts here on the strength of the specific key. */
  const specific = here.filter((t) =>
    t.routes.some((r) => r !== "*" && (r.endsWith("/") ? path.startsWith(r) : path === r))
  );
  check(
    specific.length > 0,
    specific.length > 0
      ? `${route} has ${specific.length} topic(s) of its own (${specific.map((t) => t.id).join(", ")})`
      : `${route} has no topic about it — only the ones true everywhere`
  );
}

/* ------------------------------------------------------------------ */
/* Claims                                                              */
/* ------------------------------------------------------------------ */

const text = (topic: (typeof HELP_TOPICS)[number]) =>
  topic.body
    .map((piece) => ("steps" in piece ? piece.steps.join("\n") : piece.p))
    .join("\n");

const all = HELP_TOPICS.map(text).join("\n");
const blocksTopic = HELP_TOPICS.find((t) => t.id === "blocks");
const pagesTopic = HELP_TOPICS.find((t) => t.id === "adding-a-page");

check(!!blocksTopic, 'there is a "blocks" topic');
check(!!pagesTopic, 'there is an "adding-a-page" topic');

/* Every block type, by the label the picker generates for it. */
{
  const types = (pageBlockSchema.def.options as unknown[]).map((option) => {
    const shape = (option as { def: { shape: Record<string, unknown> } }).def.shape;
    return (shape.type as { def: { values: string[] } }).def.values[0];
  });
  const described = blocksTopic ? text(blocksTopic) : "";
  for (const type of types) {
    const label = humanize(type);
    check(
      new RegExp(`^${label} — `, "m").test(described),
      `the blocks topic describes "${label}"` +
        (new RegExp(`^${label} — `, "m").test(described) ? "" : " — a block type with no line in the help")
    );
  }
  const lines = described.split("\n").filter((l) => / — /.test(l)).length;
  check(
    lines === types.length,
    `the blocks topic lists exactly ${types.length} blocks (found ${lines})`
  );
}

/* Every template, by name. */
for (const template of PAGE_TEMPLATES) {
  const named = pagesTopic ? text(pagesTopic).includes(template.label) : false;
  check(named, `the adding-a-page topic names the "${template.label}" template`);
}

/* The limits and hosts are the enforced ones. */
check(
  all.includes(formatBytes(MAX_IMAGE_BYTES)),
  `the photograph limit in the help is the enforced ${formatBytes(MAX_IMAGE_BYTES)}`
);
check(
  all.includes(formatBytes(MAX_DOCUMENT_BYTES)),
  `the document limit in the help is the enforced ${formatBytes(MAX_DOCUMENT_BYTES)}`
);
check(all.includes(EMBED_HOSTS), "the video topic lists the enforced embed hosts");
check(
  /JPG, PNG or WebP/.test(all),
  "the photograph topic names the accepted formats"
);

/* Text, not markup. */
check(
  !/[<>]/.test(all) && HELP_TOPICS.every((t) => !/[<>]/.test(t.title)),
  "no topic contains angle brackets — the help is text, and is rendered as text"
);
check(
  new Set(HELP_TOPICS.map((t) => t.id)).size === HELP_TOPICS.length,
  "every topic id is distinct"
);

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const shell = strip(readFileSync("src/components/admin/AdminShell.tsx", "utf8"));
const panel = strip(readFileSync("src/components/admin/HelpPanel.tsx", "utf8"));
const content = strip(readFileSync("src/lib/admin/help.ts", "utf8"));

check(shell.includes("<HelpPanel />"), "AdminShell renders the help panel in its bar");
check(
  panel.includes("showModal()") && panel.includes('aria-labelledby="admin-guide-title"'),
  "the panel is a modal dialog with an accessible name"
);
check(
  panel.includes("dangerouslySetInnerHTML") === false,
  "the panel never renders help as HTML"
);
check(
  !content.includes('"server-only"') && !content.includes("@/content/schema"),
  "the content module is client-safe: no server-only, no schema (and so no zod) import"
);
for (const screen of ["app/(admin)/admin/login/page.tsx", "app/(admin)/admin/login/verify/page.tsx"]) {
  const source = strip(readFileSync(screen, "utf8"));
  check(
    !source.includes("HelpPanel") && !source.includes("AdminShell"),
    `${screen.replace("app/(admin)/admin/", "")} renders neither the shell nor the panel`
  );
}

/* ------------------------------------------------------------------ */

if (failures > 0) {
  console.error(`\n  ${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("\nHELP OK\n");
