/**
 * Deployment configuration — not content.
 *
 * These are derived from environment variables and are deliberately kept out of
 * the database and out of the admin panel. `siteUrl` is the origin every
 * canonical tag, OpenGraph URL and sitemap entry is built from; making it
 * editable would let a single mistyped field point the whole site's canonicals
 * at a domain that does not serve it. Same for `noindex`, where a wrong value
 * either deindexes a live site or indexes a staging one.
 *
 * Content lives in `@/content` and is edited in the admin. This is not.
 */

/** Canonical origin. Set NEXT_PUBLIC_SITE_URL in Vercel to the production domain. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.charityworks.net"
).replace(/\/$/, "");

/**
 * Whether to tell search engines not to index this deployment.
 *
 * On while the site is served from a *.vercel.app URL: canonical tags point at
 * https://www.charityworks.net, which currently serves the client's legacy
 * site. Letting that get indexed would have every page declaring a canonical
 * on a domain that does not contain it — worse than not being indexed at all.
 *
 * TURN THIS OFF when DNS cuts over to Vercel. See README, "Launch checklist".
 * Defaults to false so a missing variable can never silently deindex a live
 * site; it has to be switched on deliberately.
 */
export const noindex = process.env.SITE_NOINDEX === "true";
