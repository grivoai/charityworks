"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitChallenge, type MfaFormState } from "@/lib/admin/mfa-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-submit" disabled={pending}>
      {pending ? "Checking…" : "Continue"}
    </button>
  );
}

/**
 * The code screen between a correct password and the panel.
 *
 * Deliberately offers no way past itself. There is no "skip", no "remember this
 * device" and no fallback to email — the account has a second factor or it does
 * not, and the way out when the phone is gone is the break-glass script
 * (`npm run mfa -- reset <email> --yes`), which is run by someone with the
 * service role key rather than by whoever is sitting at this form.
 */
export function MfaChallenge({ next }: { next: string }) {
  const [state, formAction] = useActionState<MfaFormState, FormData>(
    submitChallenge,
    {}
  );

  return (
    <form action={formAction} noValidate>
      {state.message && (
        <p className="admin-error" role="alert">
          {state.message}
        </p>
      )}

      <input type="hidden" name="next" value={next} />

      <div className="admin-field">
        <label htmlFor="code">Six-digit code</label>
        <input
          id="code"
          name="code"
          className="admin-code"
          inputMode="numeric"
          /* The browser and iOS both offer the code from the authenticator app
             on this token, which is most of what makes the screen bearable. */
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          required
          autoFocus
        />
      </div>

      <Submit />
    </form>
  );
}
