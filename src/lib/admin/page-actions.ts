"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { $ZodIssue } from "zod/v4/core";

import { pageSchemas } from "@/content/schema";
import type { PageSlug } from "@/content/types";
import { PAGE_PATHS, isPageSlug } from "@/lib/admin/page-meta";
import { tagsForPage } from "@/lib/content-tags";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import type { FieldErrors } from "@/lib/admin/field-node";
import { locksForPage } from "@/lib/admin/locks";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import {
  ensureBaseline,
  getRevision,
  recordRevision,
} from "@/lib/admin/revisions";

/**
 * Saving and restoring page content.
 *
 * Every write here goes through the same four steps, in this order:
 *
 *   1. Prove who is asking          requireAdmin()
 *   2. Rebuild the shape            coerceToTree(), which is also the whitelist
 *   3. Prove the content is valid   the page's own Zod schema
 *   4. Record, write, publish       history first, then the row, then the cache
 *
 * Step 1 is here and not only in middleware. A server action is an HTTP
 * endpoint: it can be invoked directly, without ever loading the page whose
 * button calls it, so the guard has to sit at the work rather than in front of
 * the route.
 */

/* ------------------------------------------------------------------ */
/* Turning validation errors into English                              */
/* ------------------------------------------------------------------ */

/**
 * Zod's default messages are written for developers ("Too small: expected
 * string to have >=1 characters"). The person reading these is the client.
 */
function humanizeIssue(issue: $ZodIssue): string {
  if (issue.code === "too_small") {
    return issue.origin === "string"
      ? "This cannot be left empty."
      : `Too small — the smallest allowed is ${String(issue.minimum)}.`;
  }
  if (issue.code === "too_big") {
    return issue.origin === "string"
      ? "This is too long."
      : `Too large — the largest allowed is ${String(issue.maximum)}.`;
  }
  if (issue.code === "invalid_type") {
    if (issue.expected === "number") return "Enter a number.";
    return "This cannot be left empty.";
  }
  if (issue.code === "invalid_format") {
    const format = (issue as { format?: string }).format;
    if (format === "email") return "Enter a valid email address.";
    if (format === "url") return "Enter a full web address, starting with https://";
  }
  return issue.message;
}

function toFieldErrors(issues: readonly $ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    // First issue per field wins; a field with two complaints only needs one.
    if (!(key in errors)) errors[key] = humanizeIssue(issue);
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

/**
 * Makes a saved page visible on the live site.
 *
 * By tag, not by path. A page record does not render only on its own route —
 * the home page builds its enquiry form from the CONTACT record — and the list
 * of derived routes was previously maintained by hand, which is a list that is
 * wrong the first time someone reuses content and forgets to add a line. The
 * tag is declared by the read in `content.ts`, so every route that read this
 * page is invalidated whether or not anyone remembered it.
 *
 * `revalidatePath` stays for the page's own route. It is the one route that is
 * certain, it is proven working in production, and it costs a single call —
 * cheap insurance against the tag mechanism failing silently, which would
 * otherwise look exactly like "the admin panel does nothing".
 *
 * `updateTag` rather than `revalidateTag`: in Next 16 the latter now wants a
 * cache-life profile and warns without one, while `updateTag` keeps the
 * expire-immediately behaviour and adds read-your-own-writes. It may only be
 * called from a Server Action, which is what both callers here are — if either
 * ever becomes a route handler, this has to go back to
 * `revalidateTag(tag, "max")`.
 */
function publish(slug: PageSlug): void {
  for (const tag of tagsForPage(slug)) updateTag(tag);
  revalidatePath(PAGE_PATHS[slug]);
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface SaveState {
  ok?: true;
  /** Saved, but nothing had actually changed — no revision was recorded. */
  unchanged?: true;
  /** ISO timestamp of the save, which the editor uses to rebase its baseline. */
  savedAt?: string;
  /** The stored content, so the editor can show exactly what was kept. */
  data?: unknown;
  /** A whole-form problem: not signed in, malformed request, database refused. */
  message?: string;
  /** Something saved but a secondary step did not. */
  warning?: string;
  errors?: FieldErrors;
}

/** One page's content is a JSON document; a megabyte is far more than any of them. */
const MAX_PAYLOAD_BYTES = 512 * 1024;

interface PageRow {
  data: unknown;
}

async function readPage(slug: PageSlug): Promise<PageRow | null> {
  const { data, error } = await getServiceClient()
    .from("pages")
    .select("data")
    .eq("slug", slug)
    .maybeSingle<PageRow>();

  if (error) throw new Error(`could not read the page: ${error.message}`);
  return data;
}

/**
 * Validates, stores and publishes one page.
 *
 * The whole document is submitted as a single JSON field rather than as a
 * hundred named inputs. The form is built from the schema at runtime and grows
 * and shrinks as lists are edited, so encoding paths into input names would mean
 * reassembling a tree from `hero.stats.3.value` on the way back in — and
 * getting array compaction wrong the first time someone deletes the middle of a
 * list. One document in, one document out.
 */
export async function savePage(
  _previous: SaveState,
  formData: FormData
): Promise<SaveState> {
  const admin = await requireAdmin();

  const slug = formData.get("slug");
  if (!isPageSlug(slug)) {
    return { message: "That page does not exist." };
  }

  const raw = formData.get("data");
  if (typeof raw !== "string") {
    return { message: "The form did not submit any content." };
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return { message: "That is too much content for one page." };
  }

  let submitted: unknown;
  try {
    submitted = JSON.parse(raw);
  } catch {
    return { message: "The form's content could not be read. Please try again." };
  }

  /**
   * The stored page is read before the submission is rebuilt, not after.
   *
   * Coercion needs it: a locked field's value is taken from here rather than
   * from the request, so that a lock is a constraint on what can be saved and
   * not just a disabled input. `seo.path` is the one that matters most on a
   * page — the sitemap is built from it.
   */
  let current: PageRow | null;
  try {
    current = await readPage(slug);
  } catch (error) {
    return { message: (error as Error).message };
  }
  if (!current) {
    return { message: "That page is missing from the database." };
  }

  /**
   * Rebuild the document against the schema's own shape before validating it.
   * This drops any key the schema does not declare and takes fixed values —
   * the page's `slug` above all — from the server rather than the request.
   */
  const tree = buildFieldTree(pageSchemas[slug], locksForPage(slug));
  const coerced = coerceToTree(submitted, tree, current.data);

  const parsed = pageSchemas[slug].safeParse(coerced);
  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error.issues),
      message: "Some fields need attention before this can be saved.",
    };
  }

  const next = parsed.data;

  // A save that changes nothing should not add a version. Otherwise the history
  // fills with identical entries and stops being useful for finding the edit
  // someone actually wants back.
  if (deepEqual(current.data, next)) {
    return { ok: true, unchanged: true, data: next, savedAt: new Date().toISOString() };
  }

  try {
    // Before the write, so the pre-edit wording is preserved even on a first edit.
    await ensureBaseline({
      entity: "page",
      entityId: slug,
      data: current.data,
      adminId: admin.id,
    });
  } catch (error) {
    // Refuse the save rather than perform one that cannot be undone.
    return { message: (error as Error).message };
  }

  const { error: writeError } = await getServiceClient()
    .from("pages")
    .update({ data: next, updated_by: admin.id })
    .eq("slug", slug);

  if (writeError) {
    return { message: `The page could not be saved: ${writeError.message}` };
  }

  const savedAt = new Date().toISOString();

  /**
   * History after the write, and non-fatal.
   *
   * These are two statements rather than one transaction, because supabase-js
   * has no multi-statement transaction and a stored procedure for it would be a
   * migration the client has to apply by hand. The ordering is chosen so the
   * failure that can happen is the recoverable one: content saved with a gap in
   * its history, reported as such, rather than history claiming a save that
   * never landed.
   */
  let warning: string | undefined;
  try {
    await recordRevision({
      entity: "page",
      entityId: slug,
      data: next,
      adminId: admin.id,
      note: "Edited",
    });
  } catch {
    warning =
      "Saved and live — but this version could not be added to the history, " +
      "so it cannot be rolled back to later.";
  }

  publish(slug);

  return { ok: true, savedAt, data: next, ...(warning ? { warning } : {}) };
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface RestoreState {
  message?: string;
}

