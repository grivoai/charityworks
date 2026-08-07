"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  fileProblem,
  formatBytes,
  slugProblem,
  suggestSlug,
  titleProblem,
} from "@/lib/admin/document-rules";
import {
  createDocument,
  deleteDocumentLink,
  deleteUpload,
  renameDocument,
  repointDocument,
  replaceDocumentFile,
  signUpload,
  type DocumentResult,
} from "@/lib/admin/document-actions";

/**
 * The documents page, in the browser.
 *
 * A client component because the upload does not go through this application at
 * all: the file is PUT straight at Supabase Storage, which means the sequence is
 * ask-the-server-for-a-URL, transfer, tell-the-server-it-landed. A form action
 * cannot straddle a transfer, and a transfer that can take a minute needs to be
 * able to say how far along it is.
 *
 * Everything that decides anything still happens on the server. This file
 * refuses the obvious cases early so that a 40 MB file is refused in the same
 * second it is chosen rather than after four minutes of uploading — the same
 * rules, imported from the same module the server uses.
 */

/**
 * Dates arrive already worded.
 *
 * A function cannot cross the server/client boundary, and duplicating
 * `formatWhen` here would be a second definition of "3 days ago" that could
 * disagree with the one every other admin page uses.
 */
export interface DocumentFileView {
  id: string;
  filename: string;
  bytes: number;
  uploadedLabel: string;
  uploadedBy: string | null;
  /** Slugs currently pointing at this file. */
  usedBy: string[];
}

export interface DocumentLinkView {
  slug: string;
  title: string;
  updatedLabel: string;
  file: DocumentFileView | null;
}

interface Props {
  links: DocumentLinkView[];
  files: DocumentFileView[];
}

/* ------------------------------------------------------------------ */
/* The transfer                                                        */
/* ------------------------------------------------------------------ */

/** What Supabase said, turned into something worth reading. */
function storageError(xhr: XMLHttpRequest): string {
  if (xhr.status === 413) {
    return "That file is larger than the 25 MB limit.";
  }
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string };
    if (body.message) return `The upload was refused: ${body.message}`;
  } catch {
    /* not JSON; fall through */
  }
  return `The upload failed (${xhr.status || "no response"}). Please try again.`;
}

/**
 * PUT with a progress figure.
 *
 * `fetch` cannot report upload progress, and this is the one place in the admin
 * where something takes long enough that a spinner alone would read as a hang.
 */
function putFile(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Declared rather than taken from the file: the extension has already been
    // checked, the server sniffs the bytes regardless, and some systems report
    // no type at all for a PDF — which the bucket would then refuse for a
    // reason that has nothing to do with the file.
    xhr.setRequestHeader("content-type", "application/pdf");
    // The path is a UUID that is never reused for different bytes, so the
    // object can be cached at the CDN indefinitely. /d/<slug> is what moves.
    xhr.setRequestHeader("cache-control", "max-age=31536000");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(storageError(xhr)));
    xhr.onerror = () =>
      reject(new Error("The connection dropped during the upload."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));

    xhr.send(file);
  });
}

/* ------------------------------------------------------------------ */
/* Copying an address                                                  */
/* ------------------------------------------------------------------ */

