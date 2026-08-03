import { NextResponse } from "next/server";
import { getPage } from "@/lib/content";
import { resolveInterest } from "@/lib/interests";
import {
  buildContextSummary,
  isLeadSource,
  sanitizeContextValue,
  sanitizeSourcePath,
  type InterestType,
} from "@/lib/lead-context";

/**
 * The single lead endpoint.
 *
 * Every enquiry on the site posts here: the contact page form, the home page
 * form, a request for a specific lot, a request for an auctioneer, and the
 * auction planner quiz. They differ only in the context they carry, so there is
 * one validation path, one payload shape and one delivery step — which is what
 * keeps the downstream automation from needing a branch per surface.
 *
 * Delivery is a POST to `LEAD_WEBHOOK_URL` (an n8n webhook trigger). The
 * console log predates the webhook and is kept deliberately: it is the fallback
 * record if the webhook is unset, unreachable, or returns an error, so a lead is
 * never lost to a delivery failure alone. Vercel retains function logs, which
 * makes them recoverable by hand.
 */

/** Ceiling for a single visible form value. The message box is the long one. */
const MAX_FIELD_LENGTH = 5000;

/**
 * How long to wait on the webhook before giving up.
 *
 * The submitter is waiting on this request, so the budget is a UX number, not a
 * reliability one. A slow n8n instance must not hold someone on a spinner; the
 * console log covers the timeout case.
 */
const WEBHOOK_TIMEOUT_MS = 8000;

/** Quiz answer keys, carried through verbatim after sanitising. */
const QUIZ_KEYS = [
  "quizEventType",
  "quizAttendance",
  "quizPriceBand",
  "quizInterests",
  "quizRecommended",
] as const;

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { form } = getPage("contact");

  const missing = form.fields
    .filter((field) => field.required)
    .filter((field) => {
      const value = payload[field.name];
      return typeof value !== "string" || value.trim() === "";
    })
    .map((field) => field.name);

  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields.", fields: missing },
      { status: 422 }
    );
  }

  /* ---------------------------------------------------------------- */
  /* Visible fields                                                    */
  /* ---------------------------------------------------------------- */
  // Only keys the form actually defines, so unexpected input is dropped. Every
  // defined key is present in the output even when empty: the destination is a
  // spreadsheet, and a stable column set matters more than a compact payload.
  const fields = Object.fromEntries(
    form.fields.map((field) => {
      const value = payload[field.name];
      const text = typeof value === "string" ? value.trim() : "";
      return [field.name, text.slice(0, MAX_FIELD_LENGTH)];
    })
  );

  /* ---------------------------------------------------------------- */
  /* Context                                                           */
  /* ---------------------------------------------------------------- */
  // The client sends an id; the label is resolved here. A crafted `interestId`
  // that names nothing simply resolves to undefined and the lead is recorded as
  // a general enquiry — it can never put chosen text in front of the client.
  const interest = resolveInterest(payload.interestId);
  const source = isLeadSource(payload.source) ? payload.source : "contact-page";

  const quiz = Object.fromEntries(
    QUIZ_KEYS.map((key) => [key, sanitizeContextValue(payload[key])])
  ) as Record<(typeof QUIZ_KEYS)[number], string>;

  // Quiz leads are typed from the source, not from an interest id: the quiz
  // recommends several categories rather than pointing at a single record.
  const interestType: InterestType = interest
    ? interest.type
    : source === "quiz"
      ? "quiz"
      : "general";

  const quizRecommendedLabels = quiz.quizRecommended
    ? quiz.quizRecommended
        .split(",")
        .map((id) => resolveInterest(id.trim())?.label)
        .filter((label): label is string => Boolean(label))
    : [];

  const context = {
    source,
    sourcePath: sanitizeSourcePath(payload.sourcePath),
    interestType,
    interestId: interest?.id ?? "",
    interestLabel: interest?.label ?? "",
    interestCategory: interest?.categoryLabel ?? "",
    ...quiz,
    contextSummary: buildContextSummary({
      source,
      interestType,
      interestLabel: interest?.label,
      interestCategory: interest?.categoryLabel,
      quizRecommendedLabels,
    }),
  };

  /* ---------------------------------------------------------------- */
  /* Delivery                                                          */
  /* ---------------------------------------------------------------- */
  // Flat, not nested: this lands in a spreadsheet, where one key per column is
  // the shape that needs no transform step in between.
  const lead = {
    leadId: crypto.randomUUID(),
    submittedAt: new Date().toISOString(),
    ...fields,
    ...context,
  };

  const delivery = await deliver(lead);

  // Always logged, whatever the webhook did. This is the fallback record.
  console.info("[contact] lead", { delivery, ...lead });

  // The submitter is told the enquiry succeeded even when the webhook failed:
  // from their side it did, we hold their details, and an error here would only
  // produce duplicate submissions. Delivery failures surface in the logs above.
  //
  // leadId goes back to the browser so the Calendly embed on the success state
  // can carry it as utm_content. Calendly passes UTM parameters through to the
  // booking record and its own webhooks, which is what lets a booking be joined
  // to the lead that produced it rather than matched on email and hoped for.
  return NextResponse.json({ ok: true, leadId: lead.leadId });
}

type DeliveryResult = "sent" | "not-configured" | "failed";

async function deliver(lead: Record<string, unknown>): Promise<DeliveryResult> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return "not-configured";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[contact] webhook rejected the lead: ${response.status} ${response.statusText}`
      );
      return "failed";
    }

    return "sent";
  } catch (error) {
    // Covers the timeout, DNS failure and connection refusal cases alike.
    console.error("[contact] webhook delivery failed", error);
    return "failed";
  }
}
