import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh and the first gate on /admin.
 *
 * Two jobs, and it is worth being precise about which is which.
 *
 * The one it must do: refresh the Supabase session. Access tokens expire, and
 * a Server Component cannot write a cookie — so without a middleware pass, a
 * session would quietly die mid-visit and the admin would be bounced to the
 * login page while still logged in. Calling `getUser()` here refreshes the
 * token and writes the rotated cookie onto the response.
 *
 * The one it only helps with: keeping signed-out people out of /admin. This is
 * a redirect for their benefit, not the security boundary. It checks only that
 * a valid session exists, not that the user has an `admin_users` row, and it
 * does not run for every way a server action can be reached. `requireAdmin()`
 * inside each page and action is the actual guard. If this file were deleted,
 * nothing would become readable — the pages would still refuse.
 */
export async function middleware(request: NextRequest) {
  // Must be built from the request so cookies set below survive onto it.
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured there is no admin panel to protect, and
  // failing closed here would lock the public site's build out of nothing.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), not getSession() — see the note in lib/auth.ts. This call is
  // also what performs the refresh, so it is not optional even when the result
  // is unused.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";

  if (!user && !isLoginPage) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    // Where they were headed, so the login can send them back. Only ever a
    // path from this request, never anything user-supplied — an open redirect
    // on a login page is how a convincing phishing flow starts.
    target.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(target);
  }

  if (user && isLoginPage) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin";
    target.search = "";
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  /**
   * Only /admin. The public site is statically prerendered and must stay that
   * way — running middleware across it would add a function invocation to
   * every page view to answer a question no public page asks.
   */
  matcher: ["/admin", "/admin/:path*"],
};
