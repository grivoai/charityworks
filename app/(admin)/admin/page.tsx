import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * The admin dashboard.
 *
 * Dynamic rather than prerendered, and necessarily so: it reads the session
 * cookie, which makes it per-request by definition. That is the correct
 * trade here and it costs the public site nothing — every public route is
 * still static.
 */
export const dynamic = "force-dynamic";

/** One count, or null if the table cannot be read. */
async function countOf(table: string): Promise<number | null> {
  const { count, error } = await getServiceClient()
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`[admin] could not count ${table}`, error);
    return null;
  }
  return count ?? 0;
}

export default async function AdminDashboard() {
  const admin = await requireAdmin();

  const [pages, categories, lots, submissions, uploads] = await Promise.all([
    countOf("pages"),
    countOf("catalog_categories"),
    countOf("catalog_items"),
    countOf("submissions"),
    countOf("uploads"),
  ]);

  const show = (n: number | null) => (n === null ? "—" : String(n));

  return (
    <AdminShell admin={admin}>
      <div className="admin-head">
        <h1>Site content</h1>
        <p>
          Everything here is live. Saving a change publishes it to the website
          within a few seconds — there is no separate publish step, and every
          save is kept so it can be rolled back.
        </p>
      </div>

      <div className="admin-grid">
        <Link href="/admin/pages" className="admin-card">
          <h2>
            Page text <span className="admin-count">{show(pages)}</span>
          </h2>
          <p>
            Headings, intros and button wording for each of the eight pages.
          </p>
        </Link>

        <div className="admin-card" data-soon="true">
          <h2>
            Auction catalog{" "}
            <span className="admin-count">
              {show(categories)} · {show(lots)}
            </span>
          </h2>
          <p>
            Categories and the lots inside them. Add an item, edit its details,
            or archive one that has sold.
          </p>
        </div>

        <div className="admin-card" data-soon="true">
          <h2>
            Enquiries <span className="admin-count">{show(submissions)}</span>
          </h2>
          <p>
            Everyone who has filled in a form, and whether their details reached
            the follow-up automation.
          </p>
        </div>

        <div className="admin-card" data-soon="true">
          <h2>
            Files <span className="admin-count">{show(uploads)}</span>
          </h2>
          <p>
            Photographs and PDFs. Uploading a document gives you a link that
            keeps working when you replace the file.
          </p>
        </div>

        <div className="admin-card" data-soon="true">
          <h2>
            Contact form <span className="admin-soon">Soon</span>
          </h2>
          <p>
            Reword the fields, add your own, and change what people see after
            they submit.
          </p>
        </div>

        <div className="admin-card" data-soon="true">
          <h2>
            Site details <span className="admin-soon">Soon</span>
          </h2>
          <p>
            Phone number, email addresses, navigation and the booking link.
          </p>
        </div>
      </div>

      <p className="admin-note" style={{ textAlign: "left", marginTop: "28px" }}>
        The counts above come from the live database, so this page working at
        all confirms the connection. Editing arrives section by section — page
        text first, then the catalog, where the waiting work is.
      </p>
    </AdminShell>
  );
}
