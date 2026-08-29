"use server";

import { updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { DOCUMENTS_TAG } from "@/lib/content-tags";
import {
  cleanFilename,
  slugProblem,
  titleProblem,
} from "@/lib/admin/document-rules";
import {
  DOCUMENT_BUCKET,
  UploadError,
  ingestDocument,
  signDocumentUpload,
} from "@/lib/admin/uploads";
import { recordAudit } from "@/lib/admin/audit";

/**
 * Everything the documents page can do.
 *
 * Plain async functions rather than `useActionState` reducers, because the
 * upload is three steps with a network transfer in the middle — sign, PUT to
 * storage, then record — and a form action cannot straddle that. Each one is
 * still a server action, which means each one is an endpoint anybody can find
 * and call, which is why every one of them starts with `requireAdmin()`.
 *
 * They all report failure as a returned value rather than a thrown error. A
 * throw across the action boundary reaches the client as "an unexpected
 * response was received", and a client who has just uploaded a 12 MB file
 * deserves to be told which of the things that could be wrong is wrong.
 */

export type DocumentResult =
  | { ok: true; slug: string; note?: string }
  | { ok: false; message: string };

export type SignResult =
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; message: string };

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

/**
 * Step one: a URL the browser can PUT the file to.
 *
 * Handing a signed URL to the browser is safe because it is bound to one path
 * and works once — so the worst it can be used for is the upload it was issued
 * for. Nothing is recorded here; an abandoned upload leaves an object with no
 * row, which `npm run check:uploads` reports.
 */
