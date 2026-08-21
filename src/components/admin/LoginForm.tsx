"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type SignInState } from "@/lib/auth-actions";
import { hcaptchaSiteKey } from "@/lib/site-config";

function SubmitButton({ ready }: { ready: boolean }) {
  // Read from the form's own pending state rather than a useState flag, so it
  // cannot drift out of sync with the action that is actually in flight.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="admin-submit"
      // Not disabled on `!ready`. If hCaptcha fails to load — blocked script,
      // offline, an ad blocker — a disabled button leaves the only admin on the
      // site staring at a dead form with nothing to click and no message. The
      // action rejects a missing token anyway, so letting the submit through
      // trades a pointless round trip for an explanation.
      disabled={pending}
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});
  const [captchaToken, setCaptchaToken] = useState("");
  const captcha = useRef<HCaptcha>(null);

  /**
   * An hCaptcha token is single use and short lived, and Supabase spends it on
   * the sign-in call. So every time the action comes back — which only happens
   * on failure, since success redirects out of this component — the token in
   * state is already dead. Reset the widget and clear it, otherwise a second
   * attempt submits a spent token and fails on the CAPTCHA rather than on
   * whatever the user actually got wrong, which reads as the form being broken.
   */
  useEffect(() => {
    captcha.current?.resetCaptcha();
    setCaptchaToken("");
  }, [state]);

  return (
    <form action={formAction} noValidate>
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={next} />
      {/* The token travels as form data rather than through a closure, so the
          server action reads it from the same FormData as everything else. */}
      <input type="hidden" name="captchaToken" value={captchaToken} />

      <div className="admin-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
      </div>

      <div className="admin-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="admin-captcha">
        <HCaptcha
          ref={captcha}
          sitekey={hcaptchaSiteKey}
          onVerify={(token) => setCaptchaToken(token)}
          /* Tokens expire after a couple of minutes. Without these the form
             would keep holding a string that hCaptcha has already retired and
             submit it as though it were good. */
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
        />
      </div>

      <SubmitButton ready={captchaToken !== ""} />
    </form>
  );
}
