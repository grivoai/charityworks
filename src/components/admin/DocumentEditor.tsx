"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { stableStringify } from "@/lib/admin/coerce";
import type { FieldErrors, ObjectNode } from "@/lib/admin/field-node";
import { SchemaFields } from "@/components/admin/SchemaFields";

/**
 * The editing frame around one document: what changed, saving it, and what
 * happened.
 *
 * Extracted from the pages editor when the catalog needed the same thing. The
 * two differ only in which action they call and what a save is allowed to
 * report, so they share this rather than running as two copies that drift —
 * the copy that drifts is always the one nobody re-tested.
 *
 * The whole document is held in one piece of state and submitted as one JSON
 * field. That is what makes "have I changed anything?" a comparison rather than
 * a guess, and it is what lets the save bar be honest: an editor that says
 * "Saved" when nothing was sent, or stays quiet when something failed, teaches
 * the client not to trust it.
 */

/** What every save action reports back. Actions may add fields of their own. */
export interface EditorSaveState {
  ok?: true;
  unchanged?: true;
  savedAt?: string;
  data?: unknown;
  message?: string;
  warning?: string;
  errors?: FieldErrors;
  /**
   * How many lots a catalog save took off the site.
   *
   * Declared here rather than only on the catalog action's own type so both
   * actions stay mutually assignable and this component needs no generics —
   * which `useActionState` does not accept cleanly anyway. Unused by pages.
   */
  archived?: number;
}

function SaveBar({
  dirty,
  status,
  tone,
  onReset,
  saveLabel,
}: {
  dirty: boolean;
  status: string;
  tone: "idle" | "good" | "bad" | "busy";
  onReset: () => void;
  saveLabel: string;
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

      <button
        type="submit"
        className="admin-btn admin-btn-primary"
        disabled={pending || !dirty}
      >
        {pending ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}

export function DocumentEditor({
  action,
  identity,
  tree,
  initial,
  historyHref,
  historyCount,
  updatedLabel,
  restored,
  saveLabel = "Save and publish",
  extraMessage,
}: {
  action: (state: EditorSaveState, formData: FormData) => Promise<EditorSaveState>;
  /** Hidden fields naming what is being edited, e.g. the slug. */
  identity: Record<string, string>;
  tree: ObjectNode;
  initial: Record<string, unknown>;
  historyHref: string;
  historyCount: number;
  updatedLabel: string;
  restored: boolean;
  saveLabel?: string;
  /** Lets an action add a line to a successful save, such as what it retired. */
  extraMessage?: (state: EditorSaveState) => string | undefined;
}) {
  const [value, setValue] = useState<Record<string, unknown>>(initial);
  const [baseline, setBaseline] = useState<Record<string, unknown>>(initial);
  const [state, formAction] = useActionState<EditorSaveState, FormData>(action, {});

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
       * Tell the preview column, if there is one, that what it is showing has
       * moved on and should be re-fetched.
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
    status = extraMessage?.(state) ?? "Saved. This is live on the site.";
    tone = "good";
  }

  return (
    <form action={formAction} className="admin-form">
      {Object.entries(identity).map(([name, val]) => (
        <input key={name} type="hidden" name={name} value={val} />
      ))}
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
        <Link href={historyHref}>
          Version history
          {historyCount > 0 && <span className="admin-count-inline">{historyCount}</span>}
        </Link>
      </p>

      <SaveBar
        dirty={dirty}
        status={status}
        tone={tone}
        saveLabel={saveLabel}
        onReset={() => setValue(baseline)}
      />
    </form>
  );
}
