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

/**
 * Canonical origin. Set NEXT_PUBLIC_SITE_URL in Vercel to the production domain.
 *
 * THE BARE DOMAIN, NOT www — and that is a decision rather than a preference.
 * The legacy site canonicalises to the apex: www.charityworks.net has 301'd to
 * charityworks.net for years and its sitemap lists every URL on the apex, so
 * every ranking, backlink and bookmark that exists today points there. Setting
 * www as canonical would put a permanent redirect in front of the entire
 * indexed site on day one, and a two-hop chain in front of the eighteen legacy
 * paths that also move. The site is already on the host search engines prefer;
 * this follows it rather than fighting it.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://charityworks.net"
).replace(/\/$/, "");

/**
 * Whether to tell search engines not to index this deployment.
 *
 * On while the site is served from a *.vercel.app URL: canonical tags point at
 * https://charityworks.net, which currently serves the client's legacy
 * site. Letting that get indexed would have every page declaring a canonical
 * on a domain that does not contain it — worse than not being indexed at all.
 *
 * TURN THIS OFF when DNS cuts over to Vercel. See README, "Launch checklist".
 * Defaults to false so a missing variable can never silently deindex a live
 * site; it has to be switched on deliberately.
 */
export const noindex = process.env.SITE_NOINDEX === "true";

/**
 * hCaptcha site key for the admin login form.
 *
 * Public by design: it is rendered into the page HTML and only identifies which
 * widget to draw. The half that must stay secret is the SECRET key, and that one
 * is not in this repo at all — it is entered in the Supabase dashboard under
 * Authentication > Bot and Abuse Protection, which is what verifies the token.
 *
 * Read from the environment so a different key can be used per deployment
 * without a code change, defaulting to the production site's key so a missing
 * variable does not silently render an unverifiable widget.
 */
export const hcaptchaSiteKey =
  process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ??
  "a5468e90-5ee6-4de2-bae4-bad063d6f8b6";
