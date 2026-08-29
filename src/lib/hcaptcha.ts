import "server-only";

/**
 * Server-side hCaptcha verification for the public enquiry form.
 *
 * WHY THIS FILE EXISTS AT ALL, GIVEN THE ADMIN LOGIN ALREADY USES hCAPTCHA.
 * The login never verifies anything itself: it hands the token to
 * `signInWithPassword` and *Supabase* checks it, using the secret stored in
 * Supabase's own Auth settings. There is no Supabase auth call on the enquiry
 * path, so nothing would check the token unless this does. Without server-side
 * verification a CAPTCHA field is decorative — anyone posting the endpoint
 * directly simply omits it, which is exactly the caller it is meant to stop.
 *
 * IT FAILS OPEN WHEN NO SECRET IS CONFIGURED, and that is a deliberate,
 * narrow allowance. The rate limit and the honeypot are unconditional and do
 * not depend on this; treating a missing key as "refuse everything" would take
 * the site's only conversion point offline the moment an environment variable
 * went astray, which is a worse failure than the one it would prevent. The
 * absence is logged once so it cannot go unnoticed indefinitely.
 */

const VERIFY_URL = "https://api.hcaptcha.com/siteverify";

/** How long to wait on hCaptcha before giving up. */
const TIMEOUT_MS = 5000;

let warned = false;

export function isCaptchaConfigured(): boolean {
  return Boolean(process.env.HCAPTCHA_SECRET_KEY);
}

/**
 * True when the token is valid, or when no secret is configured.
 *
 * `remoteip` is deliberately not sent. Vercel overwrites `X-Forwarded-For`, so
 * the value would be right, but hCaptcha treats a mismatch as a failure and a
 * proxy hop changing between render and submit would fail a genuine visitor.
 * The token is already bound to the site key, which is the part that matters.
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET_KEY;

  if (!secret) {
    if (!warned) {
      warned = true;
      console.warn(
        "[hcaptcha] HCAPTCHA_SECRET_KEY is not set — enquiry CAPTCHA tokens " +
          "cannot be verified and are being accepted. The rate limit and " +
          "honeypot still apply. Set the key to close this."
      );
    }
    return true;
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[hcaptcha] siteverify returned ${response.status}`);
      return false;
    }

    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    /* A timeout or a network failure is not a solved CAPTCHA. This path is
       only reached once the sender has already tripped the rate limit's
       challenge threshold, so refusing is the right answer — an ordinary
       first-time enquirer never gets here. */
    console.error(
      `[hcaptcha] verification failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}
