import { SiteChrome } from "@/components/SiteChrome";
import { Analytics } from "@/components/Analytics";

/**
 * The public site's chrome.
 *
 * Lives here rather than in the root layout so that `/admin` does not inherit
 * it. `(site)` is a route group and contributes nothing to the URL — every
 * page under it serves the same path it always did.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteChrome>{children}</SiteChrome>
      {/* Here, not in SiteChrome: the admin's custom-page preview renders
          SiteChrome too, and must not count as a visit. Renders nothing
          unless NEXT_PUBLIC_GA_ID is set. */}
      <Analytics />
    </>
  );
}
