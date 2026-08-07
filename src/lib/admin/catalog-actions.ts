"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { $ZodIssue } from "zod/v4/core";

import { auctionItemSchema } from "@/content/schema";
import type { AuctionItem } from "@/content/types";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import type { FieldErrors } from "@/lib/admin/field-node";
import { locksForCategory } from "@/lib/admin/locks";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { CATALOG_TAG } from "@/lib/content-tags";
import {
  CategoryWriteError,
  planCategoryWrite,
  type CategoryWritePlan,
} from "@/lib/admin/catalog-write";
import {
  ensureBaseline,
  getRevision,
  recordRevision,
} from "@/lib/admin/revisions";

/**
 * Saving and restoring a catalog category.
 *
 * The same four steps as a page — prove who is asking, rebuild the shape,
 * validate, then record and write — with one difference that matters: the
 * document is assembled from three tables, so the write is a plan rather than
 * a column update. `catalog-write.ts` works out that plan and refuses the
 * cases that would lose an id; this file performs it.
 */

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

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
    if (!(key in errors)) errors[key] = humanizeIssue(issue);
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/**
 * The category as it stands, read straight from the database.
 *
 * Deliberately not `getAuctionCategory()` from the content layer: that one is
 * wrapped in a tagged cache, and comparing a save against a cached copy is how
 * an edit gets silently dropped. This is the same assembly, uncached.
 */
