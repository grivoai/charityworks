import "server-only";

import { getServiceClient } from "@/lib/supabase";
import { isDatabaseConfigured } from "@/lib/content-source";

/**
 * Keeping a copy of every enquiry.
 *
 * Until now a lead existed in exactly two places: the n8n workflow, and a
 * `console.info` in Vercel's function logs. That is fine while the webhook is
 * up. It is not fine when it is not — a failed delivery leaves the enquiry in a
 * log line that expires, with no way to see what was lost or to send it again.
 * The `submissions` table was built for this; nothing had been written to it.
 *
 * Two rules, and they are the opposite way round from the rest of the admin.
 *
 * THIS MUST NEVER BREAK A SUBMISSION. Everywhere else a write that cannot be
 * recorded is refused. Here the enquiry belongs to a member of the public who
 * has already pressed the button, so a database problem must not turn their
 * enquiry into an error page or stop it reaching n8n. Every call is wrapped and
 * every failure is logged and swallowed.
 *
 * THE ROW IS WRITTEN BEFORE DELIVERY IS ATTEMPTED. A record written afterwards
 * is a record that does not exist for the one case it was built for: the
 * process dying mid-delivery. Written first, the worst case is a row stuck at
 * `pending`, which is visible and recoverable.
 */

/** The seeded contact form. The tables exist; nothing renders from them yet. */
const CONTACT_FORM_ID = "contact";

export type DeliveryResult = "sent" | "not-configured" | "failed";

export interface LeadRecord {
  leadId: string;
  submittedAt: string;
  [key: string]: unknown;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Files the enquiry, returning whether it was filed.
 *
 * The caller uses the answer only to decide whether updating the delivery
 * status afterwards is worth attempting.
 */
export async function recordSubmission(lead: LeadRecord): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const { error } = await getServiceClient().from("submissions").insert({
      lead_id: lead.leadId,
      form_id: CONTACT_FORM_ID,
      submitted_at: lead.submittedAt,

      name: text(lead.name),
      org: text(lead.org),
      email: text(lead.email),
      phone: text(lead.phone),
      event_date: text(lead.eventDate),
      message: text(lead.message),

      source: String(lead.source ?? "contact-page"),
      source_path: text(lead.sourcePath),
      interest_type: text(lead.interestType),
      interest_id: text(lead.interestId),
      interest_label: text(lead.interestLabel),
      interest_category: text(lead.interestCategory),
      quiz: {
        quizFormat: lead.quizFormat ?? "",
        quizAudience: lead.quizAudience ?? "",
        quizBudget: lead.quizBudget ?? "",
        quizGoal: lead.quizGoal ?? "",
        quizSize: lead.quizSize ?? "",
        quizRecommended: lead.quizRecommended ?? "",
      },
      context_summary: text(lead.contextSummary),

      // Answers to questions the client added, which have no column of their
      // own and are not written to the spreadsheet either. This row is where
      // they live, which is what makes adding a question safe to offer.
      custom:
        lead.custom && typeof lead.custom === "object" ? lead.custom : {},

      webhook_status: "pending",
      // The exact thing posted, which is what makes a replay possible rather
      // than a reconstruction.
      raw: lead,
    });

    if (error) {
      // A duplicate lead id is not a fault: the pipeline dedupes on it, and a
      // double submission reaching here twice should not be logged as an error.
      if (error.code === "23505") return false;
      console.error("[contact] the enquiry could not be filed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[contact] the enquiry could not be filed", error);
    return false;
  }
}

/** Records what happened to the delivery, so a failure is visible and replayable. */
export async function recordDelivery(
  leadId: string,
  result: DeliveryResult,
  detail?: string
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const { error } = await getServiceClient()
      .from("submissions")
      .update({
        webhook_status: result,
        webhook_attempts: 1,
        webhook_last_error: result === "failed" ? (detail ?? "delivery failed") : null,
        webhook_sent_at: result === "sent" ? new Date().toISOString() : null,
      })
      .eq("lead_id", leadId);

    if (error) {
      console.error("[contact] delivery status not recorded", error.message);
    }
  } catch (error) {
    console.error("[contact] delivery status not recorded", error);
  }
}
