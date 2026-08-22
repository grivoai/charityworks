import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { customPageSchema } from "@/content/schema";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { getAuctionCategories, getPage, getSite } from "@/lib/content";
import { PageBlocks } from "@/components/PageBlocks";
import { SiteChrome } from "@/components/SiteChrome";

/**
 * A custom page as the site would render it, including while it is a draft.
 *
 * THE REASON THIS ROUTE EXISTS: the public route at app/(site)/[slug] serves
 * published pages only, so pointing the preview column at `/<slug>` would show
 * a 404 for exactly the page somebody is in the middle of building. A preview
 * that only works after publishing is a preview of something already decided.
 *
 * It lives under /admin rather than taking a `?preview=` parameter on the
 * public route, because that route is statically prerendered and must stay
 * that way — reading a session cookie there would make every page on the site
 * dynamic to serve two people. Here the cookie is already being read, the
 * middleware already guards the path, and `requireAdmin` is the same gate as
 * every other admin screen.
 *
 * It renders the same markup as the public route rather than an approximation:
 * `SiteChrome` for the nav and footer, and `PageBlocks` for the body. A
 * preview built from different components is a preview of the preview.
 */

export const metadata: Metadata = {
  title: "Preview | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function CustomPagePreviewRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  // Straight from the table, published or not — the whole point of this route.
  const { data, error } = await getServiceClient()
    .from("custom_pages")
    .select("data")
    .eq("slug", slug)
    .maybeSingle<{ data: unknown }>();

  if (error) throw new Error(`[admin] could not read the page: ${error.message}`);
  if (!data) notFound();

  const parsed = customPageSchema.safeParse(data.data);
  // A page whose stored shape has drifted is a 404 here for the same reason it
  // is one on the public route: the editor is where that gets diagnosed, and it
  // reads the row itself rather than through this.
  if (!parsed.success) notFound();
  const page = parsed.data;

  const [{ form }, site, categories] = await Promise.all([
    getPage("contact"),
    getSite(),
    getAuctionCategories(),
  ]);

  return (
    <SiteChrome>
      <header className="page-hero center">
        <div className="wrap">
          <h1>{page.title}</h1>
          {page.intro && <p className="lede">{page.intro}</p>}
        </div>
      </header>

      <PageBlocks
        blocks={page.blocks}
        form={form}
        booking={site.booking}
        categories={categories}
      />
    </SiteChrome>
  );
}
