"use server";

import { revalidatePath, updateTag } from "next/cache";

import { siteContentSchema } from "@/content/schema";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { SITE_TAG } from "@/lib/content-tags";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForSite } from "@/lib/admin/locks";
import { applySiteRules } from "@/lib/admin/site-rules";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import { toFieldErrors } from "@/lib/admin/field-errors";
import { ensureBaseline, getRevision, recordRevision } from "@/lib/admin/revisions";
import {
  readSiteDocument,
  SITE_ENTITY_ID,
  SITE_ROW_ID,
} from "@/lib/admin/site-read";
import type { SaveState } from "@/lib/admin/page-actions";

/**
 * Saving the site settings: brand, navigation, contact details, booking, footer.
 *
 * The last content record without an editor. The table, its revision entity
 * (`content_revisions.entity` already allows `'site'`) and the cache tag were
 * all built for it; only this action and its route were missing, which is what
 * the dashboard's "Site details — Soon" card was standing in for.
 *
 * Mirrors `savePage` deliberately, down to the ordering of the writes: baseline
 * before the update so a first edit is recoverable, history after it and
 * non-fatal so the failure that can happen is "saved but not versioned,
 * reported" rather than "history claims a save that never landed".
 */

/** One JSON document. The site record is a few kilobytes; this is ample. */
const MAX_PAYLOAD_BYTES = 512 * 1024;

/**
 * Everything the site record renders on, which is everything.
 *
 * The navigation, the footer and the contact block are in the layout, so unlike
 * a page edit there is no single path to revalidate. `revalidatePath("/",
 * "layout")` invalidates every route beneath the root layout, which is the
 * honest scope of this change.
 */
function publish(): void {
  updateTag(SITE_TAG);
  revalidatePath("/", "layout");
}

export async function saveSite(
  _previous: SaveState,
  formData: FormData
): Promise<SaveState> {
  const admin = await requireAdmin();

  const raw = formData.get("data");
  if (typeof raw !== "string") {
    return { message: "The form did not submit any content." };
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return { message: "That is too much content for the site settings." };
  }

  let submitted: unknown;
  try {
    submitted = JSON.parse(raw);
  } catch {
    return { message: "The form's content could not be read. Please try again." };
  }

  let current: unknown;
  try {
    current = await readSiteDocument();
  } catch (error) {
    return { message: (error as Error).message };
  }
  if (current === null) {
    return { message: "The site settings are missing from the database." };
  }

  // Rebuilt against the schema's own shape, so unknown keys are dropped and
  // locked values are taken from the stored document rather than the request.
  const tree = buildFieldTree(siteContentSchema, locksForSite());
  const coerced = applySiteRules(coerceToTree(submitted, tree, current));

  const parsed = siteContentSchema.safeParse(coerced);
  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error.issues),
      message: "Some fields need attention before this can be saved.",
    };
  }

  const next = parsed.data;

  if (deepEqual(current, next)) {
    return {
      ok: true,
      unchanged: true,
      data: next,
      savedAt: new Date().toISOString(),
    };
  }

  try {
    await ensureBaseline({
      entity: "site",
      entityId: SITE_ENTITY_ID,
      data: current,
      adminId: admin.id,
    });
  } catch (error) {
    return { message: (error as Error).message };
  }

  const { error: writeError } = await getServiceClient()
    .from("site_settings")
    .update({ data: next, updated_by: admin.id })
    .eq("id", SITE_ROW_ID);

  if (writeError) {
    return { message: `The site settings could not be saved: ${writeError.message}` };
  }

  const savedAt = new Date().toISOString();

  let warning: string | undefined;
  try {
    await recordRevision({
      entity: "site",
      entityId: SITE_ENTITY_ID,
      data: next,
      adminId: admin.id,
      note: "Edited",
    });
  } catch {
    warning =
      "Saved and live — but this version could not be added to the history, " +
      "so it cannot be rolled back to later.";
  }

  publish();

  return { ok: true, savedAt, data: next, ...(warning ? { warning } : {}) };
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface SiteRestoreState {
  message?: string;
}

/**
 * Puts a previous version of the site settings back.
 *
 * Restoring is a save, not a rewind: the current document is baselined and the
 * restore is recorded as its own version, so the history is append-only and
 * undoing a restore is the same operation again. Same shape as
 * `restorePageRevision`.
 */
export async function restoreSiteRevision(
  _previous: SiteRestoreState,
  formData: FormData
): Promise<SiteRestoreState> {
  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { message: "That version does not exist." };

  const revision = await getRevision(id, "site", SITE_ENTITY_ID);
  if (!revision) return { message: "That version does not exist." };

  const parsed = siteContentSchema.safeParse(revision.data);
  if (!parsed.success) {
    return {
      message:
        "That version does not fit the current shape of the site settings, so " +
        "it cannot be restored.",
    };
  }

  let current: unknown;
  try {
    current = await readSiteDocument();
  } catch (error) {
    return { message: (error as Error).message };
  }

  try {
    await ensureBaseline({
      entity: "site",
      entityId: SITE_ENTITY_ID,
      data: current,
      adminId: admin.id,
    });
  } catch (error) {
    return { message: (error as Error).message };
  }

  const { error: writeError } = await getServiceClient()
    .from("site_settings")
    .update({ data: parsed.data, updated_by: admin.id })
    .eq("id", SITE_ROW_ID);

  if (writeError) {
    return { message: `Could not restore: ${writeError.message}` };
  }

  try {
    await recordRevision({
      entity: "site",
      entityId: SITE_ENTITY_ID,
      data: parsed.data,
      adminId: admin.id,
      note: `Restored version ${id}`,
    });
  } catch {
    // The content is back, which is what was asked for. A gap in the history is
    // reported on the next save rather than failing the restore.
  }

  publish();

  return {};
}
