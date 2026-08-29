import { NextResponse } from "next/server";
import { recordDelivery, recordSubmission } from "@/lib/submissions";
import { deliver } from "@/lib/lead-delivery";
import { isCoreField } from "@/lib/admin/form-write";
import { getPage } from "@/lib/content";
import { getInterestRegistry } from "@/lib/interests";
import { checkContactRate } from "@/lib/contact-throttle";
import { verifyCaptcha } from "@/lib/hcaptcha";
import { sanitizeFormAnswer } from "@/lib/lead-safety";
import {
  buildContextSummary,
  isLeadSource,
  sanitizeContextValue,
  sanitizeSourcePath,
  type InterestType,
  type LeadSource,
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
 * Delivery is a POST to `LEAD_WEBHOOK_URL`, the "CW — Website Lead Intake"
 * workflow in n8n, authenticated with the shared secret in
 * `LEAD_WEBHOOK_SECRET`. That workflow is live and already maps these fields,
 * so its contract is the fixed point here: `eventDate` rather than `date`, and
 * `leadId` in the `web:<surface>:<uuid>` shape it dedupes on.
 *
 * The console log predates the webhook and is kept deliberately: it is the
 * fallback record if the webhook is unset, unreachable, or returns an error, so
 * a lead is never lost to a delivery failure alone. Vercel retains function
 * logs, which makes them recoverable by hand.
 */

/**
 * The hidden field a bot fills in and a person cannot see.
 *
 * Named for something a scraper would plausibly want to complete rather than
 * anything that reads as a trap. A submission that carries a value here was not
 * typed by someone looking at the page.
 */
const HONEYPOT_FIELD = "website";

/**
 * The shortest believable time between the form rendering and being sent.
 *
 * The browser stamps `renderedAt` when the form mounts. Under two seconds is
 * not a person reading five labels and typing an enquiry; it is a script that
 * fetched the page and posted immediately. Generous enough that a fast typist
 * pasting from a draft is unaffected.
 */
const MIN_FILL_MS = 2000;

/**
 * Form field name -> the key the pipeline reads, where the two differ.
 *
 * n8n's Normalize node already reads `eventDate`. Renaming on the way out
 * rather than renaming the form field leaves the field definition, its label
 * and its `for` association untouched.
 */
const PAYLOAD_KEY: Record<string, string> = { date: "eventDate" };

/**
 * Lead id prefix per source.
 *
 * The pipeline dedupes on `leadId`, so a resubmission of the same enquiry is
 * discarded rather than filed twice and texted twice. The `web:<surface>:`
 * shape comes from the live workflow, which was built against `web:contact:`;
 * extending it per source keeps that contract while making the surface a lead
 * came from readable without parsing the rest of the row.
 */
const LEAD_ID_PREFIX: Record<LeadSource, string> = {
  "contact-page": "contact",
  home: "home",
  "category-request": "category",
  "item-request": "item",
  "auctioneer-request": "auctioneer",
  "partner-request": "partner",
  quiz: "quiz",
  "custom-page": "page",
};

/** Quiz answer keys, carried through verbatim after sanitising. */
const QUIZ_KEYS = [
  "quizEventType",
  "quizAttendance",
  "quizFormat",
  "quizPriceBand",
  "quizInterests",
  "quizRecommended",
] as const;

export async function POST(request: Request) {
  /**
   * A JSON content type is required, and that is a security check rather than
   * a tidiness one. `request.json()` will parse any body regardless of what it
   * claims to be, and a `text/plain` POST is a CORS *simple request* — no
   * preflight — so any page a visitor happens to be on could silently file a
   * lead in their name. Requiring `application/json` forces a preflight, which
   * fails for lack of an allow-origin header, which is what closes it.
   */
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Send application/json." },
      { status: 415 }
    );
  }

  /**
   * Vercel overwrites `X-Forwarded-For` and does not forward external values,
   * so the leftmost hop is the real client here and cannot be spoofed. On any
   * other host that assumption needs re-checking before this is trusted.
   */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const gate = await checkContactRate(ip);
  if (gate.blocked) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Too many enquiries from this connection. Try again shortly, or " +
          "call us on (925) 250-6968.",
      },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  /**
   * Bot checks before validation, so an automated submission never reaches the
   * database, the webhook or the client's phone. Both answer with the same
   * generic message a real error would produce: telling a script which check it
   * failed is telling it what to change.
   */
  const honeypot = payload[HONEYPOT_FIELD];
  const filledHoneypot = typeof honeypot === "string" && honeypot.trim() !== "";

  const renderedAt = Number(payload.renderedAt);
  const tooFast =
    Number.isFinite(renderedAt) && Date.now() - renderedAt < MIN_FILL_MS;

  if (filledHoneypot || tooFast) {
    /* 200, not 4xx. A bot that learns it was caught retries differently; one
       that believes it succeeded does not. Nothing is filed and nothing is
       delivered. */
    return NextResponse.json({ ok: true, leadId: null });
  }

  /**
   * The CAPTCHA is only demanded once this address has already sent more than
   * a couple of enquiries in the window — see `contact-throttle.ts`. A
   * first-time enquirer is never asked, which is the point: this sits on the
   * site's main conversion path and friction there has a cost.
   */
  if (gate.challenge) {
    const token = String(payload.captchaToken ?? "");
    if (!(await verifyCaptcha(token))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please complete the check below and send again.",
          captchaRequired: true,
        },
        { status: 403 }
      );
    }
  }

  const { form } = await getPage("contact");

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
  /**
   * Only keys the form actually defines, so unexpected input is dropped. Every
   * defined key is present in the output even when empty: the destination is a
   * spreadsheet, and a stable column set matters more than a compact payload.
   *
   * Split in two, and the split is the whole reason the form can be edited at
   * all. The six core answers stay flat and keep their exact keys, because the
   * n8n workflow writes them to fixed columns. A question the client added goes
   * inside `custom` — nested, so a question worded into the key `source` or
   * `interestId` cannot land on top of the context added below, which is a
   * collision no amount of care in the admin could rule out.
   *
   * n8n does not read `custom` and does not need to. Those answers are kept in
   * `submissions` and shown in the admin, which is what the client is told when
   * they add a question.
   */
  const fields: Record<string, string> = {};
  const custom: Record<string, string> = {};

  for (const field of form.fields) {
    /**
     * Sanitised, not merely trimmed. These are the values a sender chooses, and
     * they terminate in a spreadsheet cell — where a leading `=` is a formula
     * rather than text, and an embedded newline is a second row. `lead-context`
     * has always done this for the metadata the site attaches; the answers a
     * human types were the half that went through on a length cap alone.
     */
    const answer = sanitizeFormAnswer(field.name, payload[field.name]);

    if (isCoreField(field.name)) {
      fields[PAYLOAD_KEY[field.name] ?? field.name] = answer;
    } else {
      custom[field.name] = answer;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Context                                                           */
  /* ---------------------------------------------------------------- */
  // The client sends an id; the label is resolved here. A crafted `interestId`
  // that names nothing simply resolves to undefined and the lead is recorded as
  // a general enquiry — it can never put chosen text in front of the client.
  // The registry is read once and used for both the submitted interest and the
  // quiz's recommended ids below. `resolveInterest` would rebuild it per call,
  // and a quiz lead names four of them.
  const registry = await getInterestRegistry();
  const resolve = (id: unknown) =>
    typeof id === "string" && id !== "" ? registry.get(id) : undefined;

  const interest = resolve(payload.interestId);
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
        .map((id) => resolve(id.trim())?.label)
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
    leadId: `web:${LEAD_ID_PREFIX[source]}:${crypto.randomUUID()}`,
    submittedAt: new Date().toISOString(),
    ...fields,
    ...context,
    // Always present, empty or not, for the same reason the core keys are: a
    // shape that changes with the form is a shape nothing downstream can rely
    // on.
    custom,
  };

  /**
   * Filed before delivery is attempted, so an enquiry that dies mid-delivery
   * still exists. Failure here is swallowed: the person submitting has already
   * pressed the button, and a database problem must not cost them their
   * enquiry or stop it reaching the pipeline.
   */
  const filed = await recordSubmission(lead);

  const delivery = await deliver(lead);
  if (filed) await recordDelivery(lead.leadId, delivery.result, delivery.detail);

  /**
   * Logged without the enquirer's details.
   *
   * This used to spread the whole lead — name, email, phone, message — into
   * every log line, defended as the fallback record from before `submissions`
   * existed. The row is now written first and holds the same payload in `raw`,
   * so the log was a second copy of the same personal data in a store with
   * different retention, different access control and no deletion path, which
   * is a liability rather than a backstop. What is left is what an operator
   * actually needs to see: whether it was filed, whether it was delivered, and
   * which lead to go and look at.
   */
  console.info("[contact] lead", {
    leadId: lead.leadId,
    source,
    interestType: context.interestType ?? null,
    filed,
    delivery: delivery.result,
  });

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
