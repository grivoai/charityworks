import { NextResponse } from "next/server";
import { getPage } from "@/lib/content";

/**
 * Contact form endpoint.
 *
 * Phase 1 validates the submission against the field definitions in the content
 * layer and logs it — there is no mail provider or database wired up yet. Phase 2
 * replaces the logging step with a write to the submissions table and a
 * notification, without changing the request or response contract.
 */
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

  return NextResponse.json({ ok: true });
}
