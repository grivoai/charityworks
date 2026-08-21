import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { MfaEnroll } from "@/components/admin/MfaEnroll";
import { requireAdmin } from "@/lib/auth";
import { getMfaState, listAdminMfaStatus } from "@/lib/mfa";
import { formatWhen } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Security | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Two-factor authentication for this account.
 *
 * `requireAdmin()` guards it, which means reaching this page already required a
 * code from anyone who has one set up — so the "Turn off" button below can only
 * be pressed by someone holding the device it would turn off.
 *
 * Enrolment is opt-in. Nothing here forces it, and an account without a factor
 * signs in exactly as it did before; the enforcement in `requireAdmin()` only
 * applies to accounts that have actually enrolled. Making it mandatory later is
 * a one-line change in `mfaChallengePending()`.
 */
export default async function SecurityRoute() {
  const admin = await requireAdmin();
  const [mfa, others] = await Promise.all([
    getMfaState(),
    // Owners get to see whether their colleagues have this on, because that is
    // the fact the "should we require it for everyone?" decision turns on.
    admin.role === "owner" ? listAdminMfaStatus(admin.id) : Promise.resolve([]),
  ]);

  const factor = mfa.factors[0] ?? null;

  return (
    <AdminShell admin={admin}>

      <div className="admin-head">
        <h1>Security</h1>
        <p>
          Two-factor authentication asks for a six-digit code from your phone as
          well as your password, so a stolen password is not enough on its own to
          reach this panel.
        </p>
      </div>

      <section className="admin-panel">
        <h2 className="admin-panel-title">Your authenticator app</h2>
        <MfaEnroll
          enrolled={mfa.enrolled}
          factorId={factor?.id ?? null}
          addedLabel={factor?.createdAt ? formatWhen(factor.createdAt) : null}
        />
      </section>

      {admin.role === "owner" && others.length > 0 && (
        <section className="admin-panel">
          <h2 className="admin-panel-title">Other people with access</h2>
          <p className="admin-help">
            Whether each account has two-factor switched on. You cannot set it up
            for someone else — the code comes from their phone — but this is what
            to check before deciding to require it for everyone.
          </p>
          <ul className="admin-rows is-plain">
            {others.map((person) => (
              <li key={person.id} className="admin-row is-static">
                <span className="admin-row-main">
                  <span className="admin-row-title">
                    {person.name ?? person.email}
                  </span>
                  <span className="admin-row-sub">
                    {person.email} · {person.role}
                  </span>
                </span>
                <span
                  className={`admin-chip is-${person.enrolled ? "good" : "warn"}`}
                >
                  {person.enrolled ? "Two-factor on" : "Password only"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="admin-note" style={{ textAlign: "left" }}>
        <strong>If you lose your phone.</strong> There is no recovery code and no
        reset email — both would be a way around the thing this switches on.
        Whoever set up the site can clear it from a terminal with{" "}
        <code>npm run mfa -- reset {admin.email} --yes</code>, which drops the
        account back to password-only so you can sign in and set it up again on a
        new device.
      </p>
    </AdminShell>
  );
}
