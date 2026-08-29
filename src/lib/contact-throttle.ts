import "server-only";

import { getServiceClient } from "@/lib/supabase";

/**
 * The rate limit on the public enquiry endpoint.
 *
 * WHY THIS EXISTS. `/api/contact` was reachable by anyone, unmetered, and each
 * accepted lead starts an SMS to the client's phone carrying text the sender
 * chose. A shell loop was therefore an SMS flood, a spreadsheet fill and an
 * unbounded row count, for free. The admin login — two accounts, behind a
 * password, a CAPTCHA and a throttle — was the well-defended door; this one was
 * open.
 *
 * It reuses `login_throttle_bump` and the `login_throttle` table rather than
 * inventing a second mechanism. That function is a single-statement atomic
 * upsert with a sliding window, already granted to `service_role` only, and
 * already proven against the read-modify-write race two callers would
 * otherwise hit. Keys are namespaced (`contact-ip:`, `contact-day:`) so login
 * and contact counters can never collide.
 *
 * IT FAILS CLOSED, WHICH IS THE OPPOSITE OF THE LOGIN THROTTLE, AND
 * DELIBERATELY SO. `auth-throttle.ts` fails open because a database blip must
 * not lock the only person who can fix it out of the admin. Here the trade runs
 * the other way: a refused enquiry costs one visitor one retry, and the person
 * refused can still phone or email — both are on the page. An unmetered
 * endpoint during a database outage costs the client's phone and their bill.
 *
 * TWO WINDOWS. A short one stops a burst; a long one stops a slow drip that
 * would stay under the short limit all day. Neither is generous, because the
 * legitimate case is one person sending one enquiry.
 */

/** Short window: a burst from one address. */
const BURST_LIMIT = 5;
const BURST_WINDOW_SECONDS = 15 * 60;

/** Long window: a patient sender staying under the burst limit. */
const DAILY_LIMIT = 20;
const DAILY_WINDOW_SECONDS = 24 * 60 * 60;

/**
 * The point at which a sender has to prove they are a person.
 *
 * Below it the form asks for nothing and a first-time enquirer — the case that
 * actually matters — sees no CAPTCHA at all. This is what makes the protection
 * affordable on the site's main conversion point.
 */
const CHALLENGE_AFTER = 2;

const burstKey = (ip: string) => `contact-ip:${ip}`;
const dailyKey = (ip: string) => `contact-day:${ip}`;

export interface ContactGate {
  /** Refuse the request outright. */
  blocked: boolean;
  /** Require a solved CAPTCHA before accepting it. */
  challenge: boolean;
}

async function bump(key: string, windowSeconds: number): Promise<number | null> {
  const { data, error } = await getServiceClient().rpc("login_throttle_bump", {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (error) return null;
  return typeof data === "number" ? data : null;
}

/**
 * Count this attempt and say what the endpoint should do about it.
 *
 * Counts every attempt rather than only failures, because unlike a login there
 * is no such thing as a "wrong" enquiry — the thing being limited is volume,
 * not error rate.
 */
export async function checkContactRate(ip: string): Promise<ContactGate> {
  const [burst, daily] = await Promise.all([
    bump(burstKey(ip), BURST_WINDOW_SECONDS),
    bump(dailyKey(ip), DAILY_WINDOW_SECONDS),
  ]);

  /* Either counter failing means the count is not trustworthy. Fail closed on
     the block, and also demand a CAPTCHA, so a database problem degrades to
     "prove you are a person" rather than to "everyone is refused" — a real
     enquirer who can solve one still gets through. */
  if (burst === null || daily === null) {
    return { blocked: false, challenge: true };
  }

  if (burst > BURST_LIMIT || daily > DAILY_LIMIT) {
    return { blocked: true, challenge: true };
  }

  return { blocked: false, challenge: burst > CHALLENGE_AFTER };
}

/**
 * Whether this address would be challenged, without counting an attempt.
 *
 * The form asks this on render so it can show the widget before the visitor
 * types anything, rather than rejecting a filled-in form and asking them to do
 * it again. Read-only: it must not consume any allowance.
 */
export async function shouldChallenge(ip: string): Promise<boolean> {
  const { data, error } = await getServiceClient()
    .from("login_throttle")
    .select("key, failures, window_start")
    .in("key", [burstKey(ip), dailyKey(ip)])
    .returns<Array<{ key: string; failures: number; window_start: string }>>();

  if (error || !data) return false;

  const cutoff = Date.now() - BURST_WINDOW_SECONDS * 1000;
  for (const row of data) {
    if (row.key !== burstKey(ip)) continue;
    // An elapsed window is stale — the next attempt resets it.
    if (new Date(row.window_start).getTime() < cutoff) return false;
    return row.failures > CHALLENGE_AFTER;
  }
  return false;
}
