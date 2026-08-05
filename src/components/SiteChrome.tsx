import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealObserver } from "@/components/RevealObserver";
import { AnimatedLayout } from "@/components/AnimatedLayout";
import { OrganizationJsonLd } from "@/components/JsonLd";
import { getSite } from "@/lib/content";

/**
 * The public site's shell: nav, footer, and the pieces that go with them.
 *
 * A component rather than only a layout because the 404 needs it too, and an
 * unmatched URL belongs to no route group — Next renders `app/not-found.tsx`
 * against the root layout alone, so it cannot inherit `(site)/layout.tsx`.
 * Both call this, so there is one definition of what the site frame is.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const site = await getSite();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Nav logo={site.logo} links={site.nav} cta={site.navCta} />
      <main id="main">
        <AnimatedLayout>{children}</AnimatedLayout>
      </main>
      <Footer />
      <RevealObserver />
      <OrganizationJsonLd />
    </>
  );
}
