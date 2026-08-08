import "server-only";

import { createHash } from "node:crypto";

import { getServiceClient } from "@/lib/supabase";
import {
  cleanFilename,
  fileProblem,
  isPdfName,
} from "@/lib/admin/document-rules";
import {
  IMAGE_TYPES,
  imageExtension,
  imageProblem,
} from "@/lib/admin/image-rules";
import { probeImage } from "@/lib/admin/image-probe";

/**
 * Getting a file into storage, and a row that describes it.
 *
 * THE BYTES DO NOT COME THROUGH THIS SERVER. Vercel caps a function's request
 * body at 4.5 MB, so a server action cannot receive a 10 MB brochure — it fails
 * with a 413 that says nothing useful, and only in production. The browser
 * therefore uploads straight to Supabase Storage using a URL signed here, and
 * the server inspects the object afterwards. Handing that URL out is safe
 * because it is one-shot and bound to the exact path it was signed for, both of
 * which `npm run check:uploads` proves rather than assumes.
 *
 * That order has one consequence worth stating plainly: for a moment, an object
 * exists that nothing has checked. So every path here that refuses a file also
 * deletes it. Unreferenced objects accumulating in a public bucket is exactly
 * the thing not to let happen quietly.
 *
 * What is enforced, and where:
 *
 *   - The bucket refuses anything over 25 MB or not declared as a PDF
 *     (`supabase/migrations/0002_document_storage.sql`). This is the only check
 *     that runs BEFORE the bytes are stored, so it is the one that matters for
 *     size — nothing here can stop a transfer that has already happened.
 *   - `ingestDocument` re-reads the size from the stored bytes rather than
 *     trusting the browser, and sniffs the first five of them. A content type
 *     is a claim; `%PDF-` is evidence.
 */

export const DOCUMENT_BUCKET = "documents";
export const IMAGE_BUCKET = "images";

/** Thrown with wording meant for the client, not for a log. */
export class UploadError extends Error {}

export interface SignedUpload {
  /** Where the browser PUTs the file. Expires, and works exactly once. */
  signedUrl: string;
  /** The object's path within the bucket, needed to ingest it afterwards. */
  path: string;
}

export interface IngestedUpload {
  uploadId: string;
  /** True when these exact bytes were already in the library. */
  deduped: boolean;
  filename: string;
  bytes: number;
}

/**
 * Signs an upload for one specific object.
 *
 * The path is a UUID, not the filename. Two reasons, both practical: two files
 * called `newsletter.pdf` cannot collide, and because a path is never reused for
 * different bytes, the object can be cached at the CDN indefinitely while
 * `/d/<slug>` stays instantly repointable.
 */
export async function signDocumentUpload(rawFilename: string): Promise<SignedUpload> {
  const filename = cleanFilename(rawFilename);
  if (!isPdfName(filename)) {
    throw new UploadError("Only PDF files can be uploaded here.");
  }

  const year = new Date().getUTCFullYear();
  const path = `${year}/${crypto.randomUUID()}.pdf`;

  const { data, error } = await getServiceClient()
    .storage.from(DOCUMENT_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new UploadError(
      `The upload could not be started: ${error?.message ?? "no URL was returned"}`
    );
  }

  return { signedUrl: data.signedUrl, path: data.path ?? path };
}

/** Deletes an object, ignoring failure — this only runs on a path already failing. */
async function discard(path: string): Promise<void> {
  try {
    await getServiceClient().storage.from(DOCUMENT_BUCKET).remove([path]);
  } catch (error) {
    console.error("[uploads] could not remove an unused object", path, error);
  }
}

/**
 * Checks an uploaded object and records it.
 *
 * Everything the row says about the file is measured here rather than taken
 * from the browser: the size from the bytes, the checksum from the bytes, and
 * the type from the first five of them.
 *
 * Identical bytes are not stored twice. The second upload is deleted and the
 * existing row reused, which is why the result says so — replacing a file with
 * the one already there should read as "that is the same file", not as a silent
 * no-op.
 */
