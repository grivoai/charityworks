"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { savePage, type SaveState } from "@/lib/admin/page-actions";
import { stableStringify } from "@/lib/admin/coerce";
import type { ObjectNode } from "@/lib/admin/field-node";
import { SchemaFields } from "@/components/admin/SchemaFields";

/**
 * The editing frame around a page's fields: what changed, saving it, and what
 * happened.
 *
 * The whole document is held in one piece of state and submitted as one JSON
 * field. That is what makes "have I changed anything?" a comparison rather than
 * a guess, and it is what lets the save bar be honest — an editor that says
 * "Saved" when nothing was sent, or stays quiet when something failed, teaches
 * the client not to trust it.
 */

function SaveBar({
  dirty,
  status,
  tone,
  onReset,
}: {
  dirty: boolean;
  status: string;
  tone: "idle" | "good" | "bad" | "busy";
  onReset: () => void;
}) {
  // From the form's own pending state, so it cannot drift from the request
  // that is actually in flight.
  const { pending } = useFormStatus();

  return (
    <div className="admin-savebar">
      <span className={`admin-status is-${pending ? "busy" : tone}`}>
        {pending ? "Saving…" : status}
      </span>

      {dirty && !pending && (
        <button type="button" className="admin-btn admin-btn-quiet" onClick={onReset}>
          Discard changes
        </button>
      )}

      <button type="submit" className="admin-btn admin-btn-primary" disabled={pending || !dirty}>
        {pending ? "Saving…" : "Save and publish"}
      </button>
    </div>
  );
}

export function PageEditor({
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
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  const [baseline, setBaseline] = useState<Record<string, unknown>>(initial);
  const [state, formAction] = useActionState<SaveState, FormData>(savePage, {});

  const appliedSave = useRef<string | undefined>(undefined);

  /**
   * After a save, adopt what was actually stored.
   *
   * The server returns the content as the schema parsed it — trimmed, with
   * cleared optional fields removed — which is not always character-for-character
   * what was typed. Rebasing onto the stored value is what stops the form from
   * reporting unsaved changes immediately after a successful save.
   */
  useEffect(() => {
    if (!state.ok || !state.savedAt || state.savedAt === appliedSave.current) return;
    appliedSave.current = state.savedAt;
    if (state.data && typeof state.data === "object") {
      const stored = state.data as Record<string, unknown>;
      setValue(stored);
      setBaseline(stored);

      /**
       * Tell the preview column, if there is one, that the page it is showing
       * has moved on and should be re-fetched.
       *
       * An event rather than a prop or shared state: the preview is optional
       * and neither column renders the other. Announced only from here — the
       * one place a save is known to have succeeded — so a refused save cannot
       * reload the frame and make it look as though something was published.
       * The stored document travels with it, because the hidden input holding
       * it has not been re-rendered yet at this point.
       */
      window.dispatchEvent(
        new CustomEvent("cw:saved", { detail: JSON.stringify(stored) })
      );
    }
  }, [state]);

  const dirty = useMemo(
    () => stableStringify(value) !== stableStringify(baseline),
    [value, baseline]
  );

  /** Unsaved text should not be lost to a stray back button or closed tab. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = state.errors ?? {};
  const errorCount = Object.keys(errors).length;

  let status = updatedLabel;
  let tone: "idle" | "good" | "bad" | "busy" = "idle";
  if (errorCount > 0) {
    status =
      errorCount === 1
        ? "Not saved — one field needs attention."
        : `Not saved — ${errorCount} fields need attention.`;
    tone = "bad";
  } else if (state.message) {
    status = state.message;
    tone = "bad";
  } else if (dirty) {
    status = "Unsaved changes";
    tone = "idle";
  } else if (state.unchanged) {
    status = "Nothing had changed.";
    tone = "good";
  } else if (state.ok) {
    status = "Saved. This is live on the site.";
    tone = "good";
  }

  return (
    <form action={formAction} className="admin-form">
      <input type="hidden" name="slug" value={slug} />
      {/* The whole document, in one field. See the note above. */}
      <input type="hidden" name="data" value={JSON.stringify(value)} />

      {restored && !state.ok && (
        <p className="admin-banner is-good">
          A previous version has been restored and is now live.
        </p>
      )}

      {state.warning && <p className="admin-banner is-warn">{state.warning}</p>}

      {state.message && errorCount === 0 && (
        <p className="admin-banner is-bad" role="alert">
          {state.message}
        </p>
      )}

      {errorCount > 0 && (
        <p className="admin-banner is-bad" role="alert">
          Nothing was saved. {errorCount === 1 ? "One field needs" : `${errorCount} fields need`}{" "}
          attention — they are marked below.
        </p>
      )}

      <SchemaFields tree={tree} value={value} onChange={setValue} errors={errors} />

      <p className="admin-history-link">
        <Link href={`/admin/pages/${slug}/history`}>
          Version history
          {historyCount > 0 && <span className="admin-count-inline">{historyCount}</span>}
        </Link>
      </p>

      <SaveBar
        dirty={dirty}
        status={status}
        tone={tone}
        onReset={() => setValue(baseline)}
      />
    </form>
  );
}
