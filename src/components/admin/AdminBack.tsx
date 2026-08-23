import Link from "next/link";

/**
 * The way back to the dashboard, in the top bar of every admin page.
 *
 * IT MOVED. It used to sit at the top of the content column, which meant that
 * on the pages where it matters most — the editors, which run several screens
 * long — getting out required scrolling back up to find it. The bar is
 * `position: sticky`, so putting it there makes "always available" a property
 * of the layout rather than of where the client happens to be on the page.
 *
 * The history below is why it is a control rather than a crumb, and that part
 * has not changed.
 *
 * There WAS already a link to `/admin` on all twelve signed-in pages — the
 * first item of the breadcrumb trail, in this exact position. Nobody read it as
 * a way out, for three reasons worth recording so it does not drift back:
 *
 *   1. It was labelled "Site content", after the dashboard's own heading. That
 *      names a destination but does not offer an escape, and the two are read
 *      differently.
 *   2. It was styled as breadcrumb text — 13px and grey — rather than as a
 *      control. Nothing about it invited a click.
 *   3. On the six top-level pages the whole row was `Site content › Page text`
 *      sitting directly above an `<h1>` reading "Page text". Half of it
 *      repeated the heading, so the row scanned as decoration and got skipped
 *      — taking the half that was the way back with it.
 *
 * So this is a control, not a crumb, and the leading `Site content` crumb was
 * removed everywhere rather than left beside it: two links to the same place
 * six pixels apart is a worse answer than one.
 *
 * Rendered by `AdminShell`, never by a page. That is what makes "the same place
 * on every page" a fact about the layout rather than a convention twelve files
 * have to keep agreeing on, and it is why a new admin route cannot ship
 * without one.
 *
 * `check:admin-nav` holds both halves of that: that the shell renders this and
 * suppresses it on the dashboard, and that no page ships a second link to the
 * same place.
 */
export function AdminBack() {
  return (
    <Link href="/admin" className="admin-back">
      {/* Decorative: the word "Dashboard" is already the accessible name, and a
          screen reader announcing "left arrow Dashboard" is noise. */}
      <span aria-hidden="true">←</span>
      {/* In its own element so a narrow bar can clip it to the arrow alone
          without removing it — clipped text is still announced, where
          `display: none` would leave a control with no name at all. */}
      <span className="admin-back-label">Dashboard</span>
    </Link>
  );
}
