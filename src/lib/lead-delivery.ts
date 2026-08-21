import "server-only";

/**
 * Posting a lead to the follow-up pipeline.
 *
 * Lifted out of `app/api/contact/route.ts` when the admin gained a retry
 * button. It has to be one function rather than two: a replay that posted a
 * subtly different request — a missing header, a different timeout — would test
 * a path the real submission never takes, and would succeed or fail for reasons
 * that tell you nothing about the original.
 */

export type DeliveryResult = "sent" | "not-configured" | "failed";

export interface Delivery {
  result: DeliveryResult;
  /** Why it failed, recorded against the submission so the admin can see it. */
  detail?: string;
}

/**
 * How long to wait on the webhook before giving up.
 *
 * Two budgets, because the two callers are waiting on different things. For a
 * visitor submitting the form this is a UX number — nobody should be held on a
 * spinner by a slow n8n. A retry is somebody in the admin panel who has chosen
 * to wait and would rather it worked, so it gets longer before giving up on
 * what may be a cold instance.
 */
const SUBMIT_TIMEOUT_MS = 8000;
const RETRY_TIMEOUT_MS = 15000;

export async function deliver(
  lead: Record<string, unknown>,
  { retry = false }: { retry?: boolean } = {}
): Promise<Delivery> {
  const url = process.env.LEAD_WEBHOOK_URL;
  const secret = process.env.LEAD_WEBHOOK_SECRET;

  // Both or neither, deliberately. The shared secret is what stops anyone who
  // learns the webhook URL filing leads of their own — and those leads start an
  // SMS follow-up to whatever number they carry. Posting without it would be
  // rejected at the far end anyway; refusing here makes the reason explicit in
  // the log rather than surfacing as an opaque 401.
  if (!url || !secret) {
    return { result: "not-configured", detail: "no webhook URL or secret is set" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-grivo-secret": secret,
      },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(retry ? RETRY_TIMEOUT_MS : SUBMIT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = `webhook rejected the lead: ${response.status} ${response.statusText}`;
      console.error(`[contact] ${detail}`);
      return { result: "failed", detail };
    }

    return { result: "sent" };
  } catch (error) {
    // Covers the timeout, DNS failure and connection refusal cases alike.
    console.error("[contact] webhook delivery failed", error);
    return {
      result: "failed",
      detail: error instanceof Error ? error.message : "delivery failed",
    };
  }
}
