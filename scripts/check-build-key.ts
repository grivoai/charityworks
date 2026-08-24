/**
 * Checks the rule that decides whether a build reads the database or reuses an
 * earlier deployment's snapshot of it.
 *
 *     npm run check:build-key
 *
 * This has a check of its own because the failure it guards against is silent
 * and looks like something else. A build that reuses a stale cache succeeds,
 * reports Ready, and serves copy the client has already changed — the symptom
 * arrives days later as "the site is ignoring my edits", and nothing in the
 * build log points here.
 *
 * The case that matters most is two deployments of the same commit, because
 * that is not an edge case on this site: content lives in the database, so
 * redeploying unchanged code to pick up an edit is a routine act, and it is
 * exactly the one the previous commit-keyed version could not survive.
 */
import { resolveBuildKey } from "../src/lib/build-key";

let failures = 0;

function ok(message: string) {
  console.log(`  ok    ${message}`);
}

function fail(message: string) {
  failures++;
  console.log(`  FAIL  ${message}`);
}

function check(condition: boolean, message: string) {
  if (condition) ok(message);
  else fail(message);
}

console.log("\nChecking the content cache key\n");

/* ---- 1. Two deployments of one commit must not share a key ---- */
const sha = "1dc9548c9ad16bb7f005bb55f42ade976dd36372";
const first = resolveBuildKey({
  VERCEL: "1",
  VERCEL_GIT_COMMIT_SHA: sha,
  VERCEL_DEPLOYMENT_ID: "dpl_aaaaaaaaaaaaaaaaaaaaaaaaaaaa",
});
const second = resolveBuildKey({
  VERCEL: "1",
  VERCEL_GIT_COMMIT_SHA: sha,
  VERCEL_DEPLOYMENT_ID: "dpl_bbbbbbbbbbbbbbbbbbbbbbbbbbbb",
});
check(
  first !== second,
  "two deployments of the same commit get different keys"
);

/* ---- 2. One deployment must keep one key ---- */
const env = {
  VERCEL: "1",
  VERCEL_DEPLOYMENT_ID: "dpl_cccccccccccccccccccccccccccc",
  VERCEL_URL: "charityworks-abc123-grivoais-projects.vercel.app",
};
check(
  resolveBuildKey(env) === resolveBuildKey(env),
  "one deployment's build and its later revalidations share a key"
);

/* ---- 3. The deployment URL carries it when the id is absent ---- */
check(
  resolveBuildKey({
    VERCEL: "1",
    VERCEL_URL: "charityworks-abc123-grivoais-projects.vercel.app",
  }) !== resolveBuildKey({
    VERCEL: "1",
    VERCEL_URL: "charityworks-def456-grivoais-projects.vercel.app",
  }),
  "VERCEL_URL stands in for the id, and is still unique per deployment"
);

/* ---- 4. An empty variable counts as absent, not as a key ---- */
check(
  resolveBuildKey({
    VERCEL: "1",
    VERCEL_DEPLOYMENT_ID: "",
    VERCEL_URL: "charityworks-abc123-grivoais-projects.vercel.app",
  }).length > 0,
  "an empty VERCEL_DEPLOYMENT_ID falls through instead of keying on nothing"
);

/* ---- 5. On Vercel with nothing to key on, it must refuse ---- */
let threw = false;
try {
  resolveBuildKey({ VERCEL: "1", VERCEL_GIT_COMMIT_SHA: sha });
} catch {
  threw = true;
}
check(
  threw,
  "on Vercel with no per-deployment value, the build fails instead of guessing"
);

/* ---- 6. The commit SHA alone is never accepted ----
   The regression this whole module exists to prevent: a key that a second
   deploy of the same commit would match. */
let shaLeaked = false;
try {
  shaLeaked = resolveBuildKey({ VERCEL: "1", VERCEL_GIT_COMMIT_SHA: sha }) === sha;
} catch {
  shaLeaked = false;
}
check(!shaLeaked, "the commit SHA is never used as the key on its own");

/* ---- 7. Off Vercel, runs do not inherit each other's cache ---- */
check(
  resolveBuildKey({}) !== resolveBuildKey({}),
  "a local build or dev server does not reuse the previous run's cache"
);

/* ---- 8. An explicit build id still wins locally ---- */
check(
  resolveBuildKey({ NEXT_BUILD_ID: "fixed" }) === "fixed",
  "NEXT_BUILD_ID is honoured when something sets it deliberately"
);

console.log(
  `\n${failures === 0 ? "BUILD KEY OK" : `${failures} check(s) failed`}\n`
);
process.exit(failures === 0 ? 0 : 1);
