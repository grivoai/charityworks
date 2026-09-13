import { EMBED_HOSTS } from "@/lib/embeds";
import { MAX_IMAGE_BYTES } from "@/lib/admin/image-rules";
import { MAX_DOCUMENT_BYTES, formatBytes } from "@/lib/admin/document-rules";

/**
 * What the help panel says, keyed by where the client is standing.
 *
 * TASK-SHAPED, NOT FIELD-SHAPED. Every field already explains itself in the
 * line beneath it, generated from the schema's own description; repeating
 * those here would be a second copy that drifts. What the fields cannot say
 * is what happens across screens — that saving a published page changes the
 * live page, that a removed lot is retired rather than deleted, that an
 * unlisted page is not a private one — and those are the questions somebody
 * opens a help panel to ask.
 *
 * PLAIN TEXT ONLY. Paragraphs and numbered steps, rendered as text nodes, so
 * nothing written here can put markup on the page. A topic may link to one
 * admin screen, and the address has to be real: `check:help` reads the routes
 * off the filesystem and refuses a link to a screen that does not exist.
 *
 * NUMBERS ARE IMPORTED, NOT TYPED. The photograph limit, the document limit
 * and the embed hosts come from the modules that enforce them, so this cannot
 * say "10 MB" after the rule has become 12. The block and template names are
 * typed — the schema cannot be imported here without dragging zod into the
 * admin's client bundle — and `check:help` compares them against the schema
 * and the template list instead, so a block added without a line here fails
 * the check rather than going undocumented.
 *
 * Deliberately free of `server-only`: the panel is a client component.
 */

export type HelpPiece = { p: string } | { steps: string[] };

export interface HelpTopic {
  id: string;
  title: string;
  /**
   * The admin routes this topic belongs to. A route with a dynamic segment is
   * written as its prefix — `/admin/custom-pages/` with the trailing slash —
   * and matches every page under it. `*` is every screen.
   */
  routes: string[];
  body: HelpPiece[];
  /** Where to go to do it. An admin route, checked against the filesystem. */
  link?: { href: string; label: string };
}

