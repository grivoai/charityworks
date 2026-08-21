"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { getServiceClient } from "@/lib/supabase";
import { deliver } from "@/lib/lead-delivery";
import { recordDelivery } from "@/lib/submissions";

/**
 * Re-sending an enquiry that never reached the follow-up pipeline.
 *
 * The enquiries page has always been able to say "these N did not get through".
 * It could not do anything about it, which made the warning a dead end: the
 * details were all there on screen, and the only way to act on them was to
 * copy them into an email by hand.
 *
 * Replay is possible because `submissions.raw` holds the exact payload that was
 * posted — the column exists for this, and its comment in the migration says
 * so. Retrying sends that same body through the same `deliver()` the live form
 * uses, so a success here means the real thing would have worked.
 *
 * SAFE TO PRESS TWICE. n8n dedupes on `lead_id`, which travels inside the
 * stored payload, so a lead delivered twice is recognised as the same lead
 * rather than starting a second follow-up. That is what makes an unguarded
 * retry button reasonable at all — without it, a double click would text the
 * enquirer twice.
 */

export interface RetryState {
  ok?: true;
  /** What happened, in a form the page can show. */
  message?: string;
  tone?: "good" | "warn" | "bad";
}

interface Row {
  lead_id: string;
  raw: Record<string, unknown> | null;
  webhook_attempts: number | null;
  webhook_status: string;
}

const SELECT = "lead_id, raw, webhook_attempts, webhook_status";

/** The statuses worth retrying. `sent` is done; `not-configured` needs env vars, not a retry. */
const RETRYABLE = ["failed", "pending"];

async function send(row: Row): Promise<boolean> {
  if (!row.raw) {
    await recordDelivery(
      row.lead_id,
      "failed",
      "no stored payload to re-send",
      (row.webhook_attempts ?? 0) + 1
    );
    return false;
  }

  const delivery = await deliver(row.raw, { retry: true });
  await recordDelivery(
    row.lead_id,
    delivery.result,
    delivery.detail,
    (row.webhook_attempts ?? 0) + 1
  );
  return delivery.result === "sent";
}

/** Re-sends one enquiry. */
export async function retryDelivery(
  _previous: RetryState,
  formData: FormData
): Promise<RetryState> {
  await requireAdmin();

  const leadId = formData.get("leadId");
  if (typeof leadId !== "string" || !leadId) {
    return { message: "That enquiry could not be found.", tone: "bad" };
  }

  const { data, error } = await getServiceClient()
    .from("submissions")
    .select(SELECT)
    .eq("lead_id", leadId)
    .maybeSingle<Row>();

  if (error || !data) {
    return { message: "That enquiry could not be read.", tone: "bad" };
  }

  const sent = await send(data);
  revalidatePath("/admin/enquiries");

  return sent
    ? { ok: true, message: "Sent. This enquiry is now in the pipeline.", tone: "good" }
    : {
        message:
          "Still not getting through. The enquiry is safe here — check the " +
          "pipeline is running, then try again.",
        tone: "bad",
      };
}

/**
 * Re-sends everything that has not got through.
 *
 * Sequential rather than parallel. This is at most a handful of rows, and
 * firing them at once at an endpoint that has just been failing is a good way
 * to be rate-limited into a second failure — which would then look like the
 * retry itself being broken.
 */
export async function retryAllFailed(
  _previous: RetryState,
  _formData: FormData
): Promise<RetryState> {
  await requireAdmin();

  const { data, error } = await getServiceClient()
    .from("submissions")
    .select(SELECT)
    .in("webhook_status", RETRYABLE)
    .order("submitted_at", { ascending: true })
    .returns<Row[]>();

  if (error) {
    return { message: "Could not read the undelivered enquiries.", tone: "bad" };
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return { ok: true, message: "Nothing left to send.", tone: "good" };
  }

  let sent = 0;
  for (const row of rows) {
    if (await send(row)) sent++;
  }

  revalidatePath("/admin/enquiries");

  if (sent === rows.length) {
    return {
      ok: true,
      message: `All ${sent} sent. Nothing is waiting.`,
      tone: "good",
    };
  }
  if (sent === 0) {
    return {
      message:
        `None of the ${rows.length} got through. The enquiries are safe here — ` +
        "check the pipeline is running, then try again.",
      tone: "bad",
    };
  }
  return {
    message: `${sent} of ${rows.length} sent. The rest are still waiting.`,
    tone: "warn",
  };
}