export async function signUpload(filename: string): Promise<SignResult> {
  await requireAdmin();

  try {
    const signed = await signDocumentUpload(filename);
    return { ok: true, ...signed };
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[documents] could not sign an upload", error);
    return { ok: false, message: "The upload could not be started. Please try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/** Step two: check the uploaded file, record it, and give it its address. */
export async function createDocument(input: {
  path: string;
  filename: string;
  title: string;
  slug: string;
}): Promise<DocumentResult> {
  const admin = await requireAdmin();

  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();

  const problem = titleProblem(title) ?? slugProblem(slug);
  if (problem) return { ok: false, message: problem };

  const supabase = getServiceClient();

  /**
   * Checked before the file is ingested, so a taken address costs the client a
   * rename rather than an orphaned upload. The primary key is still the real
   * guard — this is a race away from being wrong, and the insert below is what
   * actually decides.
   */
  const taken = await supabase
    .from("document_links")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (taken.data) {
    return {
      ok: false,
      message: `/d/${slug} is already in use. Choose another address, or replace the file on the existing one.`,
    };
  }

  let ingested;
  try {
    ingested = await ingestDocument({
      path: input.path,
      filename: input.filename,
      adminId: admin.id,
    });
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[documents] could not ingest an upload", error);
    return { ok: false, message: "That file could not be added. Please try again." };
  }

  const { error } = await supabase.from("document_links").insert({
    slug,
    upload_id: ingested.uploadId,
    title,
  });

  if (error) {
    // The upload survives on purpose. It is a valid file in the library and the
    // client can point a link at it; deleting it to tidy up after a failed
    // insert would throw away the part that took the longest.
    if (error.code === "23505") {
      return { ok: false, message: `/d/${slug} was taken a moment ago. Choose another address.` };
    }
    return { ok: false, message: `The link could not be created: ${error.message}` };
  }

  updateTag(DOCUMENTS_TAG);

  return {
    ok: true,
    slug,
    note: ingested.deduped
      ? "That file was already in the library, so the link points at the copy already there."
      : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Replace                                                             */
/* ------------------------------------------------------------------ */

/**
 * A new file behind an address that does not change.
 *
 * The previous upload is left alone rather than deleted, which is what makes
 * this undoable: every version is still in the library, and pointing the link
 * back at last quarter's file is the same action as replacing it.
 */
export async function replaceDocumentFile(input: {
  slug: string;
  path: string;
  filename: string;
}): Promise<DocumentResult> {
  const admin = await requireAdmin();

  const slug = input.slug.trim().toLowerCase();
  if (slugProblem(slug)) return { ok: false, message: "That link does not exist." };

  const supabase = getServiceClient();

  const link = await supabase
    .from("document_links")
    .select("slug, upload_id")
    .eq("slug", slug)
    .maybeSingle<{ slug: string; upload_id: string }>();

  if (link.error || !link.data) {
    return { ok: false, message: "That link does not exist." };
  }

  let ingested;
  try {
    ingested = await ingestDocument({
      path: input.path,
      filename: input.filename,
      adminId: admin.id,
    });
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    console.error("[documents] could not ingest a replacement", error);
    return { ok: false, message: "That file could not be added. Please try again." };
  }

  if (ingested.uploadId === link.data.upload_id) {
    return {
      ok: true,
      slug,
      note: "That is the same file that was already there, so nothing changed.",
    };
  }

  const { error } = await supabase
    .from("document_links")
    .update({ upload_id: ingested.uploadId, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    return { ok: false, message: `The link could not be updated: ${error.message}` };
  }

  /* A replacement changes what a public address serves without changing the
     address, so nothing else on the site records that it happened. */
  await recordAudit({
    actorId: admin.id,
    action: "document.replace",
    entity: "document_links",
    entityId: slug,
    detail: { from: link.data.upload_id, to: ingested.uploadId },
  });

  updateTag(DOCUMENTS_TAG);

  return {
    ok: true,
    slug,
    note: ingested.deduped
      ? `/d/${slug} now points at ${ingested.filename}, which was already in the library.`
      : `/d/${slug} now points at ${ingested.filename}. Every copy of that link is already showing it.`,
  };
}

/** Points an existing link at a file already in the library. */
export async function repointDocument(input: {
  slug: string;
  uploadId: string;
}): Promise<DocumentResult> {
  await requireAdmin();

  const slug = input.slug.trim().toLowerCase();
  if (slugProblem(slug)) return { ok: false, message: "That link does not exist." };

  const supabase = getServiceClient();

  const upload = await supabase
    .from("uploads")
    .select("id, filename")
    .eq("id", input.uploadId)
    .eq("bucket", DOCUMENT_BUCKET)
    .maybeSingle<{ id: string; filename: string }>();

  if (upload.error || !upload.data) {
    return { ok: false, message: "That file is not in the library." };
  }

  const { error } = await supabase
    .from("document_links")
    .update({ upload_id: upload.data.id, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    return { ok: false, message: `The link could not be updated: ${error.message}` };
  }

  updateTag(DOCUMENTS_TAG);
  return { ok: true, slug, note: `/d/${slug} now points at ${upload.data.filename}.` };
}

/* ------------------------------------------------------------------ */
/* Rename and remove                                                   */
/* ------------------------------------------------------------------ */

/**
 * The name, not the address.
 *
 * The address is deliberately not editable. Changing it would break every copy
 * of the link that has been sent out, which is the one promise this feature
 * makes. A link that has outlived its name gets a second link instead.
 */
export async function renameDocument(input: {
  slug: string;
  title: string;
}): Promise<DocumentResult> {
  await requireAdmin();

  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();

  if (slugProblem(slug)) return { ok: false, message: "That link does not exist." };
  const problem = titleProblem(title);
  if (problem) return { ok: false, message: problem };

  const { error } = await getServiceClient()
    .from("document_links")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) return { ok: false, message: `That could not be saved: ${error.message}` };

  updateTag(DOCUMENTS_TAG);
  return { ok: true, slug };
}

/**
 * Removes the address. The file stays in the library.
 *
 * Two separate destructive things, kept separate: taking a link out of
 * circulation is reversible in a way that deleting the PDF is not.
 */
export async function deleteDocumentLink(slug: string): Promise<DocumentResult> {
  const admin = await requireAdmin();

  const clean = slug.trim().toLowerCase();
  if (slugProblem(clean)) return { ok: false, message: "That link does not exist." };

  const { error } = await getServiceClient()
    .from("document_links")
    .delete()
    .eq("slug", clean);

  if (error) return { ok: false, message: `That could not be removed: ${error.message}` };

  /* The link row is gone, so this entry is the only remaining record that the
     address ever existed or who withdrew it. */
  await recordAudit({
    actorId: admin.id,
    action: "document.delete",
    entity: "document_links",
    entityId: clean,
  });

  updateTag(DOCUMENTS_TAG);
  return {
    ok: true,
    slug: clean,
    note: `/d/${clean} no longer resolves. The file is still in the library below.`,
  };
}

/** Deletes a file outright. Refused while any link still points at it. */
export async function deleteUpload(uploadId: string): Promise<DocumentResult> {
  const admin = await requireAdmin();

  const supabase = getServiceClient();

  const upload = await supabase
    .from("uploads")
    .select("id, path, filename")
    .eq("id", uploadId)
    .eq("bucket", DOCUMENT_BUCKET)
    .maybeSingle<{ id: string; path: string; filename: string }>();

  if (upload.error || !upload.data) {
    return { ok: false, message: "That file is not in the library." };
  }

  const links = await supabase
    .from("document_links")
    .select("slug")
    .eq("upload_id", uploadId)
    .returns<{ slug: string }[]>();

  if (links.data && links.data.length > 0) {
    // The foreign key would refuse this anyway; saying which link is in the way
    // is the difference between an error and an instruction.
    return {
      ok: false,
      message:
        `${upload.data.filename} is still behind ` +
        links.data.map((l) => `/d/${l.slug}`).join(", ") +
        ". Point that link somewhere else first, or remove it.",
    };
  }

  // The row first: an object with no row is invisible, a row with no object is
  // a link that 404s. Deleting the object first is the worse of the two to be
  // interrupted halfway through.
  const { error } = await supabase.from("uploads").delete().eq("id", uploadId);
  if (error) {
    return { ok: false, message: `That file could not be removed: ${error.message}` };
  }

  const removed = await supabase.storage.from(DOCUMENT_BUCKET).remove([upload.data.path]);
  if (removed.error) {
    console.error("[documents] row deleted but object remains", upload.data.path, removed.error);
  }

  /* The filename is kept in the entry because the row that held it is gone —
     "who deleted that file" is unanswerable otherwise. */
  await recordAudit({
    actorId: admin.id,
    action: "upload.delete",
    entity: "uploads",
    entityId: uploadId,
    detail: { filename: upload.data.filename, path: upload.data.path },
  });

  updateTag(DOCUMENTS_TAG);
  return { ok: true, slug: "", note: `${cleanFilename(upload.data.filename)} was deleted.` };
}
