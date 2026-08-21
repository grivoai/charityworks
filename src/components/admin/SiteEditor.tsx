"use client";

import type { ObjectNode } from "@/lib/admin/field-node";
import { DocumentEditor } from "@/components/admin/DocumentEditor";
import { saveSite } from "@/lib/admin/site-actions";

/**
 * The site settings form.
 *
 * As thin as `PageEditor`, and for the same reason: `DocumentEditor` already
 * holds every behaviour a content form needs — dirty tracking, the save state
 * machine, field errors, the history link — and the only things that differ per
 * record are which action to call and what identifies it. There is exactly one
 * site settings row, so unlike a page there is no identity to send: `saveSite`
 * writes `id = 1`, which the table's own `check (id = 1)` guarantees is the
 * only row there is.
 */
export function SiteEditor({
  tree,
  initial,
  historyCount,
  updatedLabel,
  restored,
}: {
  tree: ObjectNode;
  initial: Record<string, unknown>;
  historyCount: number;
  updatedLabel: string;
  restored: boolean;
}) {
  return (
    <DocumentEditor
      action={saveSite}
      identity={{}}
      tree={tree}
      initial={initial}
      historyHref="/admin/site/history"
      historyCount={historyCount}
      updatedLabel={updatedLabel}
      restored={restored}
    />
  );
}
