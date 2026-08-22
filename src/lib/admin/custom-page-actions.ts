"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { customPageSchema } from "@/content/schema";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { CUSTOM_PAGES_TAG, customPageTag } from "@/lib/content-tags";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { COMMON_LOCKS } from "@/lib/admin/locks";
import { coerceToTree, deepEqual } from "@/lib/admin/coerce";
import { toFieldErrors } from "@/lib/admin/field-errors";
import { ensureBaseline, getRevision, recordRevision } from "@/lib/admin/revisions";
import { checkSlug } from "@/lib/reserved-paths";
import { slugify, uniqueSlug } from "@/lib/admin/slug";
import { templateById, type TemplateBlock } from "@/lib/admin/page-templates";
import type { SaveState } from "@/lib/admin/page-actions";

/**
 * Creating, editing, publishing and deleting the pages a client builds.
 *
 * Mirrors `page-actions.ts` in shape — prove who is asking, read what is about
 * to be overwritten, rebuild against the schema, baseline, write, version,
 * publish — and differs in the two places a client-created page genuinely is
 * different: it has an address that has to be checked against the rest of the
 * site, and it has a lifecycle (draft, published, deleted) that a built-in
 * page does not.
 */

const MAX_PAYLOAD_BYTES = 512 * 1024;

/**
 * The lock set for a custom page.
 *
 * `COMMON_LOCKS` already holds `seo.path` read-only with the right reason — the
 * page's address is set by routing, not typed into a field — and that is
 * exactly as true here, where the path is derived from the slug on every save.
 * `slug` itself is locked because changing it after publication breaks every
 * link already shared; renaming is offered as a separate, deliberate action.
 */
function locksForCustomPage() {
  return [
    ...COMMON_LOCKS,
    {
      pattern: "slug",
      mode: "readonly" as const,
      reason:
        "The page's address. Fixed once the page exists, because anyone who " +
        "already has the link would lose it — use Rename if you need to change it.",
    },
  ];
}

/** Every slug in use, so a new one can avoid them. */
async function takenSlugs(): Promise<Set<string>> {
  const { data } = await getServiceClient()
    .from("custom_pages")
    .select("slug")
    .returns<{ slug: string }[]>();
  return new Set((data ?? []).map((row) => row.slug));
}

function publish(slug: string): void {
  updateTag(customPageTag(slug));
  updateTag(CUSTOM_PAGES_TAG);
  revalidatePath(`/${slug}`);
  // The navigation and the sitemap both list these, and both live above every
  // route, so a page appearing or disappearing is a layout-wide change.
  revalidatePath("/", "layout");
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

/**
 * Gives a template's blocks the ids the schema requires.
 *
 * Ids are minted here rather than written into the template because a template
 * is reused: two pages created from one would otherwise carry identical block
 * ids, and coercion matches a submitted block to its stored self BY ID. Two
 * blocks sharing an id is precisely the case that lets one block's protected
 * values land on another.
 *
 * The same applies one level down, to a questions block's entries and a call
 * to action's button, both of which carry ids of their own.
 */
function withIds(blocks: TemplateBlock[]): unknown[] {
  const mint = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

  return blocks.map((block) => {
    const built: Record<string, unknown> = { ...block, id: mint("block") };
    if (block.type === "questions") {
      built.items = block.items.map((item) => ({ ...item, id: mint("q") }));
    }
    if (block.type === "callToAction") {
      built.cta = { ...block.cta, id: mint("cta") };
    }
    return built;
  });
}

export interface CreateState {
  message?: string;
}

/**
 * Creates a page from a title and nothing else.
 *
 * The address is derived rather than asked for. Making somebody invent a URL
 * before they have written anything is the step that stalls this kind of
 * feature, and the derived answer is nearly always the one they would have
 * typed. It is shown before they commit, and `checkSlug` still guards it —
 * a title of "FAQs" derives `faqs`, which is taken by a real route, and that
 * has to be refused rather than silently numbered into `faqs-2` behind their
 * back.
 *
 * Created as a DRAFT. A page is not reachable until it is published, so the
 * half-finished state everybody starts in is never public.
 */
export async function createCustomPage(
  _previous: CreateState,
  formData: FormData
): Promise<CreateState> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { message: "Give the page a title." };

  const requested = String(formData.get("slug") ?? "").trim();
  const taken = await takenSlugs();
  // An address they typed is used as typed, so a refusal names the thing they
  // chose. Only a derived one is allowed to be numbered.
  const base = requested || slugify(title, "page");
  const slug = requested ? requested : (uniqueSlug(base, taken) ?? base);

  const verdict = checkSlug(slug, taken);
  if (!verdict.ok) return { message: verdict.reason };

  // An unrecognised id falls back to Blank rather than failing: a template is
  // a starting point, and refusing to create the page over one would be a
  // worse answer than starting empty.
  const template = templateById(String(formData.get("template") ?? "") || undefined);

  const document = {
    slug,
    title,
    visibility: "public" as const,
    seo: {
      title,
      description: `${title} — CharityWorks.`,
      targetTerms: [],
      path: `/${slug}`,
    },
    intro: template.intro,
    blocks: withIds(template.blocks),
  };

  const parsed = customPageSchema.safeParse(document);
  if (!parsed.success) {
    return { message: "That page could not be created. Try a different title." };
  }

  const { error } = await getServiceClient().from("custom_pages").insert({
    slug,
    data: parsed.data,
    published: false,
    updated_by: admin.id,
  });

  if (error) {
    // A race with another admin creating the same slug lands here.
    if (error.code === "23505") {
      return { message: "Another page already uses that address." };
    }
    return { message: `The page could not be created: ${error.message}` };
  }

  updateTag(CUSTOM_PAGES_TAG);
  redirect(`/admin/custom-pages/${slug}`);
}

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

