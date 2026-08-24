import "server-only";

/**
 * The value that ties a cached content entry to one build of the site.
 *
 * WHAT GOES WRONG WITHOUT IT. Vercel restores `.next/cache` between builds, and
 * a content edit changes no source file. So a build can be handed the database
 * as it looked at some earlier deploy, prerender that, and report success. The
 * site then serves copy the client changed and cannot see, with nothing in the
 * build log to say so. Putting a per-build value in every cache key is what
 * makes a build read Postgres for real.
 *
 * WHY NOT THE COMMIT SHA, WHICH IS WHAT THIS USED TO BE. Two deployments of the
 * same commit share a SHA, so the second one restored the first one's cache and
 * rebuilt from its snapshot of the database — the exact failure the key was
 * added to prevent, reintroduced whenever a deploy did not carry new code. That
 * is not a rare case here: content lives in the database, so "redeploy to pick
 * up the client's edits" is a routine action, and it was the one action the old
 * key could not survive. This project had eleven same-SHA production deploys in
 * three days.
 *
 * The deployment id is unique per deployment and stable across a deployment's
 * build and its runtime, which is what a cache key has to be: two builds must
 * never share one, and one build's prerender and its later revalidations must.
 *
 * IT THROWS RATHER THAN GUESSING. Falling back to a fixed string on Vercel
 * would put every deployment back on a shared key, and the symptom — stale
 * copy, sometimes, on some pages — is one nobody would trace back to here. A
 * failed build says so on the spot. This is the same trade `content-source.ts`
 * makes when a query fails, for the same reason.
 */

type Env = Record<string, string | undefined>;

export function resolveBuildKey(env: Env = process.env): string {
  /* `||` and not `??`: an unset Vercel system variable can arrive as an empty
     string, which is absent for our purposes but not nullish. */
  const perDeployment = env.VERCEL_DEPLOYMENT_ID || env.VERCEL_URL;
  if (perDeployment) return perDeployment;

  if (env.VERCEL) {
    throw new Error(
      "[content] Running on Vercel with neither VERCEL_DEPLOYMENT_ID nor " +
        "VERCEL_URL set, so there is no per-deployment value to key the " +
        "content cache on. Continuing would let this build reuse an earlier " +
        "deployment's cached copy of the database and prerender content the " +
        "client has already changed. See src/lib/build-key.ts."
    );
  }

  /* Off Vercel there is no deployment to name. `next dev` and a local
     `next build` both reuse `.next/cache` across runs, so a constant here
     reproduces the very staleness this module exists to prevent — locally it
     shows up as edits made in the admin not appearing until `.next` is deleted.
     A fresh value per evaluation costs a few extra reads and never lies.

     Stability within a run comes from this being read once into `BUILD_KEY`
     below, not from the value being reproducible — so it is free to be random,
     and has to be: a timestamp alone repeats when two runs start inside the
     same millisecond, which is exactly what the check for this caught. */
  const suffix = Math.random().toString(36).slice(2, 10);
  return env.NEXT_BUILD_ID || `local-${Date.now()}-${suffix}`;
}

export const BUILD_KEY = resolveBuildKey();
