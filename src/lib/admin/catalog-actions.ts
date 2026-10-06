"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { $ZodIssue } from "zod/v4/core";

import { auctionItemSchema } from "@/content/schema";
import type { AuctionItem } from "@/content/types";
import { requireAdmin } from "@/lib/auth";
import { supabaseContentSource } from "@/lib/content-source-supabase";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import type { FieldErrors } from "@/lib/admin/field-node";
import { locksForCategory } from "@/lib/admin/locks";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { CATALOG_TAG } from "@/lib/content-tags";
import { applyCategoryPlan } from "@/lib/admin/catalog-apply";
import {
  CategoryWriteError,
  planCategoryWrite,
  type CategoryWritePlan,
} from "@/lib/admin/catalog-write";
import { planLotOrder, readSubmittedOrder } from "@/lib/admin/lot-order";
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

  /**
   * Read first: coercion takes a locked field's value from the stored category
   * rather than from the request, so `slug` and `seo.path` cannot be changed by
   * a submission that never went through the disabled input.
   */
  let current: AuctionItem | undefined;
  try {
    current = await readCategory(slug);
  } catch (error) {
    return { message: (error as Error).message };
  }
  if (!current) return { message: "That category is missing from the database." };

  const tree = buildFieldTree(auctionItemSchema, locksForCategory());
  const coerced = coerceToTree(submitted, tree, current);

  const parsed = auctionItemSchema.safeParse(coerced);
  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error.issues),
      message: "Some fields need attention before this can be saved.",
    };
  }
  const next = parsed.data as AuctionItem;

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
    await applyCategoryPlan(current.id, plan);
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
/* Reordering, from the list page                                      */
/* ------------------------------------------------------------------ */

export interface LotOrderState {
  ok?: true;
  unchanged?: true;
  savedAt?: string;
  /** The stored document, for the preview column to re-fetch against. */
  data?: unknown;
  message?: string;
  warning?: string;
}

/**
 * Saves a new order for a category's lots, and nothing else.
 *
 * The form on the edit page can already do this — it saves the category whole,
 * and the order of the lots in it is part of that. This exists because doing it
 * there means scrolling a page tens of thousands of pixels tall to put two
 * lots next to each other, which is not a thing anyone can do with a mouse.
 *
 * What makes it safe to have a second way to write is that it is not a second
 * way to write: the submission is a PERMUTATION, not a document. Every id sent
 * has to be one of the ids already in that section — same ids, same count —
 * and anything else is refused outright rather than reconciled. So this path
 * cannot create a lot, cannot retire one, cannot move one between sections and
 * cannot change a single word of one. It can only answer the question "in what
 * order?", which is the question the page asks.
 *
 * Everything after that is the existing save: `planCategoryWrite` works out the
 * rows (position is the index in the list it is given), `applyCategoryPlan`
 * writes them, and the move is recorded in the version history like any other
 * edit —
 * so a reorder can be rolled back the same way, and so the history does not
 * have a silent hole in it where somebody rearranged the catalog.
 */
export async function saveLotOrder(
  _previous: LotOrderState,
  formData: FormData
): Promise<LotOrderState> {
  const admin = await requireAdmin();

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) {
    return { message: "That category does not exist." };
  }

  const submitted = readSubmittedOrder(formData.get("order"));
  if (!submitted) {
    return {
      message: "The new order could not be read. Please reload the page and try again.",
    };
  }

  let current: AuctionItem | undefined;
  try {
    current = await readCategory(slug);
  } catch (error) {
    return { message: (error as Error).message };
  }
  if (!current) return { message: "That category is missing from the database." };

  /* `in` rather than a destructure: the plan is one shape or the other, and
     pulling the two apart loses which one arrived. */
  const planned = planLotOrder(current, submitted);
  if ("refusal" in planned) return { message: planned.refusal };
  const next = planned.next;

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
    await applyCategoryPlan(current.id, plan);
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
      note: "Reordered the lots",
    });
  } catch {
    warning =
      "Saved and live — but this version could not be added to the history, " +
      "so it cannot be rolled back to later.";
  }

  updateTag(CATALOG_TAG);

  return { ok: true, savedAt, data: next, ...(warning ? { warning } : {}) };
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
    await applyCategoryPlan(current.id, plan);
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

  redirect(`/admin/catalog/${slug}/edit?restored=1`);
}