export async function saveCustomPage(
  _previous: SaveState,
  formData: FormData
): Promise<SaveState> {
  const admin = await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  if (!slug) return { message: "That page does not exist." };

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

  const { data: row, error: readError } = await getServiceClient()
    .from("custom_pages")
    .select("data")
    .eq("slug", slug)
    .maybeSingle<{ data: unknown }>();

  if (readError) return { message: `Could not read the page: ${readError.message}` };
  if (!row) return { message: "That page no longer exists." };

  const current = row.data;
  const tree = buildFieldTree(customPageSchema, locksForCustomPage());
  const coerced = coerceToTree(submitted, tree, current) as Record<string, unknown>;

  /**
   * The address and the path it implies both come from the server.
   *
   * `slug` is locked so coercion already restored it, and `seo.path` is derived
   * from it here — the same rule the built-in pages state as a lock. Two fields
   * that must agree, where only one is authoritative, is exactly the shape that
   * drifts if it is left to a person to keep in step.
   */
  coerced.slug = slug;
  const seo = coerced.seo as Record<string, unknown> | undefined;
  if (seo) seo.path = `/${slug}`;

  const parsed = customPageSchema.safeParse(coerced);
  if (!parsed.success) {
    return {
      errors: toFieldErrors(parsed.error.issues),
      message: "Some fields need attention before this can be saved.",
    };
  }

  const next = parsed.data;
  if (deepEqual(current, next)) {
    return { ok: true, unchanged: true, data: next, savedAt: new Date().toISOString() };
  }

  try {
    await ensureBaseline({
      entity: "custom-page",
      entityId: slug,
      data: current,
      adminId: admin.id,
    });
  } catch (error) {
    return { message: (error as Error).message };
  }

  const { error: writeError } = await getServiceClient()
    .from("custom_pages")
    .update({ data: next, updated_by: admin.id })
    .eq("slug", slug);

  if (writeError) {
    return { message: `The page could not be saved: ${writeError.message}` };
  }

  const savedAt = new Date().toISOString();

  let warning: string | undefined;
  try {
    await recordRevision({
      entity: "custom-page",
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
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

export interface LifecycleState {
  message?: string;
  ok?: true;
}

/** Publishes or unpublishes. An unpublished page 404s rather than 500s. */
export async function setPublished(
  _previous: LifecycleState,
  formData: FormData
): Promise<LifecycleState> {
  const admin = await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const next = formData.get("published") === "true";
  if (!slug) return { message: "That page does not exist." };

  const { error } = await getServiceClient()
    .from("custom_pages")
    .update({ published: next, updated_by: admin.id })
    .eq("slug", slug);

  if (error) return { message: `Could not change that: ${error.message}` };

  publish(slug);
  return { ok: true };
}

/**
 * Deletes a page.
 *
 * The history is left behind on purpose. `content_revisions` has no foreign key
 * to the page, so the versions survive the row — which means a page deleted by
 * mistake is recoverable by whoever knows to look, and a page deleted on
 * purpose leaves an audit trail rather than a hole.
 */
export async function deleteCustomPage(
  _previous: LifecycleState,
  formData: FormData
): Promise<LifecycleState> {
  await requireAdmin();

  const slug = String(formData.get("slug") ?? "");
  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (!slug) return { message: "That page does not exist." };

  // Typed confirmation rather than a dialog: this is the one action here that
  // cannot be undone from the panel, and a misclick should not be enough.
  if (confirmation !== slug) {
    return { message: `Type “${slug}” to confirm.` };
  }

  const { error } = await getServiceClient()
    .from("custom_pages")
    .delete()
    .eq("slug", slug);

  if (error) return { message: `Could not delete: ${error.message}` };

  publish(slug);
  redirect("/admin/custom-pages");
}

/* ------------------------------------------------------------------ */
/* Restore                                                             */
/* ------------------------------------------------------------------ */

export interface CustomRestoreState {
  message?: string;
}

export async function restoreCustomPageRevision(
  _previous: CustomRestoreState,
  formData: FormData
): Promise<CustomRestoreState> {
  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const slug = String(formData.get("slug") ?? "");
  if (!Number.isFinite(id) || !slug) return { message: "That version does not exist." };

  const revision = await getRevision(id, "custom-page", slug);
  if (!revision) return { message: "That version does not exist." };

  const parsed = customPageSchema.safeParse(revision.data);
  if (!parsed.success) {
    return {
      message:
        "That version does not fit the current shape of a page, so it cannot " +
        "be restored.",
    };
  }

  const { data: row } = await getServiceClient()
    .from("custom_pages")
    .select("data")
    .eq("slug", slug)
    .maybeSingle<{ data: unknown }>();

  if (!row) return { message: "That page no longer exists." };

  try {
    await ensureBaseline({
      entity: "custom-page",
      entityId: slug,
      data: row.data,
      adminId: admin.id,
    });
  } catch (error) {
    return { message: (error as Error).message };
  }

  const { error: writeError } = await getServiceClient()
    .from("custom_pages")
    .update({ data: parsed.data, updated_by: admin.id })
    .eq("slug", slug);

  if (writeError) return { message: `Could not restore: ${writeError.message}` };

  try {
    await recordRevision({
      entity: "custom-page",
      entityId: slug,
      data: parsed.data,
      adminId: admin.id,
      note: `Restored version ${id}`,
    });
  } catch {
    // Content is back, which is what was asked for.
  }

  publish(slug);
  return {};
}
