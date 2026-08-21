import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { getPage, getSite } from "@/lib/content";
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

/**
 * A count that lives inside a JSON document rather than as table rows.
 *
 * The contact form's questions and the navigation links are arrays inside the
 * `pages` and `site_settings` documents, so `count: "exact"` cannot reach them.
 * Same contract as `countOf`: a number, or null if it could not be read.
 */
async function countIn<T>(
  read: () => Promise<T>,
  pick: (value: T) => unknown[]
): Promise<number | null> {
  try {
    return pick(await read()).length;
  } catch (error) {
    console.error("[admin] could not count a document field", error);
    return null;
  }
}

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

  const [pages, categories, lots, submissions, documents, formFields, navLinks, customPages] =
    await Promise.all([
      countOf("pages"),
      countOf("catalog_categories"),
      countOf("catalog_items"),
      countOf("submissions"),
      // The links, not the uploads: what the card offers is an address to hand
      // out, and superseded files are not that.
      countOf("document_links"),
      countIn(() => getPage("contact"), (page) => page.form.fields),
      countIn(() => getSite(), (site) => site.nav),
      countOf("custom_pages"),
    ]);

  const show = (n: number | null) => (n === null ? "—" : String(n));

  return (
    <AdminShell admin={admin} root>
      <div className="admin-head">
        <h1>Dashboard</h1>
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

        <Link href="/admin/catalog" className="admin-card">
          <h2>
            Auction catalog{" "}
            <span className="admin-count">
              {show(categories)} · {show(lots)}
            </span>
          </h2>
          <p>
            Categories and the lots inside them. Add an item, edit its details,
            or take one off the site when it has sold.
          </p>
        </Link>

        <Link href="/admin/enquiries" className="admin-card">
          <h2>
            Enquiries <span className="admin-count">{show(submissions)}</span>
          </h2>
          <p>
            Everyone who has filled in a form, and whether their details reached
            the follow-up automation.
          </p>
        </Link>

        <Link href="/admin/documents" className="admin-card">
          <h2>
            Documents <span className="admin-count">{show(documents)}</span>
          </h2>
          <p>
            PDFs with a link you can put in an email. Replace the file later and
            the link keeps working.
          </p>
        </Link>

        {/* The contact form is not a section of its own: the form lives in the
            contact page's document, so its questions, wording, submit button
            and success message are edited with the rest of that page. This card
            used to say "Soon" beside a description of three things that already
            worked — it is a shortcut now rather than a promise. */}
        <Link href="/admin/pages/contact" className="admin-card">
          <h2>
            Contact form <span className="admin-count">{show(formFields)}</span>
          </h2>
          <p>
            Reword the questions, add your own, and change what people see after
            they submit. Edited with the contact page.
          </p>
        </Link>

        <Link href="/admin/custom-pages" className="admin-card">
          <h2>
            Your pages <span className="admin-count">{show(customPages)}</span>
          </h2>
          <p>
            Pages you add yourself, built from blocks. Publish them in the menu
            or keep them unlisted for a direct link.
          </p>
        </Link>

        <Link href="/admin/site" className="admin-card">
          <h2>
            Site details <span className="admin-count">{show(navLinks)}</span>
          </h2>
          <p>
            The name in the header, navigation, phone number, email addresses,
            the booking link and the footer. Shown on every page.
          </p>
        </Link>
      </div>

      <p className="admin-note" style={{ textAlign: "left", marginTop: "28px" }}>
        The counts above come from the live database, so this page working at
        all confirms the connection. Everything on the site is editable from
        here — page wording, the catalog, the contact form and the details that
        appear on every page.
      </p>
    </AdminShell>
  );
}
