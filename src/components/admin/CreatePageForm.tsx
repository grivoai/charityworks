"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createCustomPage, type CreateState } from "@/lib/admin/custom-page-actions";
import { slugify } from "@/lib/admin/slug";
import { PAGE_TEMPLATES, DEFAULT_TEMPLATE_ID } from "@/lib/admin/page-templates";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="admin-btn is-primary" disabled={pending}>
      {pending ? "Creating…" : "Create page"}
    </button>
  );
}

/**
 * Title in, page out.
 *
 * The address is derived from the title as it is typed and shown before
 * anything is committed, rather than asked for as a second required field.
 * Making somebody invent a URL before they have written a word is the step that
 * stalls this kind of feature, and the derived answer is nearly always the one
 * they would have chosen.
 *
 * It stays editable, because sometimes it is not — a page titled "Frequently
 * Asked Questions About Silent Auctions" should probably live at /silent-
 * auctions. Once touched, the field stops following the title, so an edit is
 * not overwritten by the next keystroke in the box above.
 */
export function CreatePageForm({
  thumbs,
}: {
  /**
   * A wireframe per template id, drawn on the server.
   *
   * Elements rather than data: they are derived from the schema, and taking
   * them as rendered nodes is what keeps that derivation — and zod — on the
   * server side of this boundary. A template with no thumbnail simply shows
   * none, so this form does not break if one is ever left out.
   */
  thumbs: Record<string, React.ReactNode>;
}) {
  const [state, formAction] = useActionState<CreateState, FormData>(createCustomPage, {});
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE_ID);

  const shown = touched ? slug : title ? slugify(title, "page") : "";

  return (
    <section className="admin-panel">
      <h2 className="admin-panel-title">Add a page</h2>

      {state.message && (
        <p className="admin-banner is-bad" role="alert">{state.message}</p>
      )}

      <form action={formAction} className="admin-create">
        <div className="admin-field">
          <label htmlFor="page-title">Title</label>
          <input
            id="page-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Spring Gala 2026"
            required
          />
        </div>

        <div className="admin-field">
          <label htmlFor="page-slug">Address</label>
          <div className="admin-slug">
            <span aria-hidden="true">/</span>
            <input
              id="page-slug"
              name="slug"
              value={shown}
              onChange={(event) => {
                setTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="spring-gala-2026"
              autoComplete="off"
            />
          </div>
          <p className="admin-help">
            Where the page will live. Lowercase letters, numbers and hyphens.
            It is fixed once the page exists, so anyone you send the link to
            keeps it.
          </p>
        </div>

        <fieldset className="admin-field admin-templates">
          <legend>Start from</legend>
          <div className="admin-template-grid">
            {PAGE_TEMPLATES.map((option) => (
              <label
                key={option.id}
                className={`admin-template${template === option.id ? " is-on" : ""}`}
              >
                <input
                  type="radio"
                  name="template"
                  value={option.id}
                  checked={template === option.id}
                  onChange={() => setTemplate(option.id)}
                />
                {thumbs[option.id]}
                <span className="admin-template-label">{option.label}</span>
                <span className="admin-template-note">{option.description}</span>
              </label>
            ))}
          </div>
          <p className="admin-help">
            A template only fills the page in to start with. Every block it adds
            can be edited, reordered or removed, and the placeholder wording is
            written to be replaced. The pictures are sketches of the
            arrangement, not the finished page.
          </p>
        </fieldset>

        <Submit />
      </form>

      <p className="admin-help">
        New pages start as a draft — nothing is served at the address until you
        publish it.
      </p>
    </section>
  );
}
