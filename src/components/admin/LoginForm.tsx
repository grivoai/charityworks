"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type SignInState } from "@/lib/auth-actions";

function SubmitButton() {
  // Read from the form's own pending state rather than a useState flag, so it
  // cannot drift out of sync with the action that is actually in flight.
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} noValidate>
      {state.error && (
        <p className="admin-error" role="alert">
          {state.error}
        </p>
      )}

      <input type="hidden" name="next" value={next} />

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

      <SubmitButton />
    </form>
  );
}