/**
 * Puts a previous version back.
 *
 * Restoring is a normal save of an old value: the version being replaced stays
 * in the history, and the restored one is added on top. Nothing is removed, so
 * restoring the wrong version costs one more click rather than the text.
 */
export async function restorePageRevision(
  _previous: RestoreState,
  formData: FormData
): Promise<RestoreState> {
  const admin = await requireAdmin();

  const slug = formData.get("slug");
  if (!isPageSlug(slug)) return { message: "That page does not exist." };

  const revisionId = Number(formData.get("revisionId"));
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    return { message: "That version does not exist." };
  }

  // Scoped to this page in the query itself, so a version belonging to another
  // page cannot be restored onto this one by passing its number.
  const revision = await getRevision(revisionId, "page", slug);
  if (!revision) return { message: "That version does not exist." };

  /**
   * Validate on the way out as well as on the way in. A stored version was
   * valid when it was written, which is not the same as valid now — the schema
   * can gain a required field between then and now, and restoring content that
   * no longer parses would take the page down rather than back.
   */
  const parsed = pageSchemas[slug].safeParse(revision.data);
  if (!parsed.success) {
    return {
      message:
        "That version cannot be restored: it is missing something the page now " +
        "requires. " +
        parsed.error.issues
          .map((i) => `${i.path.map(String).join(".") || "(page)"} — ${humanizeIssue(i)}`)
          .slice(0, 3)
          .join("; "),
    };
  }

  const current = await readPage(slug);
  if (!current) return { message: "That page is missing from the database." };

  if (deepEqual(current.data, parsed.data)) {
    return { message: "That version is already the one showing on the site." };
  }

  await ensureBaseline({
    entity: "page",
    entityId: slug,
    data: current.data,
    adminId: admin.id,
  });

  const { error } = await getServiceClient()
    .from("pages")
    .update({ data: parsed.data, updated_by: admin.id })
    .eq("slug", slug);

  if (error) {
    return { message: `That version could not be restored: ${error.message}` };
  }

  try {
    await recordRevision({
      entity: "page",
      entityId: slug,
      data: parsed.data,
      adminId: admin.id,
      note: `Restored the version saved on ${new Date(revision.createdAt).toLocaleString("en-US")}`,
    });
  } catch {
    // The restore itself succeeded; a missing history row must not read as failure.
  }

  publish(slug);

  // Land on the editor so the restored wording is the first thing seen.
  redirect(`/admin/pages/${slug}?restored=1`);
}