export async function ingestDocument(input: {
  path: string;
  filename: string;
  adminId: string | null;
}): Promise<IngestedUpload> {
  const supabase = getServiceClient();
  const filename = cleanFilename(input.filename);
  const path = input.path;

  if (!isPdfName(filename)) {
    await discard(path);
    throw new UploadError("Only PDF files can be uploaded here.");
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .download(path);

  if (downloadError || !blob) {
    // Nothing to discard: either the upload never landed or it is unreadable,
    // and a delete that fails on an object that is not there is noise.
    throw new UploadError(
      "The uploaded file could not be read back. Please try uploading it again."
    );
  }

  const bytes = Buffer.from(await blob.arrayBuffer());

  const problem = fileProblem(filename, bytes.byteLength);
  if (problem) {
    await discard(path);
    throw new UploadError(problem);
  }

  // The header, not the content type. A browser will call anything
  // application/pdf if the extension says so, and the bucket believes it.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    await discard(path);
    throw new UploadError(
      "That file is not a PDF, whatever it is named. Try exporting it as a PDF first."
    );
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");

  const existing = await supabase
    .from("uploads")
    .select("id, filename, bytes")
    .eq("bucket", DOCUMENT_BUCKET)
    .eq("checksum", checksum)
    .limit(1)
    .maybeSingle<{ id: string; filename: string; bytes: number }>();

  if (existing.error) {
    await discard(path);
    throw new UploadError(
      `The file could not be checked against the library: ${existing.error.message}`
    );
  }

  if (existing.data) {
    await discard(path);
    return {
      uploadId: existing.data.id,
      deduped: true,
      filename: existing.data.filename,
      bytes: existing.data.bytes,
    };
  }

  const inserted = await supabase
    .from("uploads")
    .insert({
      bucket: DOCUMENT_BUCKET,
      path,
      filename,
      mime_type: "application/pdf",
      bytes: bytes.byteLength,
      checksum,
      uploaded_by: input.adminId,
    })
    .select("id")
    .single<{ id: string }>();

  if (inserted.error || !inserted.data) {
    await discard(path);
    throw new UploadError(
      `The file could not be added to the library: ${inserted.error?.message ?? "no row was returned"}`
    );
  }

  return {
    uploadId: inserted.data.id,
    deduped: false,
    filename,
    bytes: bytes.byteLength,
  };
}

/** The object's own public URL. A string built locally, not a request. */
export function publicUrlFor(path: string): string {
  return getServiceClient().storage.from(DOCUMENT_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

/* ------------------------------------------------------------------ */
/* Photographs                                                         */
/* ------------------------------------------------------------------ */

/**
 * The same arrangement as a document, one bucket over.
 *
 * Worth saying why it is not one shared function with a bucket argument: the
 * two differ in every check that matters. A document is proved by five bytes
 * and has no dimensions; a photograph is proved by a header that also carries
 * its size, and the size is the thing the client most often gets wrong. A
 * shared function would be a parameter list of the differences.
 */
export interface IngestedImage {
  uploadId: string;
  deduped: boolean;
  filename: string;
  bytes: number;
  /** The public URL, which is what goes into the content as `src`. */
  src: string;
  width: number | null;
  height: number | null;
}

export async function signImageUpload(rawFilename: string): Promise<SignedUpload> {
  const filename = cleanFilename(rawFilename);
  const extension = imageExtension(filename);
  if (!extension) {
    throw new UploadError("Photographs can be JPG, PNG or WebP files.");
  }

  const year = new Date().getUTCFullYear();
  const path = `${year}/${crypto.randomUUID()}${extension}`;

  const { data, error } = await getServiceClient()
    .storage.from(IMAGE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new UploadError(
      `The upload could not be started: ${error?.message ?? "no URL was returned"}`
    );
  }

  return { signedUrl: data.signedUrl, path: data.path ?? path };
}

async function discardImage(path: string): Promise<void> {
  try {
    await getServiceClient().storage.from(IMAGE_BUCKET).remove([path]);
  } catch (error) {
    console.error("[uploads] could not remove an unused image", path, error);
  }
}

/** The object's public URL. A string built locally, not a request. */
export function imageUrlFor(path: string): string {
  return getServiceClient().storage.from(IMAGE_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function ingestImage(input: {
  path: string;
  filename: string;
  adminId: string | null;
}): Promise<IngestedImage> {
  const supabase = getServiceClient();
  const filename = cleanFilename(input.filename);
  const path = input.path;
  const extension = imageExtension(filename);

  if (!extension) {
    await discardImage(path);
    throw new UploadError("Photographs can be JPG, PNG or WebP files.");
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(path);

  if (downloadError || !blob) {
    throw new UploadError(
      "The uploaded photograph could not be read back. Please try again."
    );
  }

  const bytes = Buffer.from(await blob.arrayBuffer());

  const problem = imageProblem(filename, bytes.byteLength);
  if (problem) {
    await discardImage(path);
    throw new UploadError(problem);
  }

  /* The header, not the extension. A .png that is really something else would
     otherwise sit in a public bucket being served as an image. */
  const probe = probeImage(bytes);
  if (!probe) {
    await discardImage(path);
    throw new UploadError(
      "That file is not a JPG, PNG or WebP photograph, whatever it is named."
    );
  }
  if (probe.format !== IMAGE_TYPES[extension]) {
    await discardImage(path);
    throw new UploadError(
      `That file is a ${probe.format.replace("image/", "").toUpperCase()} ` +
        `named ${extension}. Rename it to match, or export it again.`
    );
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");

  const existing = await supabase
    .from("uploads")
    .select("id, path, filename, bytes, width, height")
    .eq("bucket", IMAGE_BUCKET)
    .eq("checksum", checksum)
    .limit(1)
    .maybeSingle<{
      id: string;
      path: string;
      filename: string;
      bytes: number;
      width: number | null;
      height: number | null;
    }>();

  if (existing.error) {
    await discardImage(path);
    throw new UploadError(
      `The photograph could not be checked against the library: ${existing.error.message}`
    );
  }

  if (existing.data) {
    await discardImage(path);
    return {
      uploadId: existing.data.id,
      deduped: true,
      filename: existing.data.filename,
      bytes: existing.data.bytes,
      src: imageUrlFor(existing.data.path),
      width: existing.data.width,
      height: existing.data.height,
    };
  }

  const inserted = await supabase
    .from("uploads")
    .insert({
      bucket: IMAGE_BUCKET,
      path,
      filename,
      mime_type: probe.format,
      bytes: bytes.byteLength,
      width: probe.width,
      height: probe.height,
      checksum,
      uploaded_by: input.adminId,
    })
    .select("id")
    .single<{ id: string }>();

  if (inserted.error || !inserted.data) {
    await discardImage(path);
    throw new UploadError(
      `The photograph could not be added: ${inserted.error?.message ?? "no row was returned"}`
    );
  }

  return {
    uploadId: inserted.data.id,
    deduped: false,
    filename,
    bytes: bytes.byteLength,
    src: imageUrlFor(path),
    width: probe.width,
    height: probe.height,
  };
}
