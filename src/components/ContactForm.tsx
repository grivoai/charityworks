"use client";

import { useState } from "react";
import type { ContactPage } from "@/content/types";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Contact form rendered from the field definitions in the content layer.
 *
 * Fields are data, not markup, so Phase 2's form builder can drive this same
 * renderer. Submissions POST to /api/contact rather than being swallowed
 * client-side, giving that work a real endpoint to grow into.
 */
export function ContactForm({
  form,
  idPrefix = "",
}: {
  form: ContactPage["form"];
  /**
   * Namespaces the generated field ids. The form renders on both / and
   * /contact, and duplicate ids would break every label's `for` association if
   * the two ever appear on the same document.
   */
  idPrefix?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const fieldId = (id: string) => (idPrefix ? `${idPrefix}-${id}` : id);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setStatus("submitting");

    try {
      const payload = Object.fromEntries(new FormData(formEl).entries());
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      formEl.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const message =
    status === "success"
      ? form.successMessage
      : status === "error"
        ? form.errorMessage
        : "";

  return (
    <form className="contact-form reveal d1" onSubmit={handleSubmit}>
      <div className="form-grid">
        {form.fields.map((field) => (
          <div
            key={field.id}
            className={`field${field.width === "full" ? " full" : ""}`}
          >
            <label htmlFor={fieldId(field.id)}>
              {field.label}
              {field.required && (
                <span className="sr-only"> (required)</span>
              )}
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
          {message}
        </div>
      </div>
    </form>
  );
}