function CopyLink({ slug }: { slug: string }) {
  /**
   * The origin is read after mount rather than rendered on the server.
   *
   * `siteUrl` is the canonical domain, which today still serves the client's
   * old site — copying a link built from it would hand out an address that does
   * not resolve yet. The origin actually being browsed always does.
   */
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const href = `/d/${slug}`;
  const full = origin ? `${origin}${href}` : href;

  return (
    <span className="admin-doc-address">
      <a href={href} target="_blank" rel="noreferrer">
        {full}
      </a>
      <button
        type="button"
        className="admin-icon"
        title="Copy this address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Add                                                                 */
/* ------------------------------------------------------------------ */

function AddDocument({
  onStart,
  onDone,
}: {
  onStart: () => void;
  onDone: (result: DocumentResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const busy = percent !== null;

  const reset = () => {
    setFile(null);
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setPercent(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const chooseFile = (chosen: File | null) => {
    setProblem(chosen ? fileProblem(chosen.name, chosen.size) : null);
    setFile(chosen);
    // The filename is the best guess at both, and both stay editable.
    if (chosen && !title) {
      const stem = chosen.name.replace(/\.pdf$/i, "");
      setTitle(stem);
      if (!slugTouched) setSlug(suggestSlug(stem));
    }
  };

  const submit = async () => {
    if (!file) return setProblem("Choose a PDF first.");
    // Clears whatever the last action said. A "Saved." from a minute ago
    // sitting above an upload in progress is a sentence about the wrong thing.
    onStart();

    const bad =
      fileProblem(file.name, file.size) ?? titleProblem(title) ?? slugProblem(slug);
    if (bad) return setProblem(bad);

    setProblem(null);
    setPercent(0);

    const signed = await signUpload(file.name);
    if (!signed.ok) {
      setPercent(null);
      return setProblem(signed.message);
    }

    try {
      await putFile(signed.signedUrl, file, setPercent);
    } catch (error) {
      setPercent(null);
      return setProblem((error as Error).message);
    }

    const result = await createDocument({
      path: signed.path,
      filename: file.name,
      title,
      slug,
    });

    setPercent(null);
    if (!result.ok) return setProblem(result.message);
    reset();
    onDone(result);
  };

  return (
    <section className="admin-doc-add">
      <h2>Add a document</h2>
      <p className="admin-help">
        A PDF, up to 25 MB. You get back an address that keeps working when you
        replace the file behind it, so the same link can go in every newsletter.
      </p>

      <div className="admin-doc-add-grid">
        <div className="admin-f">
          <label htmlFor="doc-file">PDF file</label>
          <input
            id="doc-file"
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          {file && !problem && (
            <p className="admin-help">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        <div className="admin-f">
          <label htmlFor="doc-title">Name</label>
          <input
            id="doc-title"
            type="text"
            value={title}
            disabled={busy}
            placeholder="Spring Newsletter"
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(suggestSlug(event.target.value));
            }}
          />
          <p className="admin-help">What this is called in the list below.</p>
        </div>

        <div className="admin-f">
          <label htmlFor="doc-slug">Address</label>
          <span className="admin-doc-slug">
            <span aria-hidden="true">/d/</span>
            <input
              id="doc-slug"
              type="text"
              value={slug}
              disabled={busy}
              placeholder="spring-newsletter"
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
            />
          </span>
          <p className="admin-help">
            Choose carefully — this is the part people will have. It cannot be
            changed afterwards without breaking every copy already sent.
          </p>
        </div>
      </div>

      {problem && (
        <p className="admin-banner is-bad" role="alert">
          {problem}
        </p>
      )}

      {busy && (
        <div className="admin-doc-progress" role="status">
          <div className="admin-doc-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span>
            {percent === 100
              ? "Checking the file…"
              : `Uploading — ${percent}%`}
          </span>
        </div>
      )}

      <button
        type="button"
        className="admin-btn admin-btn-primary"
        disabled={busy || !file}
        onClick={submit}
      >
        {busy ? "Uploading…" : "Add document"}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* One link                                                            */
/* ------------------------------------------------------------------ */

function LinkRow({
  link,
  onStart,
  onDone,
}: {
  link: DocumentLinkView;
  onStart: () => void;
  onDone: (result: DocumentResult) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [percent, setPercent] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);

  const busy = percent !== null;

  const replace = async (file: File) => {
    const bad = fileProblem(file.name, file.size);
    if (bad) return setProblem(bad);
    onStart();

    setProblem(null);
    setPercent(0);

    const signed = await signUpload(file.name);
    if (!signed.ok) {
      setPercent(null);
      return setProblem(signed.message);
    }

    try {
      await putFile(signed.signedUrl, file, setPercent);
    } catch (error) {
      setPercent(null);
      return setProblem((error as Error).message);
    }

    const result = await replaceDocumentFile({
      slug: link.slug,
      path: signed.path,
      filename: file.name,
    });

    setPercent(null);
    if (replaceInput.current) replaceInput.current.value = "";
    if (!result.ok) return setProblem(result.message);
    onDone(result);
  };

  return (
    <li className="admin-doc">
      <div className="admin-doc-head">
        {renaming ? (
          <span className="admin-doc-rename">
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
            />
            <button
              type="button"
              className="admin-btn"
              onClick={async () => {
                onStart();
                const result = await renameDocument({ slug: link.slug, title });
                if (!result.ok) return setProblem(result.message);
                setProblem(null);
                setRenaming(false);
                onDone(result);
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setTitle(link.title);
                setRenaming(false);
              }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <>
            <span className="admin-doc-title">{link.title}</span>
            <span className="admin-doc-when">Updated {link.updatedLabel}</span>
          </>
        )}
      </div>

      <CopyLink slug={link.slug} />

      <p className="admin-doc-file">
        {link.file ? (
          <>
            {link.file.filename} · {formatBytes(link.file.bytes)} · uploaded{" "}
            {link.file.uploadedLabel}
          </>
        ) : (
          <span className="admin-doc-missing">
            The file behind this link is missing. Replace it to make the address
            work again.
          </span>
        )}
      </p>

      {problem && (
        <p className="admin-banner is-bad" role="alert">
          {problem}
        </p>
      )}

      {busy && (
        <div className="admin-doc-progress" role="status">
          <div className="admin-doc-bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <span>
            {percent === 100 ? "Checking the file…" : `Uploading — ${percent}%`}
          </span>
        </div>
      )}

      <div className="admin-doc-tools">
        <input
          ref={replaceInput}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void replace(file);
          }}
        />
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={() => replaceInput.current?.click()}
        >
          Replace file
        </button>
        {!renaming && (
          <button
            type="button"
            className="admin-btn"
            disabled={busy}
            onClick={() => setRenaming(true)}
          >
            Rename
          </button>
        )}
        {confirming ? (
          <>
            <span className="admin-doc-confirm">
              Everyone who has this address will get a &ldquo;page not
              found&rdquo;. The file stays.
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={async () => {
                onStart();
                const result = await deleteDocumentLink(link.slug);
                setConfirming(false);
                if (!result.ok) return setProblem(result.message);
                onDone(result);
              }}
            >
              Remove it
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setConfirming(false)}
            >
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Remove link
          </button>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* One file                                                            */
/* ------------------------------------------------------------------ */

function FileRow({
  file,
  links,
  onStart,
  onDone,
}: {
  file: DocumentFileView;
  links: DocumentLinkView[];
  onStart: () => void;
  onDone: (result: DocumentResult) => void;
}) {
  const [target, setTarget] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="admin-doc-file-row">
      <span className="admin-doc-file-main">
        <span className="admin-doc-file-name">{file.filename}</span>
        <span className="admin-doc-file-sub">
          {formatBytes(file.bytes)} · uploaded {file.uploadedLabel}
          {file.uploadedBy ? ` by ${file.uploadedBy}` : ""}
        </span>
        {problem && <span className="admin-doc-file-problem">{problem}</span>}
      </span>

      <span className="admin-doc-file-tools">
        {links.length > 0 && (
          <>
            <select
              value={target}
              aria-label={`Point a link at ${file.filename}`}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option value="">Point a link here…</option>
              {links.map((link) => (
                <option key={link.slug} value={link.slug}>
                  /d/{link.slug}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="admin-btn"
              disabled={!target}
              onClick={async () => {
                onStart();
                const result = await repointDocument({
                  slug: target,
                  uploadId: file.id,
                });
                if (!result.ok) return setProblem(result.message);
                setProblem(null);
                setTarget("");
                onDone(result);
              }}
            >
              Use this file
            </button>
          </>
        )}

        {confirming ? (
          <>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={async () => {
                onStart();
                const result = await deleteUpload(file.id);
                setConfirming(false);
                if (!result.ok) return setProblem(result.message);
                setProblem(null);
                onDone(result);
              }}
            >
              Delete for good
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </span>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export function DocumentLibrary({ links, files }: Props) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);

  /** A new action begins: whatever the last one said no longer applies. */
  const start = () => setNote(null);

  const done = (result: DocumentResult) => {
    if (!result.ok) return;
    setNote(result.note ?? "Saved.");
    // The server component holds the list; re-reading it is what makes the
    // change visible, rather than a second copy of the data kept in step here.
    router.refresh();
  };

  const spare = files.filter((file) => file.usedBy.length === 0);

  return (
    <>
      {note && (
        <p className="admin-banner is-good" role="status">
          {note}
        </p>
      )}

      <AddDocument onStart={start} onDone={done} />

      <section className="admin-doc-section">
        <h2>
          Links{" "}
          <span className="admin-count-inline">
            {links.length === 0
              ? "none yet"
              : `${links.length} address${links.length === 1 ? "" : "es"}`}
          </span>
        </h2>

        {links.length === 0 ? (
          <div className="admin-empty">
            No links yet. Add a document above and you will get an address you
            can put in an email.
          </div>
        ) : (
          <ul className="admin-docs">
            {links.map((link) => (
              <LinkRow key={link.slug} link={link} onStart={start} onDone={done} />
            ))}
          </ul>
        )}
      </section>

      {spare.length > 0 && (
        <section className="admin-doc-section">
          <h2>
            Files with no link{" "}
            <span className="admin-count-inline">{spare.length}</span>
          </h2>
          <p className="admin-help">
            Older versions replaced by a newer file, and anything uploaded but
            not yet linked. Nothing is deleted by replacing a file, so pointing a
            link back at one of these is how you undo a replacement.
          </p>
          <ul className="admin-doc-files">
            {spare.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                links={links}
                onStart={start}
                onDone={done}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
