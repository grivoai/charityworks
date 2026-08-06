import "server-only";

import { getServiceClient } from "@/lib/supabase";

/**
 * Version history for edited content.
 *
 * Phase 1 content lived in git, so every change was recoverable and attributable
 * for free. Moving it into a database and handing the client a form takes that
 * away. This is the replacement, and it has to be, because the failure it
 * guards against is not exotic: someone selects a paragraph, pastes over it,
 * saves, and wants it back.
 *
 * The history records STATES, not diffs. Each row is the full content as it
 * stood after one save, so restoring is a write of a value that is already
 * there rather than a replay of anything.
 *
 * Restoring never destroys history — it saves the old value as a new revision.
 * An undo you cannot undo is a second way to lose the text.
 */

export type RevisionEntity = "page" | "site" | "category" | "item";

export interface Revision {
  id: number;
  data: unknown;
  createdAt: string;
  note: string | null;
  authorName: string | null;
  authorEmail: string | null;
}

interface RevisionRow {
  id: number;
  data: unknown;
  created_at: string;
  note: string | null;
  admin_users: { name: string | null; email: string } | null;
}

const SELECT = "id, data, created_at, note, admin_users(name, email)";

function toRevision(row: RevisionRow): Revision {
  return {
    id: row.id,
    data: row.data,
    createdAt: row.created_at,
    note: row.note,
    authorName: row.admin_users?.name ?? null,
    authorEmail: row.admin_users?.email ?? null,
  };
}

/** Newest first. */
export async function listRevisions(
  entity: RevisionEntity,
  entityId: string,
  limit = 30
): Promise<Revision[]> {
  const { data, error } = await getServiceClient()
    .from("content_revisions")
    .select(SELECT)
    .eq("entity", entity)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit)
    .returns<RevisionRow[]>();

  if (error) {
    throw new Error(`[admin] could not read history: ${error.message}`);
  }
  return (data ?? []).map(toRevision);
}

/**
 * One revision, scoped to the entity it is being restored onto.
 *
 * The entity and id are part of the lookup rather than checked afterwards, so a
 * revision belonging to another page cannot be restored onto this one by
 * passing its number.
 */
export async function getRevision(
  id: number,
  entity: RevisionEntity,
  entityId: string
): Promise<Revision | null> {
  const { data, error } = await getServiceClient()
    .from("content_revisions")
    .select(SELECT)
    .eq("id", id)
    .eq("entity", entity)
    .eq("entity_id", entityId)
    .maybeSingle<RevisionRow>();

  if (error) {
    throw new Error(`[admin] could not read that version: ${error.message}`);
  }
  return data ? toRevision(data) : null;
}

export async function countRevisions(
  entity: RevisionEntity,
  entityId: string
): Promise<number> {
  const { count, error } = await getServiceClient()
    .from("content_revisions")
    .select("id", { count: "exact", head: true })
    .eq("entity", entity)
    .eq("entity_id", entityId);

  if (error) {
    throw new Error(`[admin] could not count history: ${error.message}`);
  }
  return count ?? 0;
}

export async function recordRevision(input: {
  entity: RevisionEntity;
  entityId: string;
  data: unknown;
  adminId: string | null;
  note: string;
}): Promise<void> {
  const { error } = await getServiceClient().from("content_revisions").insert({
    entity: input.entity,
    entity_id: input.entityId,
    data: input.data,
    created_by: input.adminId,
    note: input.note,
  });

  if (error) {
    // Loud, and before the content write rather than after: a save whose
    // history silently failed is a save the client cannot undo, and they would
    // not find that out until the moment they needed to.
    throw new Error(`[admin] could not record history: ${error.message}`);
  }
}

/**
 * Records the pre-edit state, once, the first time an entity is changed.
 *
 * Without this the seeded original is the one version that never gets written
 * down: the first save would record only its own result, so "put it back how it
 * was" would reach one edit too few. This makes the bottom of every history the
 * text the site launched with.
 */
export async function ensureBaseline(input: {
  entity: RevisionEntity;
  entityId: string;
  data: unknown;
  adminId: string | null;
}): Promise<void> {
  if ((await countRevisions(input.entity, input.entityId)) > 0) return;

  await recordRevision({
    ...input,
    // Attributed to nobody on purpose: this state predates any edit.
    adminId: null,
    note: "Original wording, before any edits",
  });
}
