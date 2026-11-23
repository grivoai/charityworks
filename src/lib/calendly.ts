/**
 * Tags a Calendly link with the page it was clicked on, so a booking in
 * Calendly shows which page produced it (client request, Nov 2026).
 *
 * Done here at render time, not stored in content, because one stored link is
 * rendered on more than one page: the "Book a Call" contact channel is a single
 * site setting shown on both the home and contact pages, and only the page
 * rendering it knows which one it is.
 *
 * - Any link that is not to calendly.com is returned untouched, so a channel
 *   that is a phone number or an email address passes straight through.
 * - utm_source is kept if the link already has one (the stored channel link
 *   carries `utm_source=website`); otherwise it is set to `website` to match.
 * - utm_content is always set to the page, overwriting any stored value.
 *
 * Not used for the inline booking widget on the contact form's success state:
 * that widget already sends the lead's id as utm_content, so a booking can be
 * joined to the lead that produced it (see BookingPanel and
 * app/api/contact/route.ts). Overwriting it with a page name would break that.
 */
export function withBookingPage(href: string, page: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (!/(^|\.)calendly\.com$/i.test(url.hostname)) return href;

  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "website");
  }
  url.searchParams.set("utm_content", page);
  return url.toString();
}
