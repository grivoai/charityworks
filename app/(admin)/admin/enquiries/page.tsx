import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/AdminShell";
import { RetryAll, RetryOne } from "@/components/admin/RetryDelivery";
import { requireAdmin } from "@/lib/auth";
import { getPage } from "@/lib/content";
import { isCoreField } from "@/lib/admin/form-write";
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
  /** Answers to questions the client added. Keyed by the field's own name. */
  custom: Record<string, string> | null;
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

  /**
   * The wording of any question the client added, so their answers read as
   * questions rather than as keys.
   *
   * Looked up from the form as it stands now, and deliberately tolerant of not
   * finding a match: a question that has since been reworded or removed still
   * has answers sitting in rows, and those must not disappear from view because
   * their label did. The key is humanised as a fallback.
   */
  const { form } = await getPage("contact");
  const labels = new Map(
    form.fields
      .filter((field) => !isCoreField(field.name))
      .map((field) => [field.name, field.label])
  );
  const askedAs = (key: string) =>
    labels.get(key) ??
    key.replace(/^custom_/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

  const { data, error } = await getServiceClient()
    .from("submissions")
    .select(
      "id, lead_id, submitted_at, name, org, email, phone, event_date, message, " +
        "source, interest_label, interest_category, context_summary, " +
        "webhook_status, webhook_last_error, custom"
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

      <div className="admin-head">
        <h1>Enquiries</h1>
        <p>
          Everyone who has filled in a form on the site, newest first. Click a
          row to see everything they sent; anything that has not reached the
          pipeline is open already, because that is the one thing here that
          needs you. Every enquiry is kept whether or not it was passed on, so
          a delivery problem costs a follow-up rather than the enquiry itself.
        </p>
      </div>

      {error && (
        <p className="admin-banner is-bad" role="alert">
          The enquiries could not be read: {error.message}
        </p>
      )}

      {undelivered > 0 && <RetryAll count={undelivered} />}

      {rows.length === 0 && !error && (
        <div className="admin-empty">
          No enquiries yet. Anything sent through a form on the site appears
          here, along with whether it reached the pipeline.
        </div>
      )}

      <ul className="admin-enquiries">
        {rows.map((row) => {
          const delivery = DELIVERY[row.webhook_status];
          const needsAttention =
            row.webhook_status === "failed" || row.webhook_status === "pending";

          return (
            <li key={row.id} className="admin-enquiry">
              {/* `details`, not a click handler: this page has no client
                  JavaScript at all, and the native element already brings the
                  keyboard behaviour, the expanded state a screen reader
                  announces, and find-in-page opening the row it lands in.
                  Writing that by hand would be several dozen lines that are
                  worse. */}
              <details className="admin-enquiry-fold" open={needsAttention}>
                <summary className="admin-enquiry-head">
                  <span className="admin-enquiry-who">
                    {row.name ?? "Someone"}
                    {row.org ? ` · ${row.org}` : ""}
                  </span>
                  <span className={`admin-chip is-${delivery.tone}`}>
                    {delivery.label}
                  </span>
                  <span
                    className="admin-enquiry-when"
                    title={formatExact(row.submitted_at)}
                  >
                    {formatWhen(row.submitted_at)}
                  </span>
                </summary>

                <div className="admin-enquiry-body">
                  <div className="admin-enquiry-contact">
                    {row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}
                    {row.phone && <a href={`tel:${row.phone}`}>{row.phone}</a>}
                    {row.event_date && <span>Event: {row.event_date}</span>}
                  </div>

                  {row.message && <p className="admin-enquiry-message">{row.message}</p>}

                  {row.custom &&
                    Object.entries(row.custom).filter(([, v]) => v !== "").length > 0 && (
                      <dl className="admin-enquiry-custom">
                        {Object.entries(row.custom)
                          .filter(([, value]) => value !== "")
                          .map(([key, value]) => (
                            <div key={key}>
                              <dt>{askedAs(key)}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                      </dl>
                    )}

                  <p className="admin-enquiry-meta">
                    {SOURCE_LABELS[row.source] ?? row.source}
                    {row.interest_label ? ` · asked about ${row.interest_label}` : ""}
                    {row.interest_category ? ` (${row.interest_category})` : ""}
                  </p>

                  <p className={`admin-enquiry-delivery is-${delivery.tone}`}>
                    {delivery.note}
                    {row.webhook_last_error ? ` — ${row.webhook_last_error}` : ""}
                  </p>

                  {/* Inside the fold rather than beside the chip: a `form` is
                      not valid inside a `summary`, and the summary is a button
                      — a second control nested in it would be reached by the
                      same click that opens the row. */}
                  {needsAttention && <RetryOne leadId={row.lead_id} />}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </AdminShell>
  );
}
