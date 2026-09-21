"use server";

import { requireAdmin } from "@/lib/auth";
import {
  IMAGE_BUCKET,
  UploadError,
  imageUrlFor,
  ingestImage,
  signImageUpload,
} from "@/lib/admin/uploads";
import { imageWarning } from "@/lib/admin/image-rules";
import { findImageUses } from "@/lib/admin/image-usage";
import { recordAudit } from "@/lib/admin/audit";
import { getServiceClient } from "@/lib/supabase";
import { formatWhen } from "@/lib/admin/page-meta";

/**
 * Uploading a photograph from inside the editor.
 *
 * Two steps with a transfer between them, the same shape as the document
 * upload and for the same reason: the bytes go straight to storage because a
 * server action cannot receive them.
 *
 * Nothing here writes content. The action returns a URL and the editor puts it
 * in the field, so the photograph is not on the site until the client saves —
 * which keeps every guarantee the save path already makes. It also means an
 * upload the client then abandons is an unused row rather than a surprise
 * change to a live page.
 */

export type SignImageResult =
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; message: string };

export type AddImageResult =
  | {
      ok: true;
      src: string;
      width: number | null;
      height: number | null;
      filename: string;
      /** Said rather than refused — see `imageWarning`. */
      warning?: string;
      /** True when this photograph was already in the library. */
      deduped: boolean;
    }
  | { ok: false; message: string };

export async function signImage(filename: string): Promise<SignImageResult> {
  await requireAdmin();

  try {
    const signed = await signImageUpload(filename);
    return { ok: true, ...signed };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[images] could not sign an upload", error);
    return { ok: false, message: "The upload could not be started. Please try again." };
  }
}

export async function addImage(input: {
  path: string;
  filename: string;
}): Promise<AddImageResult> {
  const admin = await requireAdmin();

  try {
    const image = await ingestImage({
      path: input.path,
      filename: input.filename,
      adminId: admin.id,
    });

    const warning = imageWarning(image.width);
    return {
      ok: true,
      src: image.src,
      width: image.width,
      height: image.height,
      filename: image.filename,
      deduped: image.deduped,
      ...(warning ? { warning } : {}),
    };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[images] could not ingest an upload", error);
    return { ok: false, message: "That photograph could not be added. Please try again." };
  }
}

/* ------------------------------------------------------------------ */
/* The library                                                         */
/* ------------------------------------------------------------------ */

export interface LibraryImage {
  id: string;
  src: string;
  filename: string;
  width: number | null;
  height: number | null;
  uploadedLabel: string;
}

/**
 * Photographs already uploaded, newest first.
 *
 * Only what has come through the admin. The ninety-six photographs Phase 1
 * shipped live in `public/images` as files, not rows, so they are not here and
 * cannot be — their paths are already in the content, and the text box is how
 * one of those is reused. The picker says which it is showing rather than
 * looking broken when it is empty.
 *
 * Uncached: a photograph uploaded a second ago has to appear, and this is a
 * list of at most a few dozen rows behind an admin login.
 */
export async function listImages(limit = 60): Promise<LibraryImage[]> {
  await requireAdmin();

  const { data, error } = await getServiceClient()
    .from("uploads")
    .select("id, path, filename, width, height, created_at")
    .eq("bucket", IMAGE_BUCKET)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<
      {
        id: string;
        path: string;
        filename: string;
        width: number | null;
        height: number | null;
        created_at: string;
      }[]
    >();

  if (error) {
    console.error("[images] the library could not be read", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    src: imageUrlFor(row.path),
    filename: row.filename,
    width: row.width,
    height: row.height,
    uploadedLabel: formatWhen(row.created_at),
  }));
}

/* ------------------------------------------------------------------ */
/* Deleting                                                            */
/* ------------------------------------------------------------------ */

export type DeleteImageResult =
  | { ok: true; note: string }
  | { ok: false; message: string };

/**
 * Deletes a photograph outright. Refused while anything on the site shows it.
 *
 * The same shape as `deleteUpload` for documents, with the usage scan where
 * that has the `document_links` foreign key: the content holds a URL string,
 * not a reference, so the database cannot refuse this on its own and the scan
 * has to. Run strict — a scan that could not read a table would otherwise
 * answer "unused" for a photograph it never looked for.
 *
 * Row first, then object, for the reason the document version gives: a row
 * with no object is a broken picture, an object with no row is invisible, and
 * the second is the better one to be left with if this is interrupted.
 */
export async function deleteImage(uploadId: string): Promise<DeleteImageResult> {
  const admin = await requireAdmin();
  const supabase = getServiceClient();

  const upload = await supabase
    .from("uploads")
    .select("id, path, filename")
    .eq("id", uploadId)
    .eq("bucket", IMAGE_BUCKET)
    .maybeSingle<{ id: string; path: string; filename: string }>();

  if (upload.error || !upload.data) {
    return { ok: false, message: "That photograph is not in the library." };
  }

  let uses;
  try {
    uses = (await findImageUses({ strict: true })).get(upload.data.path) ?? [];
  } catch (error) {
    console.error("[images] the usage scan failed, so nothing was deleted", error);
    return {
      ok: false,
      message: "It could not be confirmed that nothing uses this photograph, so it was not deleted. Please try again.",
    };
  }

  if (uses.length > 0) {
    return {
      ok: false,
      message:
        `${upload.data.filename} is still shown on ` +
        uses.map((u) => u.label).join("; ") +
        ". Change the picture there first, then delete it here.",
    };
  }

  const { error } = await supabase.from("uploads").delete().eq("id", uploadId);
  if (error) {
    return { ok: false, message: `That photograph could not be removed: ${error.message}` };
  }

  const removed = await supabase.storage.from(IMAGE_BUCKET).remove([upload.data.path]);
  if (removed.error) {
    console.error("[images] row deleted but object remains", upload.data.path, removed.error);
  }

  /* The filename and path go in the entry because the row that held them is
     gone — "who deleted that photograph" is unanswerable otherwise. */
  await recordAudit({
    actorId: admin.id,
    action: "upload.delete",
    entity: "uploads",
    entityId: uploadId,
    detail: { bucket: IMAGE_BUCKET, filename: upload.data.filename, path: upload.data.path },
  });

  return { ok: true, note: `${upload.data.filename} was deleted.` };
}
