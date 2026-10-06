"use client";

import { useFormStatus } from "react-dom";

/**
 * The bar at the foot of every editing screen: what state the document is in,
 * a way to throw changes away, and the button that publishes.
 *
 * One component, used by the document editor — pages, the site, custom pages
 * and a catalog category — and by the lot list's ordering form. It was two
 * near-identical copies until the pill below had to change shape, which is the
 * kind of change that reaches one copy and not the other.
 *
 * TWO THINGS ABOUT ITS SHAPE ARE LOAD-BEARING, both learned from a client who
 * could not reorder her lots.
 *
 * It does not intercept clicks outside the pill. The bar is sticky, so it
 * floats over whatever is behind it — and the row controls on the lot list sit
 * at the right-hand edge of the column, exactly where a full-width bar put its
 * Save button. Clicking an arrow there did nothing at all, because what the
 * click actually landed on was a disabled Save button, which dispatches no
 * events. The strip is now transparent to the pointer and the pill inside it
 * hugs its contents, so the only thing that takes a click is the thing you can
 * see taking it.
 *
 * The pill does not resize. Its width is fixed rather than fitted, because the
 * status text changes under the cursor — "Unsaved changes" becomes "Saving…"
 * becomes "Saved. This is live on the site." — and Discard disappears the
 * moment the document is clean. Fitted, that moved the Save button 82px
 * sideways between one click and the next. A long message wraps onto another
 * line instead of widening the pill, so the gutter beside it stays clear.
 */
export function SaveBar({
  dirty,
  status,
  tone,
  onReset,
  saveLabel,
  discardLabel = "Discard changes",
}: {
  dirty: boolean;
  status: string;
  tone: "idle" | "good" | "bad" | "busy";
  onReset: () => void;
  saveLabel: string;
  /** Overridden where "changes" would be vaguer than what is actually held. */
  discardLabel?: string;
}) {
  // From the form's own pending state, so it cannot drift from the request
  // that is actually in flight.
  const { pending } = useFormStatus();

  return (
    <div className="admin-savebar">
      <div className="admin-savebar-pill">
        {/* Announced: on the lot list the arrows are the keyboard path through
            the rows, and someone driving them never sees the list move. */}
        <span
          className={`admin-status is-${pending ? "busy" : tone}`}
          role="status"
          aria-live="polite"
        >
          {pending ? "Saving…" : status}
        </span>

        {dirty && !pending && (
          <button type="button" className="admin-btn admin-btn-quiet" onClick={onReset}>
            {discardLabel}
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
    </div>
  );
}
