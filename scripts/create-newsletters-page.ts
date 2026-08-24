/**
 * Creates the Newsletters page and puts it in the navigation.
 *
 *     npm run create:newsletters
 *
 * A custom page rather than a ninth built-in one: the client owns it from here,
 * and adding an issue is an edit in the admin rather than a deploy. That is the
 * whole reason custom pages exist, and a newsletter archive is the case they
 * were built for.
 *
 * THE STRUCTURE, AND WHY IT IS THIS AND NOT A LIST BLOCK. There is no
 * `documentList` block, so the issues are a `columns` block whose entries are
 * written by hand. That is the right trade at zero issues and the wrong one at
 * twenty — see the note at the bottom of this file.
 *
 * NO DEAD LINK. No newsletter PDF has been uploaded yet, so the placeholder
 * entry carries no button. A "Download PDF" on a live public page that opens a
 * 404 is worse than an entry that says the issue is coming: the first looks
 * broken to a visitor, the second reads as a page that is up to date. When the
 * first PDF lands in Documents, the entry gains a button piece pointing at its
 * `/d/<slug>` address — an edit in the admin, not a code change.
 *
 * Idempotent: an existing page or nav link is left alone rather than reset,
 * because by the time this is re-run the client may have edited both.
 */
import { createClient } from "@supabase/supabase-js";

import { customPageSchema, siteContentSchema } from "../src/content/schema";
import { checkSlug } from "../src/lib/reserved-paths";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SLUG = "newsletters";

const PAGE = {
  slug: SLUG,
  title: "Newsletters",
  visibility: "public" as const,
  seo: {
    title: "CharityWorks Newsletters for Nonprofit Fundraisers",
    description:
      "Read and print past issues of the CharityWorks newsletter — auction items that performed, what they raised, and what is new in the catalog.",
    targetTerms: ["charity auction newsletter", "nonprofit fundraising newsletter"],
    path: `/${SLUG}`,
  },
  intro:
    "What is moving in the catalog, what it raised, and what is worth putting in front of your room next season.",
  blocks: [
    {
      id: "block-newsletters-intro",
      type: "richText" as const,
      heading: "Read or print any issue",
      body:
        "Every issue is a PDF you can read on a phone or print for a committee meeting. Issues are posted here as they go out, and the links are permanent — one you forward this year still opens next year.",
      width: "narrow" as const,
      spacing: "normal" as const,
      align: "left" as const,
      background: "auto" as const,
    },
    {
      id: "block-newsletters-issues",
      type: "columns" as const,
      heading: "Issues",
      ratio: "equal" as const,
      columns: [
        {
          id: "column-newsletters-latest",
          items: [
            {
              id: "item-newsletters-latest",
              type: "text" as const,
              heading: "The next issue",
              body:
                "Our next newsletter is on its way. It will appear here as a PDF the day it goes out — or ask us and we will send it to you directly.",
            },
          ],
        },
        {
          id: "column-newsletters-archive",
          items: [
            {
              id: "item-newsletters-archive",
              type: "text" as const,
              heading: "Past issues",
              body:
                "Earlier issues are listed here as they are added, newest first, each with its own download link.",
            },
          ],
        },
      ],
      width: "narrow" as const,
      spacing: "normal" as const,
      align: "left" as const,
      background: "auto" as const,
    },
    {
      id: "block-newsletters-cta",
      type: "callToAction" as const,
      heading: "Want it in your inbox?",
      lede: "Tell us where to send it and you will get each issue as it goes out.",
      cta: {
        id: "cta-newsletters",
        label: "Ask us to send it",
        href: "/contact",
        variant: "primary" as const,
      },
    },
  ],
};

const NAV_LINK = { id: "nav-newsletters", label: "Newsletters", href: `/${SLUG}` };

async function main() {
  console.log("\nCreating the Newsletters page\n");

  /* ---- The address has to be one a custom page may take ----------------- */
  const problem = checkSlug(SLUG);
  if (!problem.ok) {
    console.error(`  /${SLUG} cannot be used: ${problem.reason}`);
    process.exit(1);
  }

  const parsed = customPageSchema.safeParse(PAGE);
  if (!parsed.success) {
    console.error("  the page would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  /* ---- The page --------------------------------------------------------- */
  const existing = await db
    .from("custom_pages")
    .select("slug, published")
    .eq("slug", SLUG)
    .maybeSingle<{ slug: string; published: boolean }>();
  if (existing.error) {
    console.error(`  could not check for the page: ${existing.error.message}`);
    process.exit(1);
  }

  if (existing.data) {
    console.log(
      `  skip  /${SLUG} already exists (published: ${existing.data.published})`
    );
  } else {
    const insert = await db
      .from("custom_pages")
      .insert({ slug: SLUG, data: parsed.data, published: true });
    if (insert.error) {
      console.error(`  could not create the page: ${insert.error.message}`);
      process.exit(1);
    }
    console.log(`  done  /${SLUG} created and published, ${PAGE.blocks.length} blocks`);
  }

  /* ---- The navigation --------------------------------------------------- */
  const site = await db.from("site_settings").select("data").eq("id", 1).single();
  if (site.error || !site.data) {
    console.error(`  could not read the site record: ${site.error?.message}`);
    process.exit(1);
  }

  const doc = site.data.data as Record<string, unknown>;
  const nav = [...((doc.nav as Array<Record<string, unknown>>) ?? [])];

  if (nav.some((link) => link.href === NAV_LINK.href)) {
    console.log(`  skip  the menu already links to /${SLUG}\n`);
    return;
  }

  // Before Contact rather than after it. Contact is the menu's last item on
  // every page of this site and is where the eye goes for the call to action;
  // dropping something after it would put a reading link past the doing one.
  const contactAt = nav.findIndex((link) => link.href === "/contact");
  const at = contactAt === -1 ? nav.length : contactAt;
  nav.splice(at, 0, NAV_LINK);

  const nextSite = { ...doc, nav };
  const validSite = siteContentSchema.safeParse(nextSite);
  if (!validSite.success) {
    console.error("  the site record would not be valid:");
    for (const issue of validSite.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "site",
    entity_id: "1",
    data: doc,
    note: "Before the Newsletters menu link was added",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("site_settings")
    .update({ data: nextSite, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (write.error) {
    console.error(`  could not save the menu: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  done  menu link added at position ${at + 1} of ${nav.length}`);
  console.log(`        ${nav.map((link) => link.label).join(" · ")}`);
  console.log("\n  Deploy the site to put it live.");
  console.log(
    "  Adding an issue: upload the PDF in Documents, give it an address, then\n" +
      "  add a Button piece to the issues block pointing at /d/<that address>.\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/*
 * IF THIS LIST GETS LONG. A `documentList` block that reads `document_links`
 * would make an issue appear the moment its PDF is uploaded, with no page edit
 * at all. It was left out on purpose for now: with no issues yet, the block
 * would be a feature with nothing to list, and there is a real design question
 * behind it that only matters once it is built — the library already holds 27
 * trip brochures, so such a block needs a way to say WHICH documents belong on
 * a page. A slug prefix, or a kind on `document_links`. Worth doing at the
 * point the hand-maintained list starts to annoy, not before.
 */
