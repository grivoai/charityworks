import {
  PLANNER_PICK_COUNT,
  PLANNER_TIE_BREAK,
  plannerQuestions,
} from "@/content/collections/planner-rules";
import type { PlannerQuestionId } from "@/content/types";

/**
 * The auction planner's scoring.
 *
 * Deliberately dull: it adds up the weights in `planner-rules.ts` and sorts.
 * All the judgement lives in that table as data, so what the tool recommends
 * can be reviewed and changed without reading any logic — and the same answers
 * always produce the same result.
 *
 * Client-safe. It reads the rules and nothing else, so the wizard can score in
 * the browser and show results with no round trip.
 */

/** Selected option ids, keyed by question. Multi-select questions hold several. */
export type PlannerAnswers = Partial<Record<PlannerQuestionId, string[]>>;

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

  for (const question of plannerQuestions) {
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
