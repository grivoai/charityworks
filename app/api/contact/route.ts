import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getPage } from "@/lib/content";

/**
 * Contact form endpoint.
 *
 * Validates the submission against the field definitions in the content layer,
 * then forwards it to the lead pipeline, which files the lead in the
 * CharityWorks Leads sheet and starts the SMS follow-up.
 */

type Lead = {
  leadId: string;
  submittedAt: string;
  name: string;
  org: string;
  email: string;
  phone: string;
  source: string;
  sourcePath: string;
  eventDate: string;
  contextSummary: string;
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * One-line description of what the lead asked about. The pipeline stores this
 * as the lead's notes and the first SMS quotes it, so it should read like a
 * human wrote it rather than a field dump.
 */
function buildContextSummary(submission: Record<string, unknown>) {
  const parts = ["Contact form"];
  const org = text(submission.org);
  const eventDate = text(submission.date);
  const message = text(submission.message);

  if (org) parts.push(`from ${org}`);
  if (eventDate) parts.push(`event on ${eventDate}`);
  if (message) parts.push(`- ${message}`);

  return parts.join(" ");
}

/**
 * Hands the lead to the pipeline. A failure here must not fail the submission:
 * the visitor already did their part, and the payload stays recoverable from
 * the log line above. `leadId` is the pipeline's dedupe key, so a retry of the
 * same submission is discarded rather than texting the lead twice.
 */
async function forwardLead(lead: Lead) {
  // Narrowed into locals because both are `string | undefined` under strict TS.
  const url = process.env.LEAD_WEBHOOK_URL;
  const secret = process.env.LEAD_WEBHOOK_SECRET;

  if (!url || !secret) {
    console.error(
      "[contact] LEAD_WEBHOOK_URL or LEAD_WEBHOOK_SECRET is unset; lead not forwarded",
      lead.leadId
    );
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-grivo-secret": secret,
      },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      console.error(
        "[contact] lead webhook rejected",
        lead.leadId,
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error("[contact] lead webhook failed", lead.leadId, error);
  }
}

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

  // Only persist keys the form actually defines, so unexpected input is dropped.
  const submission = Object.fromEntries(
    form.fields
      .map((field) => [field.name, payload[field.name]])
      .filter(([, value]) => typeof value === "string" && value !== "")
  );

  console.info("[contact] submission received", submission);

  await forwardLead({
    leadId: `web:contact:${randomUUID()}`,
    submittedAt: new Date().toISOString(),
    name: text(submission.name),
    org: text(submission.org),
    email: text(submission.email),
    phone: text(submission.phone),
    source: "contact",
    sourcePath: "/contact",
    eventDate: text(submission.date),
    contextSummary: buildContextSummary(submission),
  });

  return NextResponse.json({ ok: true });
}
