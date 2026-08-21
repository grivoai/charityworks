import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { safeNext } from "@/lib/admin/next-path";

export const metadata: Metadata = {
  title: "Sign in | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The one page under /admin that does not require a session.
 *
 * There is no sign-up link and no password-reset link, because neither is
 * self-service here: accounts are created by invitation from the Supabase
 * dashboard, and the set of them is two people. A reset link on a page anyone
 * can reach is an email-sending endpoint anyone can reach.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Validated again in the action — this only decides what to put in the
  // field, and a value arriving from a query string is never trusted twice.
  // Shares the one validator with the action and the two-factor screen, so
  // there is no copy of the rule that can drift into being the lenient one.
  const target = safeNext(next);

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <span className="admin-logo">
          Charity<span>Works</span>
        </span>
        <p className="admin-login-lede">Sign in to manage the site.</p>

        <LoginForm next={target} />

        <p className="admin-note">
          Accounts are created by invitation. If you cannot get in, ask whoever
          set up the site rather than trying again.
        </p>
      </div>
    </div>
  );
}
