/**
 * Which addresses may be put inside an iframe on this site.
 *
 * An embed URL is content: it is stored in a page document and editable in the
 * admin. Everything else editable here is text that lands in a text node, where
 * React escapes it and the worst outcome is a typo on the page. An iframe `src`
 * is different in kind — it is the one content field that decides what code
 * runs in a frame on charityworks.net — so it is the one that gets a list of
 * hosts rather than a shrug.
 *
 * Not `sandbox`. A sandboxed frame cannot run the players below, and a
 * sandbox with `allow-scripts allow-same-origin` for a third-party origin is
 * the combination that grants back what the attribute was for. An allowlist of
 * hosts we would embed anyway is the honest control.
 *
 * Deliberately free of imports and of `server-only`, so the schema can validate
 * a save with it and the renderer can refuse with it. One list, checked twice —
 * the schema's copy is the message, the renderer's is the decision.
 */

/**
 * Hosts whose embed players are allowed, and the path each one's embeds live
 * under. The path matters: `drive.google.com` also serves the whole of Google
 * Drive, and only `/file/<id>/preview` is a player.
 */
const ALLOWED: Array<{ host: string; path: RegExp }> = [
  // Google Drive's own player. `/preview` rather than `/view`: /view is the
  // Drive UI, which renders inside an iframe as a sign-in wall for anyone not
  // logged into a Google account.
  { host: "drive.google.com", path: /^\/file\/d\/[A-Za-z0-9_-]+\/preview$/ },
  { host: "www.youtube-nocookie.com", path: /^\/embed\/[A-Za-z0-9_-]+$/ },
  { host: "www.youtube.com", path: /^\/embed\/[A-Za-z0-9_-]+$/ },
  { host: "player.vimeo.com", path: /^\/video\/\d+$/ },
];

/** Hosts named in the help text and in the refusal, so both stay in step with the list. */
export const EMBED_HOSTS = ALLOWED.map((entry) => entry.host).join(", ");

/**
 * True when `url` is an embed player this site will frame.
 *
 * https only — an http frame on an https page is blocked by the browser
 * anyway, and silently, which is the worst way to find out.
 */
export function isAllowedEmbed(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return ALLOWED.some(
    (entry) => entry.host === parsed.hostname && entry.path.test(parsed.pathname)
  );
}

/** The reason a URL was refused, in words meant for whoever pasted it. */
export function embedProblem(url: string): string | null {
  if (isAllowedEmbed(url)) return null;
  return (
    `That is not an embed address this site can show. Use a share link from ` +
    `${EMBED_HOSTS} — for Google Drive it is the file's address ending in ` +
    `/preview, not /view.`
  );
}
