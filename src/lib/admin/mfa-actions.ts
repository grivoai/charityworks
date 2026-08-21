"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { getAdmin, requireAdmin } from "@/lib/auth";
import { getMfaState } from "@/lib/mfa";
import { safeNext } from "@/lib/admin/next-path";
import {
  clearFailures,
  isRateLimited,
  recordFailure,
} from "@/lib/auth-throttle";

/**
 * Enrolling, confirming and removing a TOTP factor, and answering the challenge.
 *
 * Every one of these runs on the server against the user's own session client,
 * not a browser client. That is not incidental: `mfa.verify()` returns a NEW
 * session carrying the upgraded `aal2` claim, and the only place in this
 * codebase that can write the session cookie is a server action — Server
 * Components cannot, and the middleware only refreshes what is already there.
 * Verifying anywhere else would leave the browser holding the old aal1 token
 * and the user still locked out one step from where they started.
 */

/** What the authenticator app is called in the user's list. */
const FRIENDLY_NAME = "Authenticator app";

/**
 * TOTP codes are six digits. Checked here so an obvious typo costs nothing:
 * Supabase rate-limits challenge/verify at 15 a minute per IP, and spending one
 * of those on "12345" helps nobody.
 */
const CODE = /^\d{6}$/;

/** Normalises what people actually paste: spaces, dashes, non-breaking spaces. */
function readCode(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.replace(/[\s -]/g, "") : "";
}

async function callerIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* Enrolment                                                           */
/* ------------------------------------------------------------------ */

export interface EnrollStart {
  factorId?: string;
  /** An SVG data URL, ready for an <img src>. */
  qrCode?: string;
  /** The same secret in text, for anyone who cannot scan. */
  secret?: string;
  message?: string;
}

/**
 * Starts an enrolment and returns the QR code.
 *
 * Called from a button rather than on page load, and that is deliberate:
 * `enroll()` creates a factor row as a side effect, and Next prefetches links
 * on hover. A route that enrolled on render would mint a dangling factor every
 * time the client's pointer crossed the link.
 */
export async function beginEnrollment(): Promise<EnrollStart> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const state = await getMfaState();

  if (state.enrolled) {
    return {
      message:
        "This account already has an authenticator app set up. Remove it first " +
        "if you want to use a different device.",
    };
  }

  /**
   * Clear anything left over from an abandoned attempt.
   *
   * Supabase requires a factor's friendly name to be unique per user, so a
   * previous half-finished enrolment holding "Authenticator app" would make
   * every subsequent attempt fail with a name collision — a dead end the user
   * could not clear from the browser. Unverified factors are never enforced at
   * sign-in, so removing them cannot lock anybody out.
   */
  for (const id of state.danglingFactorIds) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      console.error(`[mfa] could not clear stale factor ${id}`, error);
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: FRIENDLY_NAME,
  });

  if (error || !data) {
    console.error(`[mfa] enroll failed for ${admin.email}`, error);
    return {
      message:
        error?.message ??
        "Could not start setting up two-factor authentication. Try again.",
    };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export interface MfaFormState {
  ok?: true;
  message?: string;
}

/**
 * Confirms an enrolment with the first code from the app.
 *
 * On success the factor becomes `verified` and this session is upgraded to
 * aal2 in the same step, so the person who just set it up is not immediately
 * asked to prove it again.
 */
export async function confirmEnrollment(
  _previous: MfaFormState,
  formData: FormData
): Promise<MfaFormState> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const factorId = formData.get("factorId");
  if (typeof factorId !== "string" || !factorId) {
    return { message: "That setup has expired. Start again." };
  }

  const code = readCode(formData.get("code"));
  if (!CODE.test(code)) {
    return { message: "Enter the six digits shown in your authenticator app." };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return {
      message:
        challengeError?.message ?? "Could not check that code. Try again.",
    };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return {
      message:
        "That code was not accepted. Check your phone's clock is correct, wait " +
        "for the next code, and try again.",
    };
  }

  console.info(`[mfa] ${admin.email} enrolled an authenticator app`);
  revalidatePath("/admin/security");
  return { ok: true };
}

/**
 * Abandons an in-progress enrolment.
 *
 * Without this, backing out of the QR screen leaves an unverified factor
 * behind. It would never be enforced, but it would collide with the friendly
 * name on the next attempt, so tidying up here keeps the next try clean.
 */
export async function cancelEnrollment(
  _previous: MfaFormState,
  formData: FormData
): Promise<MfaFormState> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const factorId = formData.get("factorId");
  if (typeof factorId === "string" && factorId) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) console.error("[mfa] could not cancel enrolment", error);
  }

  revalidatePath("/admin/security");
  return { ok: true };
}

/**
 * Turns two-factor off for this account.
 *
 * Supabase only permits this from an aal2 session, which is the right rule and
 * needs nothing from us: someone who has stolen a password but not the phone
 * cannot reach an aal2 session, and therefore cannot remove the factor that is
 * stopping them.
 */
export async function removeFactor(
  _previous: MfaFormState,
  formData: FormData
): Promise<MfaFormState> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const factorId = formData.get("factorId");
  if (typeof factorId !== "string" || !factorId) {
    return { message: "That authenticator app is no longer set up." };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    return {
      message: `Could not turn off two-factor authentication: ${error.message}`,
    };
  }

  console.info(`[mfa] ${admin.email} removed their authenticator app`);
  revalidatePath("/admin/security");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* The challenge at sign-in                                            */
/* ------------------------------------------------------------------ */

/**
 * Answers the challenge after a password sign-in.
 *
 * Throttled on the same buckets as the password form. Supabase's own limit —
 * 15 challenge/verify calls a minute per IP — is the real backstop, but a
 * six-digit code deserves the treatment the password already gets, and the
 * throttle is per-account as well as per-IP.
 *
 * Deliberately does NOT call `requireAdmin()`: that is the function which
 * redirects here, and calling it would loop. `getAdmin()` establishes identity;
 * the code is what this is checking.
 */
export async function submitChallenge(
  _previous: MfaFormState,
  formData: FormData
): Promise<MfaFormState> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const next = safeNext(formData.get("next"));
  const code = readCode(formData.get("code"));

  if (!CODE.test(code)) {
    return { message: "Enter the six digits shown in your authenticator app." };
  }

  const ip = await callerIp();
  if (await isRateLimited(ip, admin.email)) {
    return {
      message: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: factors, error: listError } =
    await supabase.auth.mfa.listFactors();

  if (listError) {
    return { message: "Could not read your security settings. Try again." };
  }

  // `data.totp` is already filtered to verified factors by supabase-js, which
  // is the set that is actually enforced.
  const factor = factors?.totp?.[0];
  if (!factor) {
    // Nothing left to prove — the factor was removed (very likely by the
    // break-glass script) while this tab sat on the challenge screen.
    redirect(next);
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: factor.id });

  if (challengeError || !challenge) {
    await recordFailure(ip, admin.email);
    return {
      message: challengeError?.message ?? "Could not check that code. Try again.",
    };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    await recordFailure(ip, admin.email);
    return {
      message:
        "That code was not accepted. Wait for the next one and try again — " +
        "codes change every 30 seconds.",
    };
  }

  await clearFailures(ip, admin.email);

  // Outside any try/catch: redirect() signals by throwing, and catching it
  // here would swallow the navigation.
  redirect(next);
}
