"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Google Analytics 4: page views and where visitors came from.
 *
 * OFF UNLESS CONFIGURED. With NEXT_PUBLIC_GA_ID unset this renders nothing:
 * no script tag, no request to Google, no cookie. The ID is read at build
 * time (NEXT_PUBLIC_ is inlined into the bundle), so setting or changing it in
 * Vercel takes a redeploy to apply.
 *
 * PUBLIC PAGES ONLY. Mounted by `(site)/layout.tsx` and `not-found.tsx`, never
 * by the admin layout, so /admin does not load it, and API routes render no
 * HTML. The hidden pages (/guitar-prices) sit under `(site)` and are tracked.
 *
 * NOT INSIDE THE ADMIN PREVIEW. Every admin editing screen puts the real
 * public page in a same-origin iframe (PagePreview), and reloads it on each
 * save. Counted, that would be a page view per keystroke-and-save from Ira,
 * not from a visitor. A framed page never loads the tag. The /admin and /api
 * path check is belt and braces in case this is ever mounted higher up.
 *
 * Client-side navigations between pages are counted by GA4's own "page
 * changes based on browser history events" (Enhanced measurement, on by
 * default), which is the same mechanism @next/third-parties relies on.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";

/** GA4 measurement IDs look like G-XXXXXXXXXX. Anything else is a typo. */
const VALID_ID = /^G-[A-Z0-9]+$/;

export function Analytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!GA_ID || !VALID_ID.test(GA_ID)) return;
    let framed = true;
    try {
      framed = window.self !== window.top;
    } catch {
      // Cross-origin parent: reading window.top threw. Still framed.
    }
    const path = window.location.pathname;
    if (framed || path.startsWith("/admin") || path.startsWith("/api")) return;
    setAllowed(true);
  }, []);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
