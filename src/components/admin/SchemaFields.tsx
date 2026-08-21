"use client";

import { useId, useRef, useState } from "react";
import type {
  ArrayNode,
  FieldErrors,
  FieldNode,
  ImageNode,
  ObjectNode,
  VariantNode,
} from "@/lib/admin/field-node";
import { FIELD_PATH_ATTR, domId } from "@/lib/admin/dom";
import { putFile } from "@/components/admin/upload-transfer";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { Icon, ICON_SLUGS } from "@/components/Icon";
import { addImage, signImage } from "@/lib/admin/image-actions";
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  imageProblem,
} from "@/lib/admin/image-rules";
import { formatBytes } from "@/lib/admin/document-rules";

/**
 * Renders an editable form from a field tree.
 *
 * Knows nothing about pages, categories or lots — it is handed a tree derived
 * from a Zod schema and a value, and renders one against the other. That is what
 * lets the same component edit a page today and a catalog item next, without a
 * second form to keep in step with the first.
 *
 * Values are held in React state as one document and submitted as one JSON
 * field, so nothing here depends on input names. Disabled inputs still
 * round-trip for the same reason: a locked field's value lives in the document,
 * not in the DOM.
 */

interface FieldProps {
  node: FieldNode;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Dotted path, matching the keys used for validation errors. */
  path: string;
  errors: FieldErrors;
  depth: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Every field carries its own path on its wrapper.
 *
 * The preview column uses this to find the input for an element the client
 * clicked, and to know which element to highlight when an input is focused.
 * It has to be the path rather than the DOM id because `domId` is one-way —
 * it flattens dots to hyphens, so an id cannot be turned back into a path —
 * and it has to be on the wrapper rather than the input because two field
 * kinds (checkboxes and images) do not have a single input to hang it on.
 */
function marker(path: string): Record<string, string> {
  return { [FIELD_PATH_ATTR]: path };
}

/** A short, human summary of a list entry, for its header row. */
function summarize(value: unknown, fallback: string): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (!value || typeof value !== "object") return fallback;
  const record = value as Record<string, unknown>;
  for (const key of [
    "title",
    "question",
    "name",
    "label",
    "heading",
    "quote",
    "action",
    "value",
    "author",
    "body",
  ]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      const text = candidate.trim();
      return text.length > 68 ? `${text.slice(0, 68)}…` : text;
    }
  }
  return fallback;
}

/** "faqs" → "faq", so a new entry's identifier reads like the others. */
function idPrefix(path: string): string {
  const last = path.split(".").pop() ?? "item";
  return last.endsWith("s") ? last.slice(0, -1) : last;
}

