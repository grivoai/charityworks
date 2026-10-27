/**
 * Keeps the auction planner's editable wording lined up with its scoring.
 *
 * The questions and answers are worded on the Auction planner page and scored
 * in `planner-rules.ts`, and the two meet by id. What this proves:
 *
 *   - every question and answer in the scoring has wording, and nothing is
 *     worded that the scoring does not know — same count, same ids, same
 *     order — for the default wording, the seed page and, when the database
 *     is configured, the live record
 *   - wording that differs in any of those ways is refused by the schema, so
 *     neither a save nor a history restore can store it
 *   - a record saved before the field existed reads with today's wording
 *   - joining the wording on leaves every answer's scoring exactly as written
 *   - the admin form offers the words and nothing else: no add, remove or
 *     reorder on either list, ids read-only, and no scoring field at all
 *   - a save that tries to change an id is refused, and one that rewords is not
 *
 *   npm run check:planner
 * (the react-server condition lets the database client's `server-only` load.)
 */
import { DEFAULT_PLANNER_QUESTIONS } from "@/content/default-wording";
import { plannerRules } from "@/content/collections/planner-rules";
import { auctionPlannerPage } from "@/content/pages/auction-planner";
import { pageSchemas } from "@/content/schema";
import type { PlannerQuestion } from "@/content/types";
import { plannerSteps } from "@/lib/planner";
import { buildFieldTree } from "@/lib/admin/schema-tree";
import { locksForPage } from "@/lib/admin/locks";
import { coerceToTree } from "@/lib/admin/coerce";
import type { ArrayNode, FieldNode, ObjectNode } from "@/lib/admin/field-node";
import { isDatabaseConfigured } from "@/lib/content-source";
import { readPageDocument } from "@/lib/admin/page-read";

let failures = 0;
const ok = (m: string) => console.log(`  ok    ${m}`);
const fail = (m: string) => {
  failures++;
  console.error(`  FAIL  ${m}`);
};
const check = (c: boolean, m: string) => (c ? ok(m) : fail(m));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const schema = pageSchemas["auction-planner"];

/** Every way `wording` disagrees with the scoring, as sentences. */
function mismatches(wording: PlannerQuestion[]): string[] {
  const out: string[] = [];
  const want = plannerRules.map((q) => q.id).join(", ");
  const have = wording.map((q) => q.id).join(", ");
  if (want !== have) out.push(`questions are ${have}, scoring has ${want}`);
  for (const rule of plannerRules) {
    const words = wording.find((q) => q.id === rule.id);
    if (!words) continue;
    const a = rule.options.map((o) => o.id).join(", ");
    const b = words.options.map((o) => o.id).join(", ");
    if (a !== b) out.push(`"${rule.id}" answers are ${b}, scoring has ${a}`);
  }
  return out;
}

function matchesScoring(label: string, wording: PlannerQuestion[]): void {
  const problems = mismatches(wording);
  const answers = wording.reduce((n, q) => n + q.options.length, 0);
  check(
    problems.length === 0,
    problems.length
      ? `${label}: ${problems.join("; ")}`
      : `${label}: ${wording.length} questions and ${answers} answers, each matching the scoring`
  );
}

function shapes(): void {
  console.log("\nWording against scoring");
  matchesScoring("default wording", DEFAULT_PLANNER_QUESTIONS);
  const seed = schema.safeParse(auctionPlannerPage);
  check(seed.success, "the seed page parses");
  if (seed.success) matchesScoring("seed page", seed.data.questions);

  const withoutField = clone(auctionPlannerPage) as Record<string, unknown>;
  delete withoutField.questions;
  const old = schema.safeParse(withoutField);
  check(
    old.success &&
      JSON.stringify(old.data.questions) === JSON.stringify(DEFAULT_PLANNER_QUESTIONS),
    "a record saved before the field existed reads with today's wording"
  );
}

function refusals(): void {
  console.log("\nWording that does not match is refused");
  const base = () => clone(auctionPlannerPage) as { questions: PlannerQuestion[] };
  const cases: Array<[string, (doc: { questions: PlannerQuestion[] }) => void]> = [
    ["a question removed", (d) => void d.questions.pop()],
    ["a question added", (d) => void d.questions.push(clone(d.questions[0]))],
    ["two questions swapped", (d) => void d.questions.reverse()],
    ["an answer removed", (d) => void d.questions[2].options.pop()],
    [
      "an answer added",
      (d) =>
        void d.questions[2].options.push({
          id: "hybrid",
          label: "Hybrid",
          summaryLabel: "Hybrid",
        }),
    ],
    ["two answers swapped", (d) => void d.questions[2].options.reverse()],
    ["an answer's id changed", (d) => void (d.questions[2].options[0].id = "in-person")],
  ];
  for (const [name, mutate] of cases) {
    const doc = base();
    mutate(doc);
    check(!schema.safeParse(doc).success, `${name}: refused`);
  }

  const reworded = base();
  reworded.questions[2].prompt = "How will the bidding work?";
  reworded.questions[2].options[0].label = "Live, with an auctioneer";
  reworded.questions[2].help = undefined;
  const result = schema.safeParse(reworded);
  check(
    result.success && result.data.questions[2].prompt === "How will the bidding work?",
    "rewording a question, an answer and clearing a help line: accepted"
  );
}

