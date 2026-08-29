import "server-only";

import { getServiceClient } from "@/lib/supabase";

/**
 * Who did what, for the things `content_revisions` cannot answer.
 *
 * The `audit_log` table has existed since the first migration and nothing ever
 * wrote to it — `n_tup_ins` was zero and the sequence had never been called, so
 * this was not a writer that had stopped working, it was one that was never
 * built. A table shaped like an accountability record, with an index on
 * `created_at`, implying a control nobody actually had.
 *
 * WHAT THIS DOES AND DOES NOT COVER. `content_revisions` already versions the
 * *body* of every page, category and site record, with `created_by` and a note,
 * and it is the right tool for that: it stores what the thing looked like, so
 * an edit can be undone. It cannot answer the other question — what happened to
 * a thing that no longer exists, or to something that has no body at all. So
 * this records the actions that leave no snapshot behind:
 *
 *   - deletions (a document link, an upload, a custom page)
 *   - publish and unpublish (no content changes, but the site does)
 *   - second-factor changes (enrolling and, more importantly, removing)
 *
 * Ordinary content edits are deliberately NOT logged here. They already have a
 * full snapshot with an actor attached, and duplicating them would make this
 * table large enough that the rare, interesting entries would be lost in it.
 *
 * IT NEVER THROWS. An audit write failing must not roll back the action it is
 * describing — the deletion already happened, and turning a successful delete
 * into an error message would leave the admin's view disagreeing with the
 * database. A failure is logged to the console and swallowed, which is the same
 * trade `recordSubmission` makes and for the same reason.
 */

/** The verbs worth recording. Narrow on purpose — see the note above. */
export type AuditAction =
  | "document.delete"
  | "document.replace"
  | "upload.delete"
  | "custom-page.delete"
  | "custom-page.publish"
  | "custom-page.unpublish"
  | "mfa.enroll"
  | "mfa.remove";

export interface AuditEntry {
  actorId: string | null;
  action: AuditAction;
  /** The kind of thing acted on, e.g. `"document_links"`, `"custom_pages"`. */
  entity: string;
  /** Its identifier, where it has one. */
  entityId?: string | null;
  /**
   * Anything worth keeping about the change itself.
   *
   * For a deletion this is the place to put what was removed, since the row it
   * described is gone and nothing else will remember it. Keep it small and keep
   * personal data out of it: this table has no retention policy.
   */
  detail?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await getServiceClient().from("audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      diff: entry.detail ?? null,
    });
    if (error) {
      console.error(`[audit] could not record ${entry.action}: ${error.message}`);
    }
  } catch (error) {
    console.error(
      `[audit] could not record ${entry.action}:`,
      error instanceof Error ? error.message : error
    );
  }
}