const image = formatBytes(MAX_IMAGE_BYTES);
const document = formatBytes(MAX_DOCUMENT_BYTES);

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "getting-around",
    title: "Finding your way around",
    routes: ["/admin", "*"],
    body: [
      {
        p:
          "The dashboard lists every part of the site you can change. The " +
          "Dashboard link at the top of every other screen takes you back to " +
          "it, and the bar stays put while you scroll, so the way out is always " +
          "where you left it.",
      },
      {
        p:
          "An edit goes live when you press Save, and not before. Close a " +
          "screen without saving and the site is as it was.",
      },
    ],
    link: { href: "/admin", label: "Go to the dashboard" },
  },
  {
    id: "editing-a-page",
    title: "Editing the site's page text",
    routes: ["/admin/pages", "/admin/pages/"],
    body: [
      {
        p:
          "Every field on the form is a piece of the page, in the order it " +
          "appears. The line under each field says what it is for. Saving " +
          "publishes straight to the live page — there is no separate publish " +
          "step for these pages — and keeps the version you replaced.",
      },
      {
        p:
          "The preview beside the form shows the live page. Use the width " +
          "buttons to see it as a phone or a tablet would, and turn on " +
          "Point & edit to click a piece of the page and be taken to the field " +
          "that controls it.",
      },
    ],
    link: { href: "/admin/pages", label: "Page text" },
  },
  {
    id: "locked-fields",
    title: "Why a field is greyed out",
    routes: ["/admin/pages/", "/admin/site", "/admin/catalog/"],
    body: [
      {
        p:
          "A greyed-out field is one that something else depends on: a page's " +
          "address is what the sitemap and the site's links are built from, and " +
          "the contact form's field names are what the enquiry pipeline reads. " +
          "The reason is written beneath the field. If you need one of these " +
          "changed, ask whoever set up the site rather than working around it.",
      },
    ],
  },
  {
    id: "history",
    title: "Putting something back the way it was",
    routes: [
      "/admin/pages/",
      "/admin/custom-pages/",
      "/admin/catalog/",
      "/admin/site",
      "/admin/site/history",
    ],
    body: [
      {
        p:
          "Every save is kept. Version history, at the foot of an editor, lists " +
          "each version with who saved it and when, and Restore puts one back. " +
          "Restoring is " +
          "itself a new version — including the one you are replacing — so a " +
          "restore can be undone the same way.",
      },
    ],
  },
  {
    id: "adding-a-page",
    title: "Adding a page of your own",
    routes: ["/admin/custom-pages"],
    body: [
      {
        steps: [
          "Open Your pages. Under Add a page, give it a title and an address — letters, digits and hyphens, under 60 characters, and not one the site already uses.",
          "Pick a template: Blank, Event page, Announcement, Landing page, Meet the team, Event recap, Thank-you page or Success stories. A template only fills the page in to start with; every block can be changed or removed.",
          "Press Create page. The page starts as a draft: build it, check the preview, then Publish.",
        ],
      },
      {
        p:
          "Placeholder wording in a template starts with REPLACE so that it " +
          "cannot be mistaken for finished copy. Templates never include " +
          "photographs or videos — those are yours to choose — so where one " +
          "belongs, the copy says to add the block.",
      },
    ],
    link: { href: "/admin/custom-pages", label: "Your pages" },
  },
  {
    id: "blocks",
    title: "Building a page from blocks",
    routes: ["/admin/custom-pages/"],
    body: [
      {
        p:
          "A page is a list of blocks. Add block adds one; choose its kind and " +
          "fill it in. Reorder by dragging the handle or with the up and down " +
          "arrows; remove one with the cross. Each block's width, spacing, " +
          "alignment and background are its own, and a background left on Auto " +
          "alternates with its neighbours so two shaded sections never touch by " +
          "accident.",
      },
      {
        steps: [
          "Rich text — a heading and paragraphs. A blank line starts a new paragraph.",
          "Image and text — a photograph beside text; choose which side it sits.",
          "Call to action — a dark band with one button.",
          "Questions — a list that opens one answer at a time.",
          "Enquiry form — the contact form, using the questions set on the Contact page.",
          "Catalog teaser — the newest auction categories as tiles.",
          "Columns — two or three columns of text, pictures and buttons.",
          "Testimonials — one to six quotes as cards.",
          "Gallery — two to twelve photographs, two, three or four to a row, cropped to the same shape.",
          "Video — a player from YouTube, Vimeo or Google Drive.",
          "Team — one to six people as cards; a person without a photograph shows their initials.",
        ],
      },
    ],
  },
  {
    id: "publishing",
    title: "Publishing, unpublishing and unlisted pages",
    routes: ["/admin/custom-pages", "/admin/custom-pages/"],
    body: [
      {
        p:
          "An unpublished page shows nothing to visitors — the address gives a " +
          "not-found page — but you can see it in the preview. Publish makes it " +
          "live. Saving a page that is already published changes the live page " +
          "straight away, so to work on one quietly, unpublish it first.",
      },
      {
        p:
          "Unlisted means exactly that and no more: not in the navigation, the " +
          "sitemap or search results, but still open to anyone who has the " +
          "address. It is not private. Nothing that should not be public belongs " +
          "on an unlisted page.",
      },
      {
        p:
          "Deleting a page asks you to type its address first. A deleted page " +
          "is gone; unpublishing is the reversible version.",
      },
    ],
  },
  {
    id: "photographs",
    title: "Adding a photograph",
    routes: ["/admin/pages/", "/admin/catalog/", "/admin/custom-pages/", "/admin/site"],
    body: [
      {
        p:
          "Wherever there is a picture there are three ways in: Upload a " +
          "photograph, drop a file onto the same box, or choose one already in " +
          `the library. JPG, PNG or WebP, up to ${image}. A photo straight from ` +
          "an iPhone is HEIC — export it as a JPG first.",
      },
      {
        p:
          "Fill in the alt text: it is what a screen reader says and what a " +
          "search engine reads. The photograph is on the site once you save, " +
          "not before. Uploading the same file twice keeps one copy.",
      },
    ],
  },
  {
    id: "video",
    title: "Embedding a video",
    routes: ["/admin/custom-pages/", "/admin/pages/"],
    body: [
      {
        p:
          `A video field takes a player address from ${EMBED_HOSTS} and nothing ` +
          "else. For YouTube use the embed address (youtube.com/embed/… or " +
          "youtube-nocookie.com/embed/…), not the watch address; for Vimeo, " +
          "player.vimeo.com/video/…; for Google Drive, the file address ending " +
          "in /preview.",
      },
      {
        p:
          "A Drive file must be shared with anyone who has the link, or " +
          "visitors see a sign-in wall where the video should be. The preview " +
          "will show you.",
      },
    ],
  },
  {
    id: "catalog",
    title: "Changing the auction items",
    routes: ["/admin/catalog", "/admin/catalog/"],
    body: [
      {
        p:
          "The catalog is categories of lots. Editing a category changes its " +
          "own page, the tiles on the home and auction items pages, and what " +
          "the auction planner suggests. Saving publishes straight away and " +
          "keeps the version you replaced.",
      },
      {
        p:
          "Removing a lot from the form retires it rather than deleting it: it " +
          "leaves the site, but the record is kept, so an enquiry that named it " +
          "still makes sense.",
      },
    ],
    link: { href: "/admin/catalog", label: "Auction items" },
  },
  {
    id: "documents",
    title: "Sharing a PDF",
    routes: ["/admin/documents"],
    body: [
      {
        p:
          `Upload a PDF, up to ${document}, and it gets an address you can hand ` +
          "out. The address belongs to the document, not to the file: replace " +
          "the file next quarter and every copy of the link already sent " +
          "starts showing the new one. Uploading the same file twice keeps " +
          "one copy.",
      },
    ],
    link: { href: "/admin/documents", label: "Documents" },
  },
  {
    id: "enquiries",
    title: "Reading enquiries",
    routes: ["/admin/enquiries"],
    body: [
      {
        p:
          "Everyone who has filled in a form on the site, newest first. Open a " +
          "row to see everything they sent. An enquiry that did not reach the " +
          "pipeline is opened for you, with a Try again button to send it on — " +
          "every enquiry is kept whether or not it was passed on.",
      },
    ],
    link: { href: "/admin/enquiries", label: "Enquiries" },
  },
  {
    id: "site-details",
    title: "The header, footer and contact details",
    routes: ["/admin/site"],
    body: [
      {
        p:
          "Site details holds what is the same on every page: the name in the " +
          "header, the navigation and where each link goes, the phone number " +
          "and email addresses, the booking link and the footer. Saving changes " +
          "the whole site at once.",
      },
      {
        p:
          "The preview beside this form is the one in the panel that shows " +
          "unsaved work as you type, because there is no draft to check " +
          "otherwise — saving here is publishing.",
      },
    ],
    link: { href: "/admin/site", label: "Site details" },
  },
  {
    id: "security",
    title: "Signing in and two-factor authentication",
    routes: ["/admin/security", "*"],
    body: [
      {
        p:
          "Signing in takes your password and, once set up, a six-digit code " +
          "from an authenticator app on your phone. Set that up under Security; " +
          "the same screen shows whether the other people with access have it " +
          "turned on. Accounts are created by invitation, not by signing up.",
      },
      {
        p:
          "After too many failed attempts the sign-in waits a few minutes " +
          "before trying again. If you are locked out, ask whoever set up the " +
          "site rather than retrying.",
      },
    ],
    link: { href: "/admin/security", label: "Security" },
  },
];

/**
 * The topics for a screen, then the rest.
 *
 * A route with a dynamic segment is matched by its prefix, so `/admin/pages/`
 * covers every page editor and its history. `*` topics come last within the
 * first group: they are true everywhere, which is another way of saying they
 * are the least about here.
 */
export function topicsFor(pathname: string): { here: HelpTopic[]; elsewhere: HelpTopic[] } {
  const matches = (route: string) =>
    route === "*" ||
    (route.endsWith("/") ? pathname.startsWith(route) : pathname === route);

  const here: HelpTopic[] = [];
  const elsewhere: HelpTopic[] = [];
  for (const topic of HELP_TOPICS) {
    const specific = topic.routes.some((r) => r !== "*" && matches(r));
    const general = topic.routes.includes("*");
    if (specific) here.push(topic);
    else if (general) here.push(topic);
    else elsewhere.push(topic);
  }
  // Specific first, general after, each in authoring order.
  here.sort(
    (a, b) => Number(a.routes.includes("*")) - Number(b.routes.includes("*"))
  );
  return { here, elsewhere };
}