function newEntry(template: unknown, path: string): unknown {
  const copy = JSON.parse(JSON.stringify(template ?? null)) as unknown;
  if (copy && typeof copy === "object" && !Array.isArray(copy)) {
    const record = copy as Record<string, unknown>;
    if ("id" in record) {
      record.id = `${idPrefix(path)}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  return copy;
}

/**
 * Content first, housekeeping last.
 *
 * Every page schema is built by spreading a shared base, so `seo` and `heading`
 * come out ahead of the page's actual content. The heading belongs at the top;
 * the search listing does not.
 */
function orderFields(fields: ObjectNode["fields"]): ObjectNode["fields"] {
  const weight = (key: string) => (key === "heading" ? -1 : key === "seo" ? 1 : 0);
  return [...fields].sort((a, b) => weight(a.key) - weight(b.key));
}

/* ------------------------------------------------------------------ */
/* Leaves                                                              */
/* ------------------------------------------------------------------ */

function FieldFrame({
  node,
  path,
  errors,
  children,
}: {
  node: FieldNode;
  path: string;
  errors: FieldErrors;
  children: React.ReactNode;
}) {
  const error = errors[path];
  return (
    <div className={`admin-f${error ? " is-invalid" : ""}`} {...marker(path)}>
      <label htmlFor={domId(path)}>
        {node.label}
        {node.locked && <span className="admin-lock">fixed</span>}
      </label>
      {children}
      {/* When a field is locked, the reason it is locked is the more useful of
          the two notes and says everything the description would. Showing both
          stacks two paragraphs saying the same thing under every entry. */}
      {node.locked ? (
        <p className="admin-help admin-help-lock">{node.locked}</p>
      ) : (
        node.description && <p className="admin-help">{node.description}</p>
      )}
      {error && (
        <p className="admin-f-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A visual chooser for the `icon`/`emoji` fields, so an editor picks from the
 * line-icon set (see components/Icon.tsx) rather than typing a slug. The stored
 * value is still the slug string, so nothing downstream changes.
 */
function IconPickerField(props: FieldProps) {
  const { node, value, onChange, path, errors } = props;
  const current = typeof value === "string" ? value : "";
  return (
    <FieldFrame node={node} path={path} errors={errors}>
      <div
        className="admin-icon-picker"
        role="radiogroup"
        aria-label={`${node.label} icon`}
      >
        {ICON_SLUGS.map((slug) => {
          const selected = slug === current;
          return (
            <button
              key={slug}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={slug}
              title={slug}
              className={`admin-icon-swatch${selected ? " is-selected" : ""}`}
              disabled={Boolean(node.locked)}
              onClick={() => onChange(slug)}
            >
              <Icon name={slug} />
            </button>
          );
        })}
      </div>
      <p className="admin-help admin-icon-current">
        {current ? `Selected: ${current}` : "Pick an icon above."}
      </p>
    </FieldFrame>
  );
}

function StringField(props: FieldProps) {
  const { node, value, onChange, path, errors } = props;
  if (node.kind !== "string") return null;
  if (/(^|\.)(icon|emoji)$/.test(path)) return <IconPickerField {...props} />;
  const text = typeof value === "string" ? value : "";
  const shared = {
    id: domId(path),
    value: text,
    disabled: Boolean(node.locked),
    "aria-invalid": path in errors || undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onChange(event.target.value),
  };

  return (
    <FieldFrame node={node} path={path} errors={errors}>
      {node.multiline ? (
        <textarea {...shared} rows={Math.min(10, 2 + Math.floor(text.length / 72))} />
      ) : (
        <input
          {...shared}
          type={node.format === "email" ? "email" : node.format === "url" ? "url" : "text"}
        />
      )}
    </FieldFrame>
  );
}

function NumberField({ node, value, onChange, path, errors }: FieldProps) {
  if (node.kind !== "number") return null;
  return (
    <FieldFrame node={node} path={path} errors={errors}>
      <input
        id={domId(path)}
        type="number"
        className="admin-narrow"
        disabled={Boolean(node.locked)}
        value={value === null || value === undefined ? "" : String(value)}
        min={node.min}
        max={node.max}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      />
    </FieldFrame>
  );
}

function BooleanField({ node, value, onChange, path, errors }: FieldProps) {
  if (node.kind !== "boolean") return null;
  return (
    <div className="admin-f admin-f-check" {...marker(path)}>
      <label>
        <input
          type="checkbox"
          checked={value === true}
          disabled={Boolean(node.locked)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{node.label}</span>
      </label>
      {node.description && <p className="admin-help">{node.description}</p>}
      {errors[path] && <p className="admin-f-error">{errors[path]}</p>}
    </div>
  );
}

function EnumField({ node, value, onChange, path, errors }: FieldProps) {
  if (node.kind !== "enum") return null;
  return (
    <FieldFrame node={node} path={path} errors={errors}>
      <select
        id={domId(path)}
        className="admin-narrow"
        disabled={Boolean(node.locked)}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {node.values.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

/**
 * An image.
 *
 * Alt text sits directly under the preview rather than in a list of other
 * fields, because it is the thing most often left describing the previous
 * picture after a swap.
 */
/**
 * Choosing a photograph by uploading one.
 *
 * The field's `src` was a text box expecting a path like
 * `/images/catalog/example.jpg` — fine for the ninety-six photographs Phase 1
 * shipped, and no help at all to someone who has a new one on their desktop.
 * The box stays, because those existing paths are still the right value and
 * still need to be editable; this adds the way in for everything else.
 *
 * It sets the field and nothing more. The photograph is not on the site until
 * the form is saved, which keeps every guarantee the save path makes — and an
 * upload the client then abandons is an unused row rather than a live change
 * they did not ask for.
 */
function ImageUpload({
  onChosen,
}: {
  onChosen: (image: { src: string; width: number | null; height: number | null }) => void;
}) {
  const [percent, setPercent] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const busy = percent !== null;

  const upload = async (file: File) => {
    setNote(null);
    const bad = imageProblem(file.name, file.size);
    if (bad) return setProblem(bad);

    setProblem(null);
    setPercent(0);

    const signed = await signImage(file.name);
    if (!signed.ok) {
      setPercent(null);
      return setProblem(signed.message);
    }

    try {
      await putFile(signed.signedUrl, file, {
        contentType:
          IMAGE_TYPES[
            file.name.slice(file.name.lastIndexOf(".")).toLowerCase() as keyof typeof IMAGE_TYPES
          ] ?? "application/octet-stream",
        tooLarge: `That photograph is larger than the ${formatBytes(MAX_IMAGE_BYTES)} limit.`,
        onProgress: setPercent,
      });
    } catch (error) {
      setPercent(null);
      return setProblem((error as Error).message);
    }

    const added = await addImage({ path: signed.path, filename: file.name });
    setPercent(null);
    if (input.current) input.current.value = "";

    if (!added.ok) return setProblem(added.message);

    onChosen({ src: added.src, width: added.width, height: added.height });
    setNote(
      added.warning ??
        (added.deduped
          ? "That photograph was already in the library, so the copy already there is used."
          : `Added${added.width ? ` — ${added.width}\u00d7${added.height}` : ""}. It goes live when you save.`)
    );
  };

  return (
    <div className="admin-image-upload">
      <input
        ref={input}
        type="file"
        accept={Object.keys(IMAGE_TYPES).join(",")}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        className="admin-btn"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? `Uploading — ${percent}%` : "Upload a photograph"}
      </button>

      {busy && (
        <div className="admin-doc-bar" role="status">
          <span style={{ width: `${percent}%` }} />
        </div>
      )}
      {problem && <p className="admin-f-error">{problem}</p>}
      {note && !problem && <p className="admin-help">{note}</p>}
    </div>
  );
}

function ImageField({
  node,
  value,
  onChange,
  path,
  errors,
}: FieldProps & { node: ImageNode }) {
  const image = (value ?? undefined) as
    | { src?: string; alt?: string }
    | undefined;

  if (!image) {
    return (
      <div className="admin-f" {...marker(path)}>
        <label>{node.label}</label>
        <ImageUpload onChosen={(image) => onChange({ ...image, alt: "" })} />
        <ImagePicker onChosen={(image) => onChange({ ...image, alt: "" })} />
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          onClick={() => onChange({ src: "", alt: "" })}
        >
          Or type a path
        </button>
        {node.description && <p className="admin-help">{node.description}</p>}
      </div>
    );
  }

  const set = (patch: Record<string, unknown>) => onChange({ ...image, ...patch });

  return (
    <fieldset className="admin-sub admin-image-field" {...marker(path)}>
      <legend>{node.label}</legend>

      <div className="admin-image-row">
        <div className="admin-image-preview">
          {image.src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={image.src} alt="" />
          ) : (
            <span>No image yet</span>
          )}
        </div>

        <div className="admin-image-inputs">
          <div className={`admin-f${errors[`${path}.src`] ? " is-invalid" : ""}`}>
            <label htmlFor={domId(`${path}.src`)}>Image file</label>
            <input
              id={domId(`${path}.src`)}
              type="text"
              value={image.src ?? ""}
              placeholder="/images/catalog/example.jpg"
              onChange={(event) => set({ src: event.target.value })}
            />
            {errors[`${path}.src`] && (
              <p className="admin-f-error">{errors[`${path}.src`]}</p>
            )}
            {/* The alt text describes the old photograph, so both of these
                clear it rather than carrying it onto a different one. Leaving
                it would be worse than empty: a caption that confidently
                describes something that is no longer there. */}
            <ImageUpload onChosen={(image) => onChange({ ...image, alt: "" })} />
            <ImagePicker onChosen={(image) => onChange({ ...image, alt: "" })} />
          </div>

          <div className={`admin-f${errors[`${path}.alt`] ? " is-invalid" : ""}`}>
            <label htmlFor={domId(`${path}.alt`)}>Alt text</label>
            <input
              id={domId(`${path}.alt`)}
              type="text"
              value={image.alt ?? ""}
              onChange={(event) => set({ alt: event.target.value })}
            />
            <p className="admin-help">
              Describe what the photograph shows, for screen readers and search
              engines.
            </p>
            {errors[`${path}.alt`] && (
              <p className="admin-f-error">{errors[`${path}.alt`]}</p>
            )}
          </div>
        </div>
      </div>

      {node.optional && (
        <button
          type="button"
          className="admin-btn admin-btn-danger"
          onClick={() => onChange(undefined)}
        >
          Remove photograph
        </button>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

function ArrayField({
  node,
  value,
  onChange,
  path,
  errors,
  depth,
}: FieldProps & { node: ArrayNode }) {
  const items = Array.isArray(value) ? value : [];
  const editable = !node.fixedLength;

  /**
   * Which entries cannot be removed.
   *
   * Read off the entry itself rather than its position, so reordering the list
   * cannot move the protection onto a different entry.
   */
  const protectedEntry = (item: unknown): boolean => {
    if (!node.protect || !item || typeof item !== "object") return false;
    const held = (item as Record<string, unknown>)[node.protect.key];
    return node.protect.values.includes(String(held));
  };

  const replace = (index: number, next: unknown) =>
    onChange(items.map((item, i) => (i === index ? next : item)));

  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const isScalar = node.element.kind === "string" || node.element.kind === "number";

  return (
    <fieldset className="admin-sub admin-list-wrap">
      <legend>
        {node.label}
        <span className="admin-count-inline">{items.length}</span>
      </legend>
      {node.description && <p className="admin-help">{node.description}</p>}
      {node.fixedLength && (
        <p className="admin-help admin-help-lock">{node.fixedLength}</p>
      )}
      {node.protect && (
        <p className="admin-help admin-help-lock">{node.protect.reason}</p>
      )}

      {items.length === 0 && <p className="admin-list-empty">Nothing here yet.</p>}

      <ol className={`admin-list${isScalar ? " is-scalar" : ""}`}>
        {items.map((item, index) => {
          const itemPath = `${path}.${index}`;
          const key =
            item && typeof item === "object" && "id" in (item as object)
              ? String((item as Record<string, unknown>).id)
              : `i-${index}`;

          return (
            <li key={key} className="admin-item">
              {!isScalar && (
                <div className="admin-item-head">
                  <span className="admin-item-title">
                    {summarize(item, `Entry ${index + 1}`)}
                  </span>
                  <div className="admin-item-tools">
                    <button
                      type="button"
                      className="admin-icon"
                      title="Move up"
                      aria-label={`Move ${summarize(item, `entry ${index + 1}`)} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-icon"
                      title="Move down"
                      aria-label={`Move ${summarize(item, `entry ${index + 1}`)} down`}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    {editable && !protectedEntry(item) && (
                      <button
                        type="button"
                        className="admin-icon admin-icon-danger"
                        title="Remove"
                        aria-label={`Remove ${summarize(item, `entry ${index + 1}`)}`}
                        onClick={() =>
                          onChange(items.filter((_, i) => i !== index))
                        }
                      >
                        ✕
                      </button>
                    )}
                    {editable && protectedEntry(item) && (
                      <span
                        className="admin-icon is-held"
                        title={node.protect?.reason}
                        aria-label="This one cannot be removed"
                      >
                        ●
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="admin-item-body">
                <Field
                  node={node.element}
                  value={item}
                  onChange={(next) => replace(index, next)}
                  path={itemPath}
                  errors={errors}
                  depth={depth + 1}
                />
                {isScalar && editable && (
                  <button
                    type="button"
                    className="admin-icon admin-icon-danger"
                    aria-label={`Remove entry ${index + 1}`}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {editable && (
        <button
          type="button"
          className="admin-btn admin-btn-quiet"
          onClick={() => onChange([...items, newEntry(node.template, path)])}
        >
          Add {node.label.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

/**
 * A block: a type picker, then whatever fields that type has.
 *
 * Changing the type REPLACES the value with a blank of the new shape rather
 * than merging into it. Merging looks kinder and is not: two blocks can both
 * have a `heading` meaning entirely different things, so carrying values across
 * silently reinterprets them, and the client cannot see which fields came from
 * where. A clean swap is legible — and the previous version is one Undo away in
 * the version history, which is exactly what that history is for.
 *
 * The picker is disabled on a locked field, like every other input here, so a
 * block whose type is fixed can still have its content edited.
 */
function VariantField({
  node,
  value,
  onChange,
  path,
  errors,
  depth,
}: FieldProps & { node: VariantNode }) {
  const current =
    value && typeof value === "object"
      ? String((value as Record<string, unknown>)[node.discriminator] ?? "")
      : "";
  const option =
    node.options.find((o) => o.value === current) ?? node.options[0];

  if (!option) return null;

  return (
    <div className="admin-variant">
      <div className="admin-f admin-variant-pick">
        <label htmlFor={`${path}-type`}>{node.label || "Type"}</label>
        <select
          id={`${path}-type`}
          value={option.value}
          disabled={Boolean(node.locked)}
          onChange={(event) => {
            const next = node.options.find((o) => o.value === event.target.value);
            if (next) onChange(structuredClone(next.template));
          }}
        >
          {node.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {node.locked && (
          <p className="admin-help admin-help-lock">{node.locked}</p>
        )}
      </div>

      {/* The chosen shape, rendered as the ordinary object it is. The
          discriminator inside it is a hidden node, so it is not drawn twice. */}
      <Field
        node={option.node}
        value={value}
        onChange={onChange}
        path={path}
        errors={errors}
        depth={depth}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objects                                                             */
/* ------------------------------------------------------------------ */

function ObjectField({
  node,
  value,
  onChange,
  path,
  errors,
  depth,
}: FieldProps & { node: ObjectNode }) {
  const record = (value ?? {}) as Record<string, unknown>;

  const children = orderFields(node.fields).map(({ key, node: child }) => (
    <Field
      key={key}
      node={child}
      value={record[key]}
      onChange={(next) => onChange({ ...record, [key]: next })}
      path={path ? `${path}.${key}` : key}
      errors={errors}
      depth={depth + 1}
    />
  ));

  // The root renders its children directly; the page supplies the frame.
  if (depth === 0) return <>{children}</>;

  return (
    <fieldset className="admin-sub">
      <legend>{node.label}</legend>
      {node.description && <p className="admin-help">{node.description}</p>}
      {children}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

export function Field(props: FieldProps) {
  const { node } = props;

  // Preserved in the document, given no input. See `hideInForm`.
  if (node.hideInForm) return null;

  switch (node.kind) {
    case "hidden":
      return null;
    case "string":
      return <StringField {...props} />;
    case "number":
      return <NumberField {...props} />;
    case "boolean":
      return <BooleanField {...props} />;
    case "enum":
      return <EnumField {...props} />;
    case "image":
      return <ImageField {...props} node={node} />;
    case "array":
      return <ArrayField {...props} node={node} />;
    case "object":
      return <ObjectField {...props} node={node} />;
    case "variant":
      return <VariantField {...props} node={node} />;
    case "opaque":
      return (
        <div className="admin-f">
          <label>{node.label}</label>
          <p className="admin-help admin-help-lock">{node.reason}</p>
        </div>
      );
    default:
      return null;
  }
}

/** Renders a whole document. Top-level fields become titled sections. */
export function SchemaFields({
  tree,
  value,
  onChange,
  errors,
}: {
  tree: ObjectNode;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  errors: FieldErrors;
}) {
  const scope = useId();

  return (
    <div className="admin-form-body" data-scope={scope}>
      {orderFields(tree.fields).map(({ key, node }) => {
        if (node.kind === "hidden" || node.hideInForm) return null;

        // A leaf at the top level does not need a section of its own.
        const framed =
          node.kind === "object" || node.kind === "array" || node.kind === "image";

        const field = (
          <Field
            node={node}
            value={value[key]}
            onChange={(next) => onChange({ ...value, [key]: next })}
            path={key}
            errors={errors}
            depth={framed ? 1 : 1}
          />
        );

        return (
          <section key={key} className="admin-section">
            {field}
          </section>
        );
      })}
    </div>
  );
}
