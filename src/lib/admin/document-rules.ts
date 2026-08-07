/**
 * What makes a document link valid, in one place both sides can read.
 *
 * Deliberately free of imports and of `server-only`, so the browser can refuse
 * a 40 MB file before spending four minutes uploading it and the server can
 * refuse the same file again afterwards. The browser's copy is a courtesy; the
 * server's is the decision. Sharing the wording means they cannot drift into
 * disagreeing about what the rule is, which is how a client ends up reading two
 * different explanations of the same refusal.
 */

/** Mirrored into the bucket by `supabase/migrations/0002_document_storage.sql`. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Only the shapes the admin can create, so a URL that could never exist costs nothing. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isDocumentSlug(value: string): boolean {
  return value.length > 0 && value.length <= 64 && SLUG.test(value);
}

/**
 * A title turned into the address people will be given.
 *
 * Suggested, never imposed: the field stays editable, because the address is
 * the part that gets printed and the client is the one who knows what it should
 * say.
 */
export function suggestSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}

export function slugProblem(slug: string): string | null {
  if (!slug) return "Give the link an address, like spring-newsletter.";
  if (slug.length > 64) return "That address is too long — 64 characters at most.";
  if (!isDocumentSlug(slug)) {
    return (
      "An address can use lowercase letters, numbers and hyphens only, " +
      "and cannot start or end with a hyphen."
    );
  }
  return null;
}

export function titleProblem(title: string): string | null {
  if (!title.trim()) return "Give the document a name, so the list is readable.";
  if (title.length > 200) return "That name is too long.";
  return null;
}

export function isPdfName(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

/**
 * A filename that is safe to store and safe to hand back as a download name.
 *
 * Path separators and control characters are removed rather than rejected: the
 * name is decoration here — the object's path is a UUID — and refusing a file
 * because of a character in its name would be an obstacle without a purpose.
 */
export function cleanFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = Array.from(base)
    // Control characters and double quotes: the two things that would break
    // the Content-Disposition header this name ends up in. Written as a filter
    // rather than a character class so the source stays readable.
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code > 31 && code !== 127 && ch !== '"';
    })
    .join("")
    .trim();
  return cleaned.slice(0, 120) || "document.pdf";
}

/** The first thing a file is judged on, in the browser and again on the server. */
export function fileProblem(filename: string, bytes: number): string | null {
  if (!isPdfName(filename)) return "Only PDF files can be uploaded here.";
  if (bytes === 0) return "That file is empty.";
  if (bytes > MAX_DOCUMENT_BYTES) {
    return `That file is ${formatBytes(bytes)}. The limit is ${formatBytes(MAX_DOCUMENT_BYTES)}.`;
  }
  return null;
}