async function readCategory(slug: string): Promise<AuctionItem | undefined> {
  const categories = await supabaseContentSource.getAuctionCategories();
  return categories.find((category) => category.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Performs a plan.
 *
 * Ordered so the recoverable failure is the one that can happen: archiving
 * first would take lots off the site before their replacements exist, and
 * deleting is never done at all. Each statement is checked — supabase-js has no
 * transaction, so a half-applied write has to be reported rather than assumed
 * away.
 */
async function applyPlan(id: string, plan: CategoryWritePlan): Promise<void> {
  const supabase = getServiceClient();

  const category = await supabase
    .from("catalog_categories")
    .update({ ...plan.category, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (category.error) {
    throw new Error(`the category could not be saved: ${category.error.message}`);
  }

  for (const group of plan.groups) {
    const { error } = await supabase
      .from("catalog_groups")
      .update({ title: group.title, blurb: group.blurb, position: group.position })
      .eq("id", group.id);
    if (error) throw new Error(`a group could not be saved: ${error.message}`);
  }

  /* Upsert: an id already there is updated, a new one inserted. `published`
     is set true so a lot that was archived and then re-added comes back. */
  if (plan.items.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .upsert(
        plan.items.map((item) => ({ ...item, published: true })),
        { onConflict: "id" }
      );
    if (error) throw new Error(`the lots could not be saved: ${error.message}`);
  }

  if (plan.archive.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .update({ published: false })
      .in("id", plan.archive);
    if (error) {
      throw new Error(`a removed lot could not be retired: ${error.message}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export interface CategorySaveState {
  ok?: true;
  unchanged?: true;
  savedAt?: string;
  data?: unknown;
  message?: string;
  warning?: string;
  /** Lots taken off the site by this save, so it can say so plainly. */
  archived?: number;
  errors?: FieldErrors;
}

/** A category with its lots is larger than a page, but not by an order of magnitude. */
const MAX_PAYLOAD_BYTES = 1024 * 1024;

export async function saveCategory(
  _previous: CategorySaveState,
  formData: FormData
): Promise<CategorySaveState> {
  const admin = await requireAdmin();

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) {
    return { message: "That category does not exist." };
  }

  const raw = formData.get("data");
  if (typeof raw !== "string") {
    return { message: "The form did not submit any content." };
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return { message: "That is too much content for one category." };
  }

  let submitted: unknown;
  try {
    submitted = JSON.parse(raw);
  } catch {
    return { message: "The form's content could not be read. Please try again." };
  }

  const tree = buildFieldTree(auctionItemSchema, locksForCategory());
  const coerced = coerceToTree(submitted, tree);

  const parsed = auctionItemSchema.safeParse(coerced);
  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error.issues),
      message: "Some fields need attention before this can be saved.",
    };
  }
  const next = parsed.data as AuctionItem;

  let current: AuctionItem | undefined;
  try {
    current = await readCategory(slug);
  } catch (error) {
    return { message: (error as Error).message };
  }
  if (!current) return { message: "That category is missing from the database." };

  if (deepEqual(current, next)) {
    return { ok: true, unchanged: true, data: next, savedAt: new Date().toISOString() };
  }

  let plan: CategoryWritePlan;
  try {
    plan = planCategoryWrite(next, current);
  } catch (error) {
    if (error instanceof CategoryWriteError) return { message: error.message };
    throw error;
  }

  try {
    await ensureBaseline({
      entity: "category",
      entityId: current.id,
      data: current,
      adminId: admin.id,
    });
  } catch (error) {
    return { message: (error as Error).message };
  }

  try {
    await applyPlan(current.id, plan);
  } catch (error) {
    return { message: (error as Error).message };
  }

  const savedAt = new Date().toISOString();

  let warning: string | undefined;
  try {
    await recordRevision({
      entity: "category",
      entityId: current.id,
      data: next,
      adminId: admin.id,
      note: "Edited",
    });
  } catch {
    warning =
      "Saved and live — but this version could not be added to the history, " +
      "so it cannot be rolled back to later.";
  }

  updateTag(CATALOG_TAG);

  return {
    ok: true,
    savedAt,
    data: next,
    ...(plan.archive.length > 0 ? { archived: plan.archive.length } : {}),
    ...(warning ? { warning } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface CategoryRestoreState {
  message?: string;
}

export async function restoreCategoryRevision(
  _previous: CategoryRestoreState,
  formData: FormData
): Promise<CategoryRestoreState> {
  const admin = await requireAdmin();

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) {
    return { message: "That category does not exist." };
  }

  const revisionId = Number(formData.get("revisionId"));
  if (!Number.isInteger(revisionId) || revisionId <= 0) {
    return { message: "That version does not exist." };
  }

  const current = await readCategory(slug);
  if (!current) return { message: "That category is missing from the database." };

  const revision = await getRevision(revisionId, "category", current.id);
  if (!revision) return { message: "That version does not exist." };

  const parsed = auctionItemSchema.safeParse(revision.data);
  if (!parsed.success) {
    return {
      message:
        "That version cannot be restored: it no longer matches what a category " +
        "requires. " +
        parsed.error.issues
          .map((i) => `${i.path.map(String).join(".") || "(category)"} — ${humanizeIssue(i)}`)
          .slice(0, 3)
          .join("; "),
    };
  }
  const next = parsed.data as AuctionItem;

  if (deepEqual(current, next)) {
    return { message: "That version is already the one showing on the site." };
  }

  let plan: CategoryWritePlan;
  try {
    plan = planCategoryWrite(next, current);
  } catch (error) {
    if (error instanceof CategoryWriteError) {
      return {
        message:
          `That version cannot be restored: ${error.message} ` +
          `Restoring it would have to change the groups, which this does not do.`,
      };
    }
    throw error;
  }

  await ensureBaseline({
    entity: "category",
    entityId: current.id,
    data: current,
    adminId: admin.id,
  });

  try {
    await applyPlan(current.id, plan);
  } catch (error) {
    return { message: (error as Error).message };
  }

  try {
    await recordRevision({
      entity: "category",
      entityId: current.id,
      data: next,
      adminId: admin.id,
      note: `Restored the version saved on ${new Date(revision.createdAt).toLocaleString("en-US")}`,
    });
  } catch {
    // The restore itself succeeded; a missing history row must not read as failure.
  }

  updateTag(CATALOG_TAG);

  redirect(`/admin/catalog/${slug}?restored=1`);
}
