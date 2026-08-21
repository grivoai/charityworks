/**
 * Guards the two things about two-factor authentication that are easy to break
 * later and impossible to notice.
 *
 *   1. THE GATE IS ON EVERY DOOR. `requireAdmin()` is the only place the second
 *      factor is enforced, which works precisely because every admin page and
 *      every write action calls it. A new route that reaches for `getAdmin()`
 *      instead would be a page a half-signed-in session can open, and nothing
 *      about it would look wrong in review.
 *
 *   2. `next` CANNOT LEAVE THE PANEL. The challenge screen redirects through a
 *      `?next=`, so the open-redirect check now guards two hops rather than one.
 *
 *   npm run check:mfa
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { safeNext } from "@/lib/admin/next-path";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => { failures++; console.error(`  FAIL  ${m}`); };
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

/* ---- 1. Every admin page is behind requireAdmin() ---- */
const ADMIN_DIR = "app/(admin)/admin";

/** Reachable without a full session by design, and each says why. */
const EXEMPT: Record<string, string> = {
  "login/page.tsx": "the sign-in form itself",
  "login/verify/page.tsx":
    "the challenge screen — requireAdmin() redirects HERE, so calling it loops",
  "layout.tsx": "renders no data, just the stylesheet and metadata",
};

/**
 * Source with comments removed.
 *
 * The first version of this check read the raw file and tripped over the verify
 * page, whose doc comment explains why it must NOT call `requireAdmin()` — the
 * word was there, so the check saw a call. Stripping comments first also makes
 * the other direction strict: a call that has been commented out no longer
 * counts as a guarded page, which is the failure this exists to catch.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function pagesUnder(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...pagesUnder(full, `${prefix}${entry}/`));
    } else if (entry === "page.tsx" || entry === "layout.tsx") {
      out.push(`${prefix}${entry}`);
    }
  }
  return out;
}

const pages = pagesUnder(ADMIN_DIR);
let guarded = 0;
for (const page of pages) {
  const source = code(readFileSync(join(ADMIN_DIR, page), "utf8"));
  if (page in EXEMPT) {
    check(
      !source.includes("requireAdmin("),
      `${page} is exempt (${EXEMPT[page]})`
    );
    continue;
  }
  if (source.includes("requireAdmin(")) {
    guarded++;
  } else {
    fail(`${page} does not call requireAdmin() — it would be open at aal1`);
  }
}
ok(`${guarded} admin page(s) behind requireAdmin()`);

/* ---- and requireAdmin() actually checks the second factor ---- */
const auth = code(readFileSync("src/lib/auth.ts", "utf8"));
check(
  auth.includes("mfaChallengePending") && auth.includes('redirect("/admin/login/verify")'),
  "requireAdmin() sends a session that still owes a code to the challenge screen"
);

/* ---- 2. next= cannot leave the panel ---- */
const escapes = [
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "http://evil.example",
  "/etc/passwd",
  "javascript:alert(1)",
  "",
  "/adminevil",
];
for (const value of escapes) {
  check(safeNext(value) === "/admin", `next=${JSON.stringify(value)} is refused`);
}

// Login screens are never a destination, or the challenge loops back on itself.
for (const value of ["/admin/login", "/admin/login/verify"]) {
  check(safeNext(value) === "/admin", `next=${value} is not a destination`);
}

// And a real page still works, or the whole hop is pointless.
for (const value of ["/admin", "/admin/catalog", "/admin/pages/contact"]) {
  check(safeNext(value) === value, `next=${value} is allowed through`);
}

check(safeNext(undefined) === "/admin", "a missing next falls back to /admin");

console.log(`\n${failures === 0 ? "MFA WIRING OK" : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
