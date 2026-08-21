"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  retryAllFailed,
  retryDelivery,
  type RetryState,
} from "@/lib/admin/enquiry-actions";

function Button({ label, busy, className }: { label: string; busy: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

/**
 * "Send them all" on the undelivered banner.
 *
 * The banner used to state a number and stop there. Whatever it says next has
 * to keep the reassurance it already carried — the enquiry itself is never at
 * risk, only the follow-up — so the failure wording says the details are still
 * here rather than implying something was lost.
 */
export function RetryAll({ count }: { count: number }) {
  const [state, formAction] = useActionState<RetryState, FormData>(
    retryAllFailed,
    {}
  );

  return (
    <div
      className={`admin-banner admin-banner-row is-${state.tone ?? "warn"}`}
      role="status"
    >
      <span>
        {state.message ??
          `${count} enquir${count === 1 ? "y has" : "ies have"} not been passed on. ` +
            "They are all here — the details below are complete."}
      </span>
      {!state.ok && (
        <form action={formAction} className="admin-banner-action">
          <Button
            label={count === 1 ? "Try sending it again" : "Try sending them all again"}
            busy="Sending…"
            className="admin-btn is-small"
          />
        </form>
      )}
    </div>
  );
}

/** "Try again" on one enquiry. */
export function RetryOne({ leadId }: { leadId: string }) {
  const [state, formAction] = useActionState<RetryState, FormData>(
    retryDelivery,
    {}
  );

  if (state.ok) {
    return <span className="admin-chip is-good">{state.message}</span>;
  }

  return (
    <form action={formAction} className="admin-retry">
      <input type="hidden" name="leadId" value={leadId} />
      <Button label="Try again" busy="Sending…" className="admin-btn is-small" />
      {state.message && (
        <span className="admin-retry-note" role="alert">
          {state.message}
        </span>
      )}
    </form>
  );
}
