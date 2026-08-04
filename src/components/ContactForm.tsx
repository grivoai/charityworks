"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookingPanel } from "@/components/BookingPanel";
import { site } from "@/content/site";
import type { ContactPage } from "@/content/types";
// Type-only, so the server-side registry module is never pulled into this
// client bundle — only the plain lookup object the page passes as a prop.
import type { InterestLookup } from "@/lib/interests";
import type { LeadSource } from "@/lib/lead-context";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Contact form rendered from the field definitions in the content layer.
 *
 * Fields are data, not markup, so Phase 2's form builder can drive this same
 * renderer. Submissions POST to /api/contact rather than being swallowed
 * client-side, giving that work a real endpoint to grow into.
 *
 * This is the only form on the site. A request for a specific lot, a request
 * for an auctioneer and the auction planner quiz all land here with context in
 * the query string rather than on a form of their own, so every enquiry reaches
 * the same endpoint and the same downstream automation.
 *
 * On success the fields are replaced by the thank-you message and Calendly's
 * scheduling widget, so someone who is ready now can book instead of waiting on
 * the follow-up. That is offered in addition to the lead, never instead of it:
 * the submission has already been delivered and logged before it renders.
 */
export function ContactForm({
  form,
  idPrefix = "",
  source = "contact-page",
  interests,
}: {
  form: ContactPage["form"];
  /**
   * Namespaces the generated field ids. The form renders on both / and
   * /contact, and duplicate ids would break every label's `for` association if
   * the two ever appear on the same document.
   */
  idPrefix?: string;
  /** Fallback source, used when the URL names no specific interest. */
  source?: LeadSource;
  /**
   * Id -> label map for resolving `?interest=`. Omitted on surfaces that cannot
   * carry an interest (the home page form), which keeps it out of that bundle.
   */
  interests?: InterestLookup;
}) {
  const [status, setStatus] = useState<Status>("idle");
  /** What came back from a successful submission, used to set up the booking. */
  const [lead, setLead] = useState<SubmittedLead | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const fieldId = (id: string) => (idPrefix ? `${idPrefix}-${id}` : id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setStatus("submitting");

    try {
      // Hidden context inputs are part of the form, so FormData collects them
      // alongside the visible fields with no special handling here.
      const payload = Object.fromEntries(new FormData(formEl).entries());
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      // Read from the payload rather than the form: reset() is about to clear
      // it, and these values are what prefill the booking widget.
      const body = await response.json().catch(() => null);
      setLead({
        leadId: typeof body?.leadId === "string" ? body.leadId : "",
        name: asText(payload.name),
        email: asText(payload.email),
        source: asText(payload.source) || source,
      });

      formEl.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  // The fields are gone by the time this runs, so focus would otherwise be
  // sitting on a detached node and fall back to the top of the document.
  // Moving it to the confirmation keeps a keyboard or screen reader user where
  // the content went — directly above the booking widget.
  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  // className is a constant string, and must stay one. This element carries
  // `.reveal`, whose `in` class RevealObserver adds imperatively; interpolating
  // status here would have React rewrite the whole attribute on submit and
  // wipe it, fading the panel out at the moment of success. Only the children
  // below change. Same reason FaqAccordion styles its open state from an
  // attribute — see RevealObserver.
  return (
    <form className="contact-form reveal d1" onSubmit={handleSubmit}>
      {status === "success" && lead ? (
        <div
          className="form-success"
          role="status"
          ref={successRef}
          tabIndex={-1}
        >
          <p className="form-success-msg">{form.successMessage}</p>

          {/* No `.reveal` anywhere in here. RevealObserver takes its snapshot
              of `.reveal:not(.in)` once per navigation, so an element mounted
              this late is never observed and would sit at opacity 0 forever. */}
          {site.booking.url && (
            <BookingPanel
              booking={site.booking}
              name={lead.name}
              email={lead.email}
              leadId={lead.leadId}
              campaign={lead.source}
            />
          )}
        </div>
      ) : (
      <div className="form-grid">
        {/* useSearchParams() suspends during prerender; isolating it here keeps
            the rest of the form statically rendered rather than forcing the
            whole page to be dynamic just to read one query parameter. */}
        <Suspense fallback={null}>
          <LeadContextFields source={source} interests={interests} />
        </Suspense>

        {form.fields.map((field) => (
          <div
            key={field.id}
            className={`field${field.width === "full" ? " full" : ""}`}
          >
            <label htmlFor={fieldId(field.id)}>
              {field.label}
              {field.required && <span className="sr-only"> (required)</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={fieldId(field.id)}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : (
              <input
                id={fieldId(field.id)}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="btn btn-gold"
          style={{ gridColumn: "span 2" }}
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending…" : form.submitLabel}
        </button>

        <div className="form-msg" role="status" aria-live="polite">
          {status === "error" ? form.errorMessage : ""}
        </div>
      </div>
      )}
    </form>
  );
}

/**
 * Planner answers the form will forward if they are in the URL.
 *
 * Mirrors the `quiz*` keys `/api/contact` accepts. Listed explicitly rather
 * than copied from the query string wholesale, so a crafted link cannot add
 * fields of its own to the submission.
 */
const QUIZ_PARAMS = [
  "quizEventType",
  "quizAttendance",
  "quizFormat",
  "quizPriceBand",
  "quizInterests",
  "quizRecommended",
] as const;

/**
 * Which source each kind of interest implies. Exhaustive over the record types
 * by construction, so adding one to the registry is a type error here rather
 * than a lead quietly filed under the wrong source.
 */
const SOURCE_FOR_TYPE: Record<InterestRecordType, LeadSource> = {
  item: "item-request",
  category: "category-request",
  auctioneer: "auctioneer-request",
  partner: "partner-request",
};

type InterestRecordType = NonNullable<InterestLookup[string]>["type"];

/** The parts of a delivered submission the booking widget needs. */
type SubmittedLead = {
  leadId: string;
  name: string;
  email: string;
  source: string;
};

/** FormData entries are string | File; only the string case is meaningful here. */
function asText(value: FormDataEntryValue | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * The hidden context travelling with the submission, plus a visible note
 * confirming what the enquiry is about.
 *
 * Only an *identifier* is submitted. The label shown here is resolved from the
 * lookup the server supplied, and an id that resolves to nothing renders no
 * note at all — so a hand-edited `?interest=` cannot put arbitrary text on the
 * page or into the lead. The server repeats the same resolution rather than
 * trusting anything sent from here.
 */
function LeadContextFields({
  source,
  interests,
}: {
  source: LeadSource;
  interests?: InterestLookup;
}) {
  const params = useSearchParams();

  const interestId = params.get("interest") ?? "";
  const record = interests && interestId ? interests[interestId] : undefined;

  // Root-relative only. The server re-checks; this keeps a junk value from
  // being submitted in the first place.
  const rawFrom = params.get("from") ?? "";
  const sourcePath =
    rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "";

  // Derived from what the id actually resolved to, so the recorded source can
  // never contradict the recorded interest.
  const resolvedSource: LeadSource = record
    ? SOURCE_FOR_TYPE[record.type]
    : source;

  // Planner answers, when the lead came from the quiz. Carried as hidden fields
  // and never rendered as text: these are raw query-string values, and printing
  // one would be a way to put chosen wording on the page. The server sanitises
  // them again and caps their length.
  const fromQuiz = params.get("source") === "quiz";
  const quiz = fromQuiz
    ? QUIZ_PARAMS.map((key) => [key, params.get(key) ?? ""] as const).filter(
        ([, value]) => value !== ""
      )
    : [];

  return (
    <>
      <input
        type="hidden"
        name="source"
        value={fromQuiz && !record ? "quiz" : resolvedSource}
      />
      {sourcePath && (
        <input type="hidden" name="sourcePath" value={sourcePath} />
      )}
      {record && <input type="hidden" name="interestId" value={interestId} />}

      {quiz.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {/* Static text, deliberately. The banner confirms the answers travelled
          without echoing any of them back. */}
      {fromQuiz && !record && (
        <div className="lead-context">
          <p>
            <span className="lead-context-label">Coming from</span>
            <strong>Your auction planner answers</strong>
            <span className="lead-context-parent">
              They&rsquo;re attached to this enquiry — no need to retype them.
            </span>
          </p>
          <Link href="/contact" className="lead-context-clear">
            Clear
          </Link>
        </div>
      )}

      {record && (
        <div className="lead-context">
          <p>
            <span className="lead-context-label">You&rsquo;re asking about</span>
            <strong>{record.label}</strong>
            {record.categoryLabel && (
              <span className="lead-context-parent">{record.categoryLabel}</span>
            )}
          </p>
          {/* Scrubs the query string, so someone who followed the wrong link can
              send a general enquiry without hunting for the plain form. */}
          <Link href="/contact" className="lead-context-clear">
            Clear
          </Link>
        </div>
      )}
    </>
  );
}
