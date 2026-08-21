"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import {
  beginEnrollment,
  cancelEnrollment,
  confirmEnrollment,
  removeFactor,
  type EnrollStart,
  type MfaFormState,
} from "@/lib/admin/mfa-actions";

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-btn is-primary" disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

/**
 * Setting up, and turning off, an authenticator app.
 *
 * Three states rather than three routes. Enrolment is a short flow whose middle
 * step holds a secret that must not survive a page load it did not ask for —
 * putting the QR on its own URL would mean a refresh either re-enrolling or
 * showing a dead screen. Keeping it in component state means backing out is
 * always possible and always tidies up after itself.
 */
export function MfaEnroll({
  enrolled,
  factorId,
  addedLabel,
}: {
  enrolled: boolean;
  /** The verified factor, when there is one — what "Turn off" acts on. */
  factorId: string | null;
  addedLabel: string | null;
}) {
  const [start, setStart] = useState<EnrollStart | null>(null);
  const [starting, startTransition] = useTransition();
  const [showSecret, setShowSecret] = useState(false);

  const [confirmState, confirmAction] = useActionState<MfaFormState, FormData>(
    confirmEnrollment,
    {}
  );
  const [removeState, removeAction] = useActionState<MfaFormState, FormData>(
    removeFactor,
    {}
  );
  const [, cancelAction] = useActionState<MfaFormState, FormData>(
    cancelEnrollment,
    {}
  );

  /* ---- Already on ---- */
  if (enrolled) {
    return (
      <div className="admin-mfa">
        <p className="admin-banner is-good">
          Two-factor authentication is on. Signing in asks for a code from your
          authenticator app{addedLabel ? ` — set up ${addedLabel}` : ""}.
        </p>

        {removeState.message && (
          <p className="admin-banner is-bad" role="alert">
            {removeState.message}
          </p>
        )}

        <p className="admin-help">
          Turning this off means a password is all anyone needs to get into the
          panel. If you are switching to a new phone, turn it off here and set it
          up again on the new device.
        </p>

        <form action={removeAction}>
          <input type="hidden" name="factorId" value={factorId ?? ""} />
          <button type="submit" className="admin-btn is-danger">
            Turn off two-factor authentication
          </button>
        </form>
      </div>
    );
  }

  /* ---- Not started ---- */
  if (!start?.qrCode) {
    return (
      <div className="admin-mfa">
        {start?.message && (
          <p className="admin-banner is-bad" role="alert">
            {start.message}
          </p>
        )}

        <p className="admin-help">
          You will need an authenticator app on your phone — Google
          Authenticator, Authy, 1Password and iOS Passwords all work. Setting
          this up takes about a minute.
        </p>

        <button
          type="button"
          className="admin-btn is-primary"
          disabled={starting}
          onClick={() =>
            startTransition(async () => setStart(await beginEnrollment()))
          }
        >
          {starting ? "Preparing…" : "Set up two-factor authentication"}
        </button>
      </div>
    );
  }

  /* ---- Scan and confirm ---- */
  return (
    <div className="admin-mfa">
      <ol className="admin-steps">
        <li>Open your authenticator app and choose to add an account.</li>
        <li>Scan this code.</li>
        <li>Type the six digits it shows, to prove it worked.</li>
      </ol>

      <div className="admin-qr">
        {/* Supabase returns the QR as an SVG data URL. `unoptimized` because
            there is nothing to optimise — it is already inline, and running it
            through the image pipeline would upload a secret to a cache. */}
        <Image
          src={start.qrCode}
          alt="QR code for setting up two-factor authentication"
          width={200}
          height={200}
          unoptimized
        />
      </div>

      <p className="admin-help">
        Cannot scan it?{" "}
        <button
          type="button"
          className="admin-linkbtn"
          onClick={() => setShowSecret((open) => !open)}
        >
          {showSecret ? "Hide the setup key" : "Show a setup key to type instead"}
        </button>
      </p>

      {showSecret && (
        <p className="admin-secret">
          <code>{start.secret}</code>
        </p>
      )}

      {confirmState.message && (
        <p className="admin-banner is-bad" role="alert">
          {confirmState.message}
        </p>
      )}

      <form action={confirmAction} className="admin-code-form">
        <input type="hidden" name="factorId" value={start.factorId ?? ""} />
        <div className="admin-field">
          <label htmlFor="enroll-code">Six-digit code</label>
          <input
            id="enroll-code"
            name="code"
            className="admin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            required
            autoFocus
          />
        </div>
        <Submit label="Turn on two-factor authentication" busy="Checking…" />
      </form>

      <form action={cancelAction}>
        <input type="hidden" name="factorId" value={start.factorId ?? ""} />
        <button
          type="submit"
          className="admin-linkbtn"
          onClick={() => setStart(null)}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
