import Link from "next/link";

import { AdminBack } from "@/components/admin/AdminBack";
import { HelpPanel } from "@/components/admin/HelpPanel";
import { signOut } from "@/lib/auth-actions";
import type { AdminUser } from "@/lib/auth";

/**
 * The signed-in admin frame: top bar, then the page.
 *
 * Takes the admin as a prop rather than calling `requireAdmin()` itself. The
 * page has already had to call it — that is what proves the visitor is allowed
 * to see anything at all — and calling it twice would mean two round trips to
 * verify one session.
 */
export function AdminShell({
  admin,
  children,
  wide = false,
  root = false,
}: {
  admin: AdminUser;
  children: React.ReactNode;
  /**
   * Widens the content column for the page editor's side-by-side preview.
   * A prop rather than a `:has()` selector on the stylesheet, so the layout
   * does not depend on the browser and does not reflow after hydration.
   */
  wide?: boolean;
  /**
   * Set on the dashboard itself, which is where the back link goes — a control
   * that reloads the page you are already on is not navigation.
   *
   * Opt-OUT rather than opt-in, deliberately. The default has to be the safe
   * one: forgetting this prop on a new page costs a redundant link on one
   * screen, where forgetting an opt-in `back` prop would cost a dead end, and
   * a dead end is the thing this component exists to remove.
   */
  root?: boolean;
}) {
  return (
    <>
      <header className="admin-bar">
        <span className="admin-logo">
          Charity<span>Works</span>
        </span>
        <span className="admin-badge">Admin</span>

        {/* In the bar rather than in the page, so it does not scroll away. The
            bar is already sticky; on a long editor the way out used to be
            several screens above wherever the client was working. */}
        {!root && <AdminBack />}

        <span className="admin-bar-spacer" />

        <span className="admin-who">
          {admin.name ?? admin.email}
          {admin.role === "owner" ? " · owner" : ""}
        </span>

        {/* In the bar for the same reason the back link is: help is asked for
            from the middle of a long form, and a panel that has to be scrolled
            to is one that is not opened. Only signed-in screens carry it —
            the sign-in pages render no shell, and a help panel on the
            two-factor challenge would be a place to put a link around it. */}
        <HelpPanel />

        <Link href="/admin/security" className="admin-signout">
          Security
        </Link>

        {/* A form, not a link. Signing out changes state, and a GET that
            changes state can be triggered by anything that prefetches. */}
        <form action={signOut}>
          <button type="submit" className="admin-signout">
            Sign out
          </button>
        </form>
      </header>

      <main className="admin-main">
        <div className={`admin-wrap${wide ? " is-wide" : ""}`}>{children}</div>
      </main>
    </>
  );
}
