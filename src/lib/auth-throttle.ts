import "server-only";

import { getServiceClient } from "@/lib/supabase";

/**
 * Durable, cross-instance login throttling.
 *
 * The predecessor was a `Map` in module scope. On a serverless platform that is
 * per-instance and resets on every cold start, so it slowed a naive script
 * pointed at one warm instance and nothing else. These counts live in Postgres
 * (`public.login_throttle`), so a limit holds across every deployment instance
 * and across restarts — which is what makes it a control rather than a speed
 * bump.
 *
 * Two independent buckets per attempt:
 *   - the caller's IP, which slows a single source hammering the form; and
 *   - the target email, which slows a distributed guess at one account even when
 *     every request arrives from a fresh IP.
 *
 * FAIL OPEN on every database error. There is effectively one admin, and a
 * throttle that failed closed would turn a transient database blip into a
 * lockout of the only person who can get in — a worse failure than the brute
 * force it guards against. So a read that errors reports "not limited", and a
 * write that errors is swallowed.
 *
 * This is defence for the login *form* path. It is not the whole story: an
 * attacker who holds the publishable key can call Supabase's token endpoint
 * directly, past this entirely. Supabase's own Attack Protection (CAPTCHA) and
 * auth rate limits are what cover that, and are configured in the dashboard.
 */

const WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 12;
const EMAIL_LIMIT = 8;

function ipKey(ip: string): string {
  return `ip:${ip}`;
}

function emailKey(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

interface ThrottleRow {
  key: string;
  failures: number;
  window_start: string;
}

/** True when either the IP or the email has exceeded its limit in the window. */
export async function isRateLimited(ip: string, email: string): Promise<boolean> {
  try {
    const { data, error } = await getServiceClient()
      .from("login_throttle")
      .select("key, failures, window_start")
      .in("key", [ipKey(ip), emailKey(email)])
      .returns<ThrottleRow[]>();

    if (error || !data) return false; // fail open

    const cutoff = Date.now() - WINDOW_SECONDS * 1000;
    for (const row of data) {
      // A window that has already elapsed is stale — the next failure resets it,
      // so it does not count against the caller now.
      if (new Date(row.window_start).getTime() < cutoff) continue;
      const limit = row.key.startsWith("email:") ? EMAIL_LIMIT : IP_LIMIT;
      if (row.failures >= limit) return true;
    }
    return false;
  } catch {
    return false; // fail open
  }
}

/** Records one failed attempt against both the IP and the email buckets. */
export async function recordFailure(ip: string, email: string): Promise<void> {
  const supabase = getServiceClient();
  try {
    await Promise.all([
      supabase.rpc("login_throttle_bump", {
        p_key: ipKey(ip),
        p_window_seconds: WINDOW_SECONDS,
      }),
      supabase.rpc("login_throttle_bump", {
        p_key: emailKey(email),
        p_window_seconds: WINDOW_SECONDS,
      }),
    ]);
  } catch {
    // Best effort: failing to record a failure must not break the login flow.
  }
}

/** Clears both buckets after a successful sign-in. */
export async function clearFailures(ip: string, email: string): Promise<void> {
  try {
    await getServiceClient()
      .from("login_throttle")
      .delete()
      .in("key", [ipKey(ip), emailKey(email)]);
  } catch {
    // Non-fatal.
  }
}
