import type { Metadata } from "next";
import "./admin.css";

/**
 * The admin panel's frame.
 *
 * Deliberately thin: it loads the admin stylesheet and sets the metadata. The
 * top bar is not here because `/admin/login` must not show one, and a layout
 * cannot opt a child out of itself. Signed-in pages wrap themselves in
 * `AdminShell` instead.
 */
export const metadata: Metadata = {
  title: "Admin | CharityWorks",
  /**
   * Unconditional, unlike the public site's, which follows the SITE_NOINDEX
   * flag. That flag exists to be switched off at launch, and the admin panel
   * must not become indexable when it is. robots.txt disallows /admin as well,
   * and it is excluded from the sitemap — but a meta tag is the one that works
   * on a URL somebody links to from elsewhere.
   */
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin">{children}</div>;
}
