import Link from "next/link";
import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { formatWhen, formatExact } from "@/lib/admin/page-meta";

export const metadata: Metadata = {
  title: "Enquiries | CharityWorks Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

interface SubmissionRow {
  id: string;
  lead_id: string;
  submitted_at: string;
  name: string | null;
  org: string | null;
  email: string | null;
  phone: string | null;
  event_date: string | null;
  message: string | null;
  source: string;
  interest_label: string | null;
  interest_category: string | null;
  context_summary: string | null;
  webhook_status: "pending" | "sent" | "failed" | "not-configured";
  webhook_last_error: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  "contact-page": "Contact page",
  home: "Home page",
  quiz: "Auction planner",
  "auction-item": "A catalog page",
  auctioneer: "An auctioneer",
};

/**
 * What a delivery state means to the person reading it, rather than what it is
 * called in the column. "failed" on its own invites the wrong conclusion — the
 * enquiry is not lost, it is here; what did not happen is the hand-off.
 */
const DELIVERY: Record<
  SubmissionRow["webhook_status"],
  { label: string; tone: string; note: string }
> = {
  sent: { label: "Passed on", tone: "good", note: "Reached the enquiry pipeline." },
  pending: {
    label: "In progress",
    tone: "warn",
    note: "Filed, but the hand-off has not reported back. Usually momentary.",
  },
  failed: {
    label: "Not passed on",
    tone: "bad",
    note: "The enquiry is safe here, but it did not reach the pipeline — so no text message went out.",
  },
  "not-configured": {
    label: "No pipeline",
    tone: "warn",
    note: "Filed here only, because no delivery webhook is configured.",
  },
};

export default async function EnquiriesRoute() {
  const admin = await requireAdmin();

  const { data, error } = await getServiceClient()
    .from("submissions")
    .select(
      "id, lead_id, submitted_at, name, org, email, phone, event_date, message, " +
        "source, interest_label, interest_category, context_summary, " +
        "webhook_status, webhook_last_error"
    )
    .order("submitted_at", { ascending: false })
    .limit(100)
    .returns<SubmissionRow[]>();

  const rows = data ?? [];
  const undelivered = rows.filter(
    (r) => r.webhook_status === "failed" || r.webhook_status === "pending"
  ).length;

  return (
    <AdminShell admin={admin}>
      <nav className="admin-crumbs">
        <Link href="/admin">Site content</Link>
        <span aria-hidden="true">›</span>
        <span>Enquiries</span>
      </nav>

      <div className="admin-head">
        <h1>Enquiries</h1>
        <p>
          Everyone who has filled in a form on the site, newest first. Every
          enquiry is kept here whether or not it reached the pipeline, so a
          delivery problem costs a follow-up rather than the enquiry itself.
        </p>
      </div>

      {error && (
        <p className="admin-banner is-bad" role="alert">
          The enquiries could not be read: {error.message}
        </p>
      )}

      {undelivered > 0 && (
        <p className="admin-banner is-warn">
          {undelivered} enquir{undelivered === 1 ? "y has" : "ies have"} not been
          passed on. They are all here — the details below are complete.
        </p>
      )}

      {rows.length === 0 && !error && (
        <div className="admin-empty">
          No enquiries yet. Anything sent through a form on the site appears
          here, along with whether it reached the pipeline.
        </div>
      )}

      <ul className="admin-enquiries">
        {rows.map((row) => {
          const delivery = DELIVERY[row.webhook_status];
          return (
            <li key={row.id} className="admin-enquiry">
              <div className="admin-enquiry-head">
                <span className="admin-enquiry-who">
                  {row.name ?? "Someone"}
                  {row.org ? ` · ${row.org}` : ""}
                </span>
                <span className={`admin-chip is-${delivery.tone}`}>{delivery.label}</span>
                <span className="admin-enquiry-when" title={formatExact(row.submitted_at)}>
                  {formatWhen(row.submitted_at)}
                </span>
              </div>

              <div className="admin-enquiry-contact">
                {row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}
                {row.phone && <a href={`tel:${row.phone}`}>{row.phone}</a>}
                {row.event_date && <span>Event: {row.event_date}</span>}
              </div>

              {row.message && <p className="admin-enquiry-message">{row.message}</p>}

              <p className="admin-enquiry-meta">
                {SOURCE_LABELS[row.source] ?? row.source}
                {row.interest_label ? ` · asked about ${row.interest_label}` : ""}
                {row.interest_category ? ` (${row.interest_category})` : ""}
              </p>

              <p className={`admin-enquiry-delivery is-${delivery.tone}`}>
                {delivery.note}
                {row.webhook_last_error ? ` — ${row.webhook_last_error}` : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
