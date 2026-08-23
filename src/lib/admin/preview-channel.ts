/**
 * The two messages the preview panel and the preview frame send each other.
 *
 * One file rather than two string literals, because `postMessage` has no
 * contract of its own: a typo in either half produces silence, not an error,
 * and silence looks exactly like a preview that has not finished loading.
 *
 * The protocol is deliberately one-way in effect. The frame says only that it
 * exists; the panel sends only data. Nothing here asks the other side to DO
 * anything, so a message arriving from somewhere unexpected can be ignored
 * without having to reason about what it might have triggered. Both ends check
 * the origin as well.
 */

/** Names our messages, so other libraries' `postMessage` traffic is skipped. */
export const PREVIEW_CHANNEL = "cw-preview";

export type PreviewMessage =
  /** Frame → panel: hydrated and listening; send what you have. */
  | { channel: typeof PREVIEW_CHANNEL; type: "ready" }
  /** Panel → frame: the editor's current contents, as submitted JSON. */
  | { channel: typeof PREVIEW_CHANNEL; type: "draft"; data: string };
