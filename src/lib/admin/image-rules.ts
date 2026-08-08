import { formatBytes } from "@/lib/admin/document-rules";

/**
 * What makes an uploaded photograph acceptable, shared by both sides.
 *
 * Same arrangement as `document-rules.ts` and for the same reason: the browser
 * refuses the obvious cases before spending a minute uploading, the server
 * refuses them again afterwards, and sharing the wording means the two cannot
 * come to disagree about what the rule is.
 */

/** Mirrored into the bucket by `supabase/migrations/0003_image_storage.sql`. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * The three formats worth accepting.
 *
 * No SVG, deliberately. An SVG is a document that can carry script, the bucket
 * is public, and `next/image` cannot optimize one anyway — so it would be the
 * one upload that is both riskier and worse than what it replaces.
 */
export const IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

export type ImageExtension = keyof typeof IMAGE_TYPES;

export function imageExtension(filename: string): ImageExtension | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = filename.slice(dot).toLowerCase();
  return ext in IMAGE_TYPES ? (ext as ImageExtension) : null;
}

/**
 * A photograph small enough to serve.
 *
 * The ceiling is generous but not unbounded: these are catalog photographs on a
 * page that already loads a dozen of them, and `next/image` resizes on the way
 * out — so a 30 MB original costs the client's visitors nothing and the
 * client's storage everything.
 */
export function imageProblem(filename: string, bytes: number): string | null {
  if (!imageExtension(filename)) {
    return "Photographs can be JPG, PNG or WebP files.";
  }
  if (bytes === 0) return "That file is empty.";
  if (bytes > MAX_IMAGE_BYTES) {
    return `That photograph is ${formatBytes(bytes)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
  }
  return null;
}

/**
 * The smallest a photograph can usefully be.
 *
 * Not a refusal — a warning. A small image is a judgement about how it will
 * look, and the person choosing it can see the page it goes on; refusing it
 * outright would be this file overruling them about their own photograph.
 */
export const SMALL_IMAGE_WIDTH = 600;

export function imageWarning(width: number | null): string | null {
  if (width !== null && width < SMALL_IMAGE_WIDTH) {
    return (
      `That photograph is only ${width}px wide, so it will look soft on a large ` +
      `screen. It has been added — swap it for a bigger one if it looks wrong.`
    );
  }
  return null;
}
