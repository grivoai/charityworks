"use client";

/**
 * The browser's half of an upload: a PUT to a URL the server signed.
 *
 * One definition, used by the documents page and by the photograph field. Both
 * transfer a file the same way and both need to say how far along it is, and two
 * copies of an XHR wrapper is two places for a progress bar to stop moving.
 */

/** What Supabase said, turned into something worth reading. */
function storageError(xhr: XMLHttpRequest, tooLarge: string): string {
  if (xhr.status === 413) return tooLarge;
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string };
    if (body.message) return `The upload was refused: ${body.message}`;
  } catch {
    /* not JSON; fall through */
  }
  return `The upload failed (${xhr.status || "no response"}). Please try again.`;
}

export interface TransferOptions {
  /** Declared to storage. Sent explicitly rather than taken from the file. */
  contentType: string;
  /** The message for a 413, which is the one refusal worth wording per file type. */
  tooLarge: string;
  onProgress: (percent: number) => void;
}

/**
 * PUT with a progress figure.
 *
 * `fetch` cannot report upload progress, and these are the only places in the
 * admin where something takes long enough that a spinner alone would read as a
 * hang.
 */
export function putFile(
  url: string,
  file: File,
  { contentType, tooLarge, onProgress }: TransferOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    // The path is a UUID that is never reused for different bytes, so the
    // object can be cached at the CDN indefinitely.
    xhr.setRequestHeader("cache-control", "max-age=31536000");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(storageError(xhr, tooLarge)));
    xhr.onerror = () =>
      reject(new Error("The connection dropped during the upload."));
    xhr.onabort = () => reject(new Error("The upload was cancelled."));

    xhr.send(file);
  });
}
