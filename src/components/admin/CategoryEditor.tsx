"use client";

import {
  saveCategory,
  type CategorySaveState,
} from "@/lib/admin/catalog-actions";
import type { ObjectNode } from "@/lib/admin/field-node";
import { DocumentEditor } from "@/components/admin/DocumentEditor";

/**
 * The catalog editor: the same document editor pointed at `saveCategory`.
 *
 * The one thing it says differently is what happened to removed lots. "Saved"
 * would be true but incomplete — a lot taken out of the form is retired rather
 * than deleted, and the client should be told that in the same breath, not
 * discover it later when an old enquiry link still resolves.
 */
export function CategoryEditor({
  slug,
  tree,
  initial,
  historyCount,
  updatedLabel,
  restored,
}: {
  slug: string;
  tree: ObjectNode;
  initial: Record<string, unknown>;
  historyCount: number;
  updatedLabel: string;
  restored: boolean;
}) {
  return (
    <DocumentEditor
      action={saveCategory}
      identity={{ slug }}
      tree={tree}
      initial={initial}
      historyHref={`/admin/catalog/${slug}/history`}
      historyCount={historyCount}
      updatedLabel={updatedLabel}
      restored={restored}
      extraMessage={(state) =>
        state.archived
          ? `Saved. ${state.archived} ${
              state.archived === 1 ? "lot is" : "lots are"
            } off the site — kept, so old enquiry links still work.`
          : undefined
      }
    />
  );
}
