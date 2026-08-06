/**
 * Proves the preview column's element-to-field map is complete and correct.
 *
 * The markers that connect a rendered heading to the field that sets it are
 * applied by hand, one at a time, across nine routes and ten components. Hand
 * work rots in two directions, and both are silent:
 *
 *   1. A field nobody marked. The client looks at the sentence they want to
 *      change, clicks it, and nothing happens. Nothing is broken, nothing is
 *      logged, and the feature simply looks unreliable.
 *
 *   2. A marker whose path no longer exists. Rename a field in the schema and
 *      the form follows automatically — it is derived — but the marker still
 *      says the old name and now points at nothing.
 *
 * So this checks both directions: every editable field is either marked or
 * listed as not visible with a reason, and every marker resolves to a real
 * field. Neither half is worth much without the other.
 *
 * Needs the site running, because it reads the rendered HTML rather than
 * guessing at it from the source.
 *
 *   npm run dev
 *   npm run check:visual
 */

import { pageSchemas } from "@/content/schema";
import type { PageSlug } from "@/content/types";
import type { FieldNode } from "@/lib/admin/field-node";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForPage } from "@/lib/admin/locks";
import { PAGE_ORDER, PAGE_PATHS } from "@/lib/admin/page-meta";
import {
  MARKED_UP,
  normalizeIndices,
  notVisibleReason,
  parseMark,
} from "@/lib/admin/visual-map";

const BASE = process.env.BASE ?? "http://localhost:3000";

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  FAIL  ${message}`);
}

/**
 * Every field a person could edit, as a pattern rather than a concrete path.
 *
 * `faqs.*.question`, not `faqs.0.question` … `faqs.8.question`. One marker in a
 * `.map` covers the whole list by construction, and the number of entries on
 * the live site is not the number in the repository once the client starts
 * adding them.
 */
function leafPatterns(node: FieldNode, path: string, out: string[]): void {
  switch (node.kind) {
    case "object":
      for (const { key, node: child } of node.fields) {
        leafPatterns(child, path ? `${path}.${key}` : key, out);
      }
      break;
    case "array":
      leafPatterns(node.element, `${path}.*`, out);
      break;
    case "hidden":
      break;
    case "opaque":
      // Not editable in the form either; check:admin is what fails on these.
      break;
    default:
      // Structural values (an entry's id) are carried through saves, never
      // shown, and so are never on the page to be clicked.
      if (!node.hideInForm) out.push(path);
  }
}

function nodeAt(node: FieldNode, segments: string[]): FieldNode | null {
  if (segments.length === 0) return node;
  const [head, ...rest] = segments;

  if (node.kind === "object") {
    const found = node.fields.find((f) => f.key === head);
    return found ? nodeAt(found.node, rest) : null;
  }
  if (node.kind === "array" && head === "*") return nodeAt(node.element, rest);
  return null;
}

/** Every `data-cw` value in a rendered page, in document order. */
function marksIn(html: string): string[] {
  return [...html.matchAll(/data-cw="([^"]*)"/g)].map((m) => m[1]);
}

async function fetchPage(path: string): Promise<string> {
  // `connection: close` so the socket is not held open in a keep-alive pool.
  // A pooled socket keeps Node's event loop alive, and forcing the exit past it
  // with process.exit() trips a libuv assertion on Windows that replaces this
  // script's exit code with its own. A check whose exit code cannot be trusted
  // is not a check, so the process is left to end on its own instead.
  const response = await fetch(`${BASE}${path}`, {
    headers: { connection: "close" },
  });
  if (!response.ok) {
    throw new Error(`${BASE}${path} returned ${response.status}`);
  }
  return response.text();
}

async function main(): Promise<void> {
  console.log(`Checking the preview's element-to-field map against ${BASE}\n`);

  const trees = new Map<PageSlug, FieldNode>();
  for (const slug of PAGE_ORDER) {
    trees.set(slug, buildFieldTree(pageSchemas[slug], locksForPage(slug)));
  }

  let totalMarked = 0;

  for (const slug of MARKED_UP) {
    const tree = trees.get(slug)!;

    const expected: string[] = [];
    leafPatterns(tree, "", expected);

    let html: string;
    try {
      html = await fetchPage(PAGE_PATHS[slug]);
    } catch (error) {
      fail(`${slug}: could not read the rendered page — ${(error as Error).message}`);
      console.error(
        "\n  The site has to be running for this check. Start it with `npm run dev`.\n"
      );
      process.exitCode = 1;
      return;
    }

    const marks = marksIn(html);
    const marked = new Set(marks.map((m) => normalizeIndices(parseMark(m).path)));

    /* 1. Every editable field is either on the page, or explained. */
    const unexplained: string[] = [];
    let reachable = 0;
    let explained = 0;

    for (const pattern of expected) {
      if (marked.has(pattern)) {
        reachable += 1;
      } else if (notVisibleReason(slug, pattern)) {
        explained += 1;
      } else {
        unexplained.push(pattern);
      }
    }

    for (const pattern of unexplained) {
      fail(
        `${slug}: "${pattern}" is editable but nothing on the page is marked with it — ` +
          `mark the element, or add it to PAGE_NOT_VISIBLE with a reason`
      );
    }

    /* 2. Every marker points at a field that exists. */
    for (const mark of new Set(marks)) {
      const { record, path } = parseMark(mark);
      const target = record ? trees.get(record as PageSlug) : tree;

      if (record && !target) {
        fail(`${slug}: marker "${mark}" names a page that does not exist`);
        continue;
      }

      const found = nodeAt(target!, normalizeIndices(path).split("."));
      if (!found) {
        fail(`${slug}: marker "${mark}" does not match any field in the schema`);
      } else if (found.kind === "object" || found.kind === "array") {
        fail(
          `${slug}: marker "${mark}" points at a whole ${found.kind}, not a single ` +
            `field — mark the innermost element instead`
        );
      }
    }

    totalMarked += reachable;
    const clean = unexplained.length === 0;
    console.log(
      `  ${clean ? "ok  " : "FAIL"}  ${slug.padEnd(16)} ` +
        `${String(reachable).padStart(3)} clickable, ` +
        `${String(explained).padStart(2)} not on the page, ` +
        `${marks.length} markers rendered`
    );
  }

  /* Pages still to do. Not a failure — a rollout, one page at a time. */
  const remaining = PAGE_ORDER.filter((slug) => !MARKED_UP.includes(slug));
  if (remaining.length > 0) {
    console.log(
      `\n  Not marked up yet: ${remaining.join(", ")}` +
        `\n  (add each to MARKED_UP in src/lib/admin/visual-map.ts as it is done)`
    );
  }

  console.log(`\n  ${totalMarked} fields clickable on the live site`);

  if (failures > 0) {
    console.error(`\n  ${failures} check(s) failed\n`);
    process.exitCode = 1;
    return;
  }
  console.log("  All checks passed\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
