import type { $ZodIssue } from "zod/v4/core";

import type { FieldErrors } from "@/lib/admin/field-node";

/**
 * Zod issues, turned into something a person can act on.
 *
 * Lifted out of `page-actions.ts` when the site settings editor needed the same
 * translation. It could not simply be imported from there: that file is
 * `"use server"`, and such a module may only export async functions, so a
 * synchronous helper inside it is unreachable from anywhere else. Copying it
 * would have left two lists of error wordings to keep in step, which is how
 * "Enter a valid email address" becomes two slightly different sentences
 * depending on which form you are looking at.
 */
export function humanizeIssue(issue: $ZodIssue): string {
  if (issue.code === "too_small") {
    return issue.origin === "string"
      ? "This cannot be left empty."
      : `Too small — the smallest allowed is ${String(issue.minimum)}.`;
  }
  if (issue.code === "too_big") {
    return issue.origin === "string"
      ? "This is too long."
      : `Too large — the largest allowed is ${String(issue.maximum)}.`;
  }
  if (issue.code === "invalid_type") {
    if (issue.expected === "number") return "Enter a number.";
    return "This cannot be left empty.";
  }
  if (issue.code === "invalid_format") {
    const format = (issue as { format?: string }).format;
    if (format === "email") return "Enter a valid email address.";
    if (format === "url") return "Enter a full web address, starting with https://";
  }
  return issue.message;
}

export function toFieldErrors(issues: readonly $ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    // First issue per field wins; a field with two complaints only needs one.
    if (!(key in errors)) errors[key] = humanizeIssue(issue);
  }
  return errors;
}
