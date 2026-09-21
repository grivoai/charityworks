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

/**
 * The address a person actually pastes, turned into the one the frame needs.
 *
 * Nobody copies an embed address. The share button on YouTube gives
 * youtu.be/<id>, the address bar gives youtube.com/watch?v=<id>, Vimeo gives
 * vimeo.com/<digits>, and Drive's "copy link" ends in /view. Each is a page,
 * not a player, and framing it shows either a broken frame or a sign-in wall.
 * The client sent exactly the first of these for the donation-matching video
 * (September 2026), and the field refused it with an explanation of what to
 * paste instead — accurate, and still a wall between them and the thing they
 * were trying to do.
 *
 * So the schema runs this before the allowlist. A recognised page address
 * becomes the player address for the same video; anything else is returned
 * untouched, so the allowlist still has the last word and an address it does
 * not know is refused exactly as before. Nothing here widens what is allowed:
 * every output is an address the list already accepted.
 *
 * YouTube goes to the nocookie host on purpose. It is the one the help text
 * recommends, and a video the client pastes from the ordinary site should not
 * quietly set tracking cookies that the recommended form would not.
 */
export function toEmbedUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:") return url;

  const host = parsed.hostname.replace(/^(www|m)\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

  // youtu.be/<id> — the share button's address.
  if (host === "youtu.be" && segments.length === 1 && YOUTUBE_ID.test(segments[0])) {
    return `https://www.youtube-nocookie.com/embed/${segments[0]}`;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    // /watch?v=<id> — the address bar.
    const v = parsed.searchParams.get("v");
    if (segments[0] === "watch" && v && YOUTUBE_ID.test(v)) {
      return `https://www.youtube-nocookie.com/embed/${v}`;
    }
    // /shorts/<id> and /live/<id> — the same player under a different path.
    if (
      (segments[0] === "shorts" || segments[0] === "live") &&
      segments.length === 2 &&
      YOUTUBE_ID.test(segments[1])
    ) {
      return `https://www.youtube-nocookie.com/embed/${segments[1]}`;
    }
    // Already an embed address, perhaps with ?si= or ?t= on the end. The
    // allowlist tests only the path, so the query would ride through into
    // the frame; drop it and keep the id.
    if (segments[0] === "embed" && segments.length === 2 && YOUTUBE_ID.test(segments[1])) {
      return `https://www.youtube-nocookie.com/embed/${segments[1]}`;
    }
  }

  // vimeo.com/<digits> — the address bar. The player host is left alone.
  if (host === "vimeo.com" && segments.length === 1 && /^\d+$/.test(segments[0])) {
    return `https://player.vimeo.com/video/${segments[0]}`;
  }

  // drive.google.com/file/d/<id>/view — "copy link" in Drive.
  if (
    host === "drive.google.com" &&
    segments[0] === "file" &&
    segments[1] === "d" &&
    segments[2] &&
    /^[A-Za-z0-9_-]+$/.test(segments[2]) &&
    (segments[3] === "view" || segments.length === 3)
  ) {
    return `https://drive.google.com/file/d/${segments[2]}/preview`;
  }

  return url;
}

/** The reason a URL was refused, in words meant for whoever pasted it. */
export function embedProblem(url: string): string | null {
  if (isAllowedEmbed(url)) return null;
  return (
    `That is not a video address this site can show. Paste a link to a video ` +
    `on YouTube, Vimeo or Google Drive — the share link is fine. For Google ` +
    `Drive the file must be shared with anyone who has the link.`
  );
}
