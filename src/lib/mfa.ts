import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase";

/**
 * Two-factor authentication state, read safely.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS INSTEAD OF ONE CALL TO getAuthenticatorAssuranceLevel()
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The documented way to ask "does this user still owe me a code?" is
 * `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. Called with no
 * argument — the form every example uses — it does this (auth-js,
 * GoTrueClient._getAuthenticatorAssuranceLevel, the branch taken when `jwt` is
 * undefined):
 *
 *     const { data: { session } } = await this.getSession();
 *     const verifiedFactors = session.user.factors?.filter(
 *       (factor) => factor.status === 'verified') ?? [];
 *     if (verifiedFactors.length > 0) { nextLevel = 'aal2'; }
 *
 * It reads the factor list out of `getSession()` — the session cookie, which
 * arrives from the network and is attacker-controlled until proven otherwise.
 * This is the exact distinction lib/auth.ts already warns about for getUser()
 * vs getSession(), and here it is load-bearing rather than academic:
 *
 *   Someone who knows the password but does NOT have the phone signs in for
 *   real. They get a genuine, correctly-signed aal1 access token. They then
 *   edit their own session cookie, leaving `access_token` untouched and
 *   emptying the `user.factors` array beside it. `getUser()` still succeeds,
 *   because the token itself was not altered and Supabase verifies it happily.
 *   But the AAL helper reads the doctored copy, sees no factors, concludes no
 *   second factor is enrolled, and lets them straight in.
 *
 * That is a complete bypass of the control, performed with a text editor, by
 * precisely the attacker 2FA exists to stop.
 *
 * So both halves of the answer are taken from a server-verified source:
 *
 *   FACTORS — from `getUser(token)`, which sends the token to Supabase and
 *   returns the user as the DATABASE has them, cookie contents irrelevant.
 *
 *   CURRENT LEVEL — from the `aal` claim of that same token, decoded only
 *   after getUser() has proven the token authentic. A forged token cannot
 *   reach the decode, because getUser() rejects it first.
 *
 * The token is passed to getUser() explicitly rather than relying on the
 * no-argument form, so the thing being verified and the thing being decoded
 * are visibly the same string.
 */

export type AssuranceLevel = "aal1" | "aal2";

export interface MfaFactor {
  id: string;
  friendlyName: string | null;
  createdAt: string | null;
}

export interface MfaState {
  /** Verified TOTP factors. Only these are ever enforced. */
  factors: MfaFactor[];
  /** True when at least one factor is verified. */
  enrolled: boolean;
  /** The assurance level of the session as it stands. */
  currentLevel: AssuranceLevel | null;
  /**
   * Enrolled, but this session has not presented a code yet — the state that
   * must block access to the panel.
   */
  challengePending: boolean;
  /**
   * Factors that were started and never confirmed. Not enforced, and cleaned
   * up before a new enrolment so a half-finished attempt cannot collide with
   * the next one on Supabase's unique friendly-name constraint.
   */
  danglingFactorIds: string[];
}

const SIGNED_OUT: MfaState = {
  factors: [],
  enrolled: false,
  currentLevel: null,
  challengePending: false,
  danglingFactorIds: [],
};

/**
 * The `aal` claim, from a token whose authenticity the caller has ALREADY
 * established. This does not verify anything and must never be the only thing
 * standing between a request and the panel — see the header note.
 */
function assuranceOf(accessToken: string): AssuranceLevel | null {
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    const claim = (JSON.parse(json) as { aal?: unknown }).aal;
    return claim === "aal2" || claim === "aal1" ? claim : null;
  } catch {
    // A token that will not decode is one getUser() should already have
    // rejected. Returning null lands on "not aal2", which fails closed.
    return null;
  }
}

/** The signed-in user's two-factor state. Never throws; signed out reads as empty. */
export async function getMfaState(): Promise<MfaState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return SIGNED_OUT;

  // The verification step. Everything below this line is derived from the
  // response, or from the token this call just proved genuine.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) return SIGNED_OUT;

  const all = user.factors ?? [];
  const verified = all.filter(
    (factor) => factor.status === "verified" && factor.factor_type === "totp"
  );

  const currentLevel = assuranceOf(accessToken);

  return {
    factors: verified.map((factor) => ({
      id: factor.id,
      friendlyName: factor.friendly_name ?? null,
      createdAt: factor.created_at ?? null,
    })),
    enrolled: verified.length > 0,
    currentLevel,
    // Fails closed: an unreadable or absent level is not aal2.
    challengePending: verified.length > 0 && currentLevel !== "aal2",
    danglingFactorIds: all
      .filter((factor) => factor.status !== "verified")
      .map((factor) => factor.id),
  };
}

/**
 * Whether this request still owes a code.
 *
 * The single question `requireAdmin()` asks. Kept as its own function so the
 * policy lives in one place: to make 2FA mandatory rather than opt-in later,
 * this is the line to change — return true when `!state.enrolled` as well, and
 * every admin page starts redirecting people who have not set it up.
 */
export async function mfaChallengePending(): Promise<boolean> {
  const state = await getMfaState();
  return state.challengePending;
}

/* ------------------------------------------------------------------ */
/* Other admins                                                        */
/* ------------------------------------------------------------------ */

export interface AdminMfaSummary {
  id: string;
  email: string;
  name: string | null;
  role: string;
  enrolled: boolean;
}

/**
 * Whether each OTHER admin has 2FA switched on.
 *
 * Deliberately a boolean and nothing else. It is enough to answer "can I
 * require this for everyone yet?", which is the decision this exists to
 * support, and it is the least that answers it — no factor ids, no device
 * names, no timestamps. Reading one colleague's security setup should not turn
 * into a console for administering it.
 *
 * Goes through the service client because `auth.admin.mfa.listFactors` needs
 * the service role, and through `admin_users` for the roster so that only
 * people with a grant to this panel appear at all.
 */
export async function listAdminMfaStatus(
  excludeId: string
): Promise<AdminMfaSummary[]> {
  const { data, error } = await getServiceClient()
    .from("admin_users")
    .select("id, email, name, role")
    .neq("id", excludeId)
    .returns<{ id: string; email: string; name: string | null; role: string }[]>();

  if (error) {
    console.error("[mfa] could not list other admins", error);
    return [];
  }

  const supabase = getServiceClient();
  const summaries: AdminMfaSummary[] = [];

  for (const row of data ?? []) {
    const { data: factorData, error: factorError } =
      await supabase.auth.admin.mfa.listFactors({ userId: row.id });

    if (factorError) {
      console.error(`[mfa] could not list factors for ${row.email}`, factorError);
      // Reported as not enrolled would be a lie, and as enrolled would be a
      // different one. Skipping keeps a transient error from being read as a
      // fact about somebody's account.
      continue;
    }

    summaries.push({
      ...row,
      enrolled: (factorData?.factors ?? []).some(
        (factor) => factor.status === "verified"
      ),
    });
  }

  return summaries;
}
