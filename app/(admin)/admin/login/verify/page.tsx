import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaChallenge } from "@/components/admin/MfaChallenge";
import { getAdmin } from "@/lib/auth";
import { getMfaState } from "@/lib/mfa";
import { safeNext } from "@/lib/admin/next-path";

export const metadata: Metadata = {
  title: "Two-factor code | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * The second step of signing in, for accounts with an authenticator app.
 *
 * Calls `getAdmin()` rather than `requireAdmin()` on purpose: `requireAdmin()`
 * is the function that redirects HERE, so using it would loop. Identity is
 * established; the challenge is what this page exists to collect.
 *
 * Both ways out are handled rather than assumed. No session at all means the
 * password step has not happened, so back to the login form. A session that
 * owes nothing — either no factor is enrolled, or a code has already been
 * accepted in another tab — means this screen has no question to ask, so it
 * sends them on rather than demanding a code for a door that is already open.
 */
export default async function VerifyRoute({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const { next } = await searchParams;
  const target = safeNext(next);

  const mfa = await getMfaState();
  if (!mfa.challengePending) redirect(target);

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <span className="admin-logo">
          Charity<span>Works</span>
        </span>
        <p className="admin-login-lede">
          Open your authenticator app and enter the code for CharityWorks.
        </p>

        <MfaChallenge next={target} />

        <p className="admin-note">
          Signed in as {admin.email}. Codes change every 30 seconds — if one is
          refused, wait for the next. If you have lost the device, whoever set up
          the site can turn two-factor off for this account.
        </p>
      </div>
    </div>
  );
}
