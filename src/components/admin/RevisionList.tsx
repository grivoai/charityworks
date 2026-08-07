"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  restorePageRevision,
  type RestoreState,
} from "@/lib/admin/page-actions";

/**
 * The version history for one page, with a restore button on each entry.
 *
 * The entry matching what is live is marked and has no button — restoring the
 * version you are already looking at is the one action here with no effect, and
 * offering it invites the click that makes someone doubt the whole feature.
 */

export interface RevisionView {
  id: number;
  when: string;
  note: string | null;
  author: string | null;
  /** Top-level sections that differ from what is live. */
  changed: string[];
  isCurrent: boolean;
}

function RestoreButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-btn admin-btn-quiet"
      disabled={pending}
      aria-label={label}
    >
      {pending ? "Restoring…" : "Restore"}
    </button>
  );
}

export function RevisionList({
  slug,
  revisions,
  action = restorePageRevision,
  emptyMessage = "This page has not been edited yet, so there is nothing to go back to. " +
    "The first save will record the wording it had beforehand.",
}: {
  slug: string;
  revisions: RevisionView[];
  /**
   * Which restore to call. Defaults to the page one; the catalog passes its
   * own, because putting a category back means rewriting three tables rather
   * than one column.
   */
  action?: (state: RestoreState, formData: FormData) => Promise<RestoreState>;
  emptyMessage?: string;
}) {
  const [state, formAction] = useActionState<RestoreState, FormData>(action, {});

  if (revisions.length === 0) {
    return <div className="admin-empty">{emptyMessage}</div>;
  }

  return (
    <>
      {state.message && (
        <p className="admin-banner is-bad" role="alert">
          {state.message}
        </p>
      )}

      <ol className="admin-revisions">
        {revisions.map((revision) => (
          <li
            key={revision.id}
            className={`admin-revision${revision.isCurrent ? " is-current" : ""}`}
          >
            <div className="admin-revision-main">
              <span className="admin-revision-when">
                {revision.when}
                {revision.isCurrent && (
                  <span className="admin-chip">Showing on the site</span>
                )}
              </span>
              <span className="admin-revision-sub">
                {revision.note ?? "Edited"}
                {revision.author ? ` · ${revision.author}` : ""}
              </span>
              {!revision.isCurrent && revision.changed.length > 0 && (
                <span className="admin-revision-diff">
                  Differs in: {revision.changed.join(", ")}
                </span>
              )}
            </div>

            {!revision.isCurrent && (
              <form action={formAction}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="revisionId" value={revision.id} />
                <RestoreButton
                  label={`Restore the version from ${revision.when}`}
                />
              </form>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
