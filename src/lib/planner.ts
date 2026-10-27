import {
  PLANNER_PICK_COUNT,
  PLANNER_TIE_BREAK,
  plannerRules,
} from "@/content/collections/planner-rules";
import type {
  PlannerOption,
  PlannerQuestion,
  PlannerQuestionId,
  PlannerRule,
  PlannerRuleOption,
} from "@/content/types";

/**
 * The auction planner's scoring.
 *
 * Deliberately dull: it adds up the weights in `planner-rules.ts` and sorts.
 * All the judgement lives in that table as data, so what the tool recommends
 * can be reviewed and changed without reading any logic — and the same answers
 * always produce the same result. The page's wording plays no part in the
 * score; `plannerSteps` joins it on by id, for display only.
 *
 * Client-safe. It reads the rules and nothing else, so the wizard can score in
 * the browser and show results with no round trip.
 */

/** Selected option ids, keyed by question. Multi-select questions hold several. */
export type PlannerAnswers = Partial<Record<PlannerQuestionId, string[]>>;

/** One question as the wizard draws it: the page's wording on the scoring's rule. */
export type PlannerStep = Omit<PlannerRule, "options"> &
  Pick<PlannerQuestion, "prompt" | "help"> & {
    options: Array<PlannerRuleOption & PlannerOption>;
  };

/**
 * Puts the page's wording onto the scoring, question by question and answer by
 * answer, in the scoring's order.
 *
 * Matched by id. The schema has already refused wording that does not line up
 * with the rules, so a miss here means a document that skipped validation —
 * worth failing on rather than drawing a question with no words.
 */
export function plannerSteps(wording: PlannerQuestion[]): PlannerStep[] {
  return plannerRules.map((rule) => {
    const words = wording.find((q) => q.id === rule.id);
    if (!words) throw new Error(`Auction planner: no wording for question "${rule.id}".`);
    return {
      ...rule,
      prompt: words.prompt,
      help: words.help,
      options: rule.options.map((option) => {
        const label = words.options.find((o) => o.id === option.id);
        if (!label) {
          throw new Error(
            `Auction planner: no wording for answer "${option.id}" of "${rule.id}".`
          );
        }
        return { ...option, ...label };
      }),
    };
  });
}

/**
 * Rank every scoring category, best first.
 *
 * Unknown option ids are ignored rather than rejected: answers arrive from a
 * query string on the way to the contact form, and a stale or hand-edited link
 * should degrade to a weaker recommendation, not an error page.
 */
export function rankCategories(answers: PlannerAnswers): string[] {
  const scores = new Map<string, number>();
  for (const id of PLANNER_TIE_BREAK) scores.set(id, 0);

  for (const question of plannerRules) {
    const chosen = answers[question.id] ?? [];
    for (const optionId of chosen) {
      const option = question.options.find((o) => o.id === optionId);
      if (!option?.weights) continue;

      for (const [categoryId, points] of Object.entries(option.weights)) {
        // Only categories in the tie-break list score. A weight naming anything
        // else is a content bug, and silently inventing a category here would
        // hide it.
        if (!scores.has(categoryId)) continue;
        scores.set(categoryId, (scores.get(categoryId) ?? 0) + points);
      }
    }
  }

  const order = new Map<string, number>(
    PLANNER_TIE_BREAK.map((id, index) => [id, index])
  );

  return [...scores.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0);
    })
    .map(([id]) => id);
}

/** The categories the results screen shows. */
export function recommendCategories(answers: PlannerAnswers): string[] {
  return rankCategories(answers).slice(0, PLANNER_PICK_COUNT);
}

/**
 * Turn answers into the query string that carries them to the contact form.
 *
 * These are the `quiz*` keys `/api/contact` already accepts, so a planner lead
 * needs no new endpoint and no change to the webhook payload.
 */
export function buildContactQuery(
  answers: PlannerAnswers,
  recommended: string[]
): string {
  const params = new URLSearchParams({ source: "quiz" });

  const add = (key: string, value: string) => {
    if (value) params.set(key, value);
  };

  add("quizEventType", (answers.eventType ?? []).join(","));
  add("quizAttendance", (answers.attendance ?? []).join(","));
  add("quizFormat", (answers.format ?? []).join(","));
  add("quizPriceBand", (answers.priceBand ?? []).join(","));
  add("quizInterests", (answers.interests ?? []).join(","));
  add("quizRecommended", recommended.join(","));

  return params.toString();
}
