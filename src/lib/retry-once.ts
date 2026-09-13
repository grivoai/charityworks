/**
 * One more attempt, and only when the failure was the infrastructure's.
 *
 * Supabase's gateway occasionally answers an ordinary request with a 504
 * after five seconds and the same request a moment later with a row. On the
 * auth path that read as "not signed in": the middleware bounced the admin to
 * the login page, `getAdmin()` did the same from inside the page, and the MFA
 * gate read it as "no code owed", which is the wrong way round for a gate.
 *
 * This is deliberately smaller than `readWithRetry`. That one runs at build
 * time and in editors, where a few seconds of patience is cheap. This runs on
 * EVERY admin request, three times over, so it retries once, briefly, and only
 * when the caller's predicate says the failure was transient — a 5xx or a
 * dropped connection — never for a 401, an expired session or a missing row,
 * which come back exactly as fast as they did before. On the ordinary path the
 * cost is one predicate call; there is no added wait.
 *
 * Not `server-only`, because the middleware needs it and runs on the edge.
 */
const RETRY_AFTER_MS = 250;

export async function retryOnce<R>(
  run: () => PromiseLike<R>,
  transient: (result: R) => boolean
): Promise<R> {
  const first = await run();
  if (!transient(first)) return first;
  await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
  return run();
}
