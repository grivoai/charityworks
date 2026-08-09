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
