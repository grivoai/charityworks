/**
 * Guards the way out of every admin page.
 *
 * The back link is rendered by `AdminShell`, not by the pages, which is what
 * makes "same place on every page" a property of the layout rather than a
 * convention twelve files have to keep agreeing on. That only holds while the
 * arrangement below holds, and every part of it is one careless edit from
 * breaking in a way nothing else would notice:
 *
 *   - a new admin page that renders its own frame instead of AdminShell would
 *     be a dead end, and would look completely normal in review
 *   - AdminShell quietly losing <AdminBack /> would strand all twelve at once
 *   - the sign-in screens gaining one would matter most of all: a link out of
 *     the two-factor challenge is a way around the challenge
 *
 *   npm run check:admin-nav
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => { failures++; console.error(`  FAIL  ${m}`); };
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

/** Source with comments stripped, so prose about a thing is not read as the thing. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const ADMIN_DIR = "app/(admin)/admin";

/**
 * Pages that must NOT offer a way into the panel, each with the reason.
 * Being explicit means adding a route to this list is a decision someone makes
 * on purpose rather than a check quietly going green.
 */
const NO_FRAME: Record<string, string> = {
  "login/page.tsx": "not signed in — there is nowhere to go back to",
  "login/verify/page.tsx":
    "the two-factor challenge — a link past it would be a way around it",
  "site/preview/page.tsx":
    "the same, for the site's own header and footer — it renders the chrome " +
    "this form edits, so the panel's chrome on top of it would be two navs " +
    "arguing about which one is being previewed.",
  "custom-pages/[slug]/preview/page.tsx":
    "rendered inside the preview iframe, wearing the site's chrome rather " +
    "than the panel's — admin furniture in there would be previewing the " +
    "wrong thing. The way out is the editor around the frame.",
};

function pagesUnder(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pagesUnder(full, `${prefix}${entry}/`));
    else if (entry === "page.tsx") out.push(`${prefix}${entry}`);
  }
  return out;
}

/* ---- 1. AdminShell is the one thing that renders the back link ---- */
const shell = code(readFileSync("src/components/admin/AdminShell.tsx", "utf8"));
check(
  shell.includes("<AdminBack />"),
  "AdminShell renders the back link, so no page has to remember to"
);
check(
  shell.includes("!root &&"),
  "AdminShell suppresses it on the dashboard, which is where it points"
);

const back = code(readFileSync("src/components/admin/AdminBack.tsx", "utf8"));
check(back.includes('href="/admin"'), "the back link points at the dashboard");
check(back.includes("Dashboard"), 'the back link is labelled "Dashboard"');

/* ---- 2. Every signed-in page is inside AdminShell ---- */
let framed = 0;
for (const page of pagesUnder(ADMIN_DIR)) {
  const source = code(readFileSync(join(ADMIN_DIR, page), "utf8"));
  const isRoot = page === "page.tsx";

  if (page in NO_FRAME) {
    check(
      !source.includes("<AdminShell"),
      `${page} has no frame (${NO_FRAME[page]})`
    );
    continue;
  }

  if (!source.includes("<AdminShell")) {
    fail(`${page} does not use AdminShell — it would have no way back`);
    continue;
  }

  if (isRoot) {
    check(source.includes("root"), "the dashboard marks itself as the root");
  } else {
    check(
      !/<AdminShell[^>]*\sroot\b/.test(source),
      `${page} is not marked root, so it shows the back link`
    );
    framed++;
  }
}
ok(`${framed} page(s) reachable from the dashboard and back again`);

/* ---- 3. No page ships a second link to the dashboard ---- */
for (const page of pagesUnder(ADMIN_DIR)) {
  if (page in NO_FRAME || page === "page.tsx") continue;
  const source = code(readFileSync(join(ADMIN_DIR, page), "utf8"));
  check(
    !/<Link href="\/admin">/.test(source),
    `${page} has no second link to the dashboard beside the back control`
  );
}

console.log(
  `\n${failures === 0 ? "ADMIN NAV OK" : `${failures} check(s) failed`}\n`
);
process.exit(failures === 0 ? 0 : 1);