function scoring(): void {
  console.log("\nScoring is untouched by the wording");
  const reworded = clone(DEFAULT_PLANNER_QUESTIONS);
  for (const q of reworded) {
    q.prompt = `Reworded ${q.id}`;
    for (const o of q.options) o.label = `Reworded ${o.id}`;
  }
  const steps = plannerSteps(reworded);
  const same = steps.every((step, i) => {
    const rule = plannerRules[i];
    return (
      step.id === rule.id &&
      step.maxChoices === rule.maxChoices &&
      step.options.every(
        (o, j) =>
          o.id === rule.options[j].id &&
          JSON.stringify(o.weights) === JSON.stringify(rule.options[j].weights) &&
          o.exclusive === rule.options[j].exclusive &&
          o.label === `Reworded ${o.id}`
      )
    );
  });
  check(same, "every answer keeps its weights and choice rules, with the new words on it");
}

/** The node at a dotted path, stepping into array elements on `*`. */
function at(tree: ObjectNode, path: string): FieldNode | undefined {
  let node: FieldNode | undefined = tree;
  for (const key of path.split(".")) {
    if (!node) return undefined;
    if (key === "*") node = node.kind === "array" ? node.element : undefined;
    else node = node.kind === "object" ? node.fields.find((f) => f.key === key)?.node : undefined;
  }
  return node;
}

function form(): void {
  console.log("\nThe admin form");
  const tree = buildFieldTree(schema, locksForPage("auction-planner"));
  for (const path of ["questions", "questions.*.options"]) {
    const node = at(tree, path) as ArrayNode | undefined;
    check(
      node?.kind === "array" && Boolean(node.fixedLength) && Boolean(node.fixedOrder),
      `${path}: no add, remove or reorder`
    );
  }
  for (const path of ["questions.*.id", "questions.*.options.*.id"]) {
    check(Boolean(at(tree, path)?.locked), `${path}: read-only`);
  }
  for (const path of [
    "questions.*.prompt",
    "questions.*.help",
    "questions.*.options.*.label",
    "questions.*.options.*.summaryLabel",
  ]) {
    const node = at(tree, path);
    check(Boolean(node) && !node?.locked, `${path}: editable`);
  }
  for (const path of [
    "questions.*.maxChoices",
    "questions.*.options.*.weights",
    "questions.*.options.*.exclusive",
  ]) {
    check(!at(tree, path), `${path}: not in the form`);
  }

  /* Through the save's own path: rebuild against the form, then validate. A
     changed id matches no stored entry, so the lock has nothing to restore it
     from; the schema is what turns the save away. */
  const save = (mutate: (doc: typeof auctionPlannerPage) => void) => {
    const submitted = clone(auctionPlannerPage);
    mutate(submitted);
    return schema.safeParse(coerceToTree(submitted, tree, clone(auctionPlannerPage)));
  };
  check(
    !save((d) => void (d.questions[2].id = "eventType")).success,
    "a save that changes a question id is refused"
  );
  check(
    !save((d) => void (d.questions[2].options[0].id = "in-person")).success,
    "a save that changes an answer id is refused"
  );
  const reworded = save((d) => void (d.questions[2].prompt = "How will the bidding work?"));
  check(
    reworded.success && reworded.data.questions[2].prompt === "How will the bidding work?",
    "a save that only rewords goes through with the new wording"
  );
}

async function live(): Promise<void> {
  console.log("\nThe live record");
  if (!isDatabaseConfigured()) {
    console.log("  skip  no database configured");
    return;
  }
  const stored = await readPageDocument("auction-planner");
  const parsed = schema.safeParse(stored);
  check(parsed.success, "the stored planner page parses");
  if (!parsed.success) return;
  matchesScoring("live record", parsed.data.questions);
  const isStored = Boolean(stored && typeof stored === "object" && "questions" in stored);
  console.log(
    `  info  ${isStored ? "the wording is stored on the page" : "no stored wording yet — the page reads the defaults"}`
  );
}

async function main() {
  console.log("Auction planner: wording against scoring");
  shapes();
  refusals();
  scoring();
  form();
  await live();
  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nPLANNER OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
