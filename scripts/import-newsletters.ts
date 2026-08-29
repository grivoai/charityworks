/**
 * Puts the nine real newsletters on /newsletters.
 *
 *     npm run import:newsletters
 *
 * The page has been live since 23 August saying "Our next newsletter is on its
 * way" and "Earlier issues are listed here as they are added" — a page about a
 * page that did not exist, carrying a meta description promising archived
 * issues. The issues did exist; they were on the legacy site at
 * /newsletter-pdfs, which now 308s here.
 *
 * WHAT THIS DOES, IN ORDER, PER ISSUE:
 *   1. uploads the PDF into the `documents` bucket under a generated path
 *   2. records it in `uploads`
 *   3. gives it a `document_links` row, which is what publishes /d/<slug>
 *   4. rebuilds the page's blocks to link at those slugs
 *
 * THE LINKS POINT AT /d/<slug>, NOT AT STORAGE. That indirection is the whole
 * point of the documents feature: the address is the durable thing and the file
 * behind it is not, so replacing a PDF repoints the row and every copy of the
 * link that has ever been forwarded keeps working. Linking storage URLs
 * directly from the page would give that up for nothing.
 *
 * The PDFs are fetched from the legacy host rather than committed to the repo:
 * they are content, and content belongs in the database and its bucket.
 *
 * Idempotent. Re-running re-uses the existing upload and document row for a
 * slug rather than making a second copy, and the page rebuild is a whole-block
 * replacement, so the result does not drift on a second run. Snapshots the page
 * into `content_revisions` first.
 */
import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { customPageSchema } from "@/content/schema";

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

const BUCKET = "documents";

/**
 * The nine issues, in the order the client published them.
 *
 * `4a` and `6a` are the client's own numbering — companion pieces to 4 and 6
 * rather than separate issues — so they keep it. Titles are transcribed from
 * the legacy page with its inconsistent dashes and doubled spaces normalised,
 * and nothing else changed: these are the client's words.
 */
const ISSUES: Array<{ num: string; slug: string; title: string; src: string }> = [
  {
    num: "1",
    slug: "newsletter-1-fundraiser-is-a-science",
    title: "Your Fundraiser Is a Science — The Low-Down on Day of Event Fundraising",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/314066a9f8b74a5d8e5e963a57e10b74/Newsletter%201.pdf",
  },
  {
    num: "2",
    slug: "newsletter-2-identifying-revenue-streams",
    title: "Identifying Revenue Streams for Your Day-of-Event Fundraiser",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/9c9122ff92014874828054e3d1c67093/Newsletter%202.pdf",
  },
  {
    num: "3",
    slug: "newsletter-3-choosing-the-perfect-date",
    title: "Choosing the Perfect Day/Date for Your Event",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/7bf74789bbca481d8083bfa0303555db/Newsletter%203.pdf",
  },
  {
    num: "4",
    slug: "newsletter-4-multi-basket-raffle",
    title: "The Science Behind a Multi-Basket Raffle at YOUR Event",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/b2551be3967e42c0b26b3abbb4a7d691/Newsletter%204.pdf",
  },
  {
    num: "4a",
    slug: "newsletter-4a-golden-ticket-raffle",
    title: "The Science of the Golden Ticket Raffle",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/342b1c462dd04d1f809a71f392e42575/Newsletter%204a.pdf",
  },
  {
    num: "5",
    slug: "newsletter-5-right-people-in-the-room",
    title: "The Importance of Having the Right People in the Room",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/f05b33939ab94c8ebb5795e9371c147f/Newsletter%205.pdf",
  },
  {
    num: "6",
    slug: "newsletter-6-auctioneer-best-investment",
    title: "Your Auctioneer May Be the Best Investment You Make for Your Fundraiser",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/83d0f7d0bef24844bd462b9930776af3/Newsletter%206.pdf",
  },
  {
    num: "6a",
    slug: "newsletter-6a-trained-benefit-auctioneer",
    title: "Why a Trained Charity Benefit Auctioneer Makes a Difference",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/9a309493b75a448f8c97cc0885ad3976/Newsletter%206a.pdf",
  },
  {
    num: "7",
    slug: "newsletter-7-speedometer",
    title: "What Your Car's Speedometer Can Teach You About Your Fundraiser",
    src: "https://storage.googleapis.com/wzukusers/user-29315960/documents/a7a367f0093a4ea49e16e4c0d1f7ff58/Newsletter%207.pdf",
  },
];

async function ensureDocument(issue: (typeof ISSUES)[number]): Promise<void> {
  const existing = await db
    .from("document_links")
    .select("slug")
    .eq("slug", issue.slug)
    .maybeSingle();
  if (existing.data) {
    console.log(`  skip   #${issue.num} already published at /d/${issue.slug}`);
    return;
  }

  const response = await fetch(issue.src, {
    headers: { "User-Agent": "CharityWorks-import/1.0" },
  });
  if (!response.ok) {
    console.error(`  #${issue.num}: could not fetch the PDF (HTTP ${response.status})`);
    process.exit(1);
  }
  const bytes = Buffer.from(await response.arrayBuffer());

  /* A PDF is what the page promises and what /d/<slug> will serve inline, so a
     redirect to an HTML error page must not be stored under a .pdf name. */
  if (bytes.subarray(0, 5).toString() !== "%PDF-") {
    console.error(`  #${issue.num}: the fetched file is not a PDF. Nothing stored.`);
    process.exit(1);
  }

  const path = `2026/${randomUUID()}.pdf`;
  const upload = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) {
    console.error(`  #${issue.num}: storage upload failed: ${upload.error.message}`);
    process.exit(1);
  }

  const row = await db
    .from("uploads")
    .insert({
      bucket: BUCKET,
      path,
      filename: `CharityWorks Newsletter ${issue.num}.pdf`,
      mime_type: "application/pdf",
      bytes: bytes.byteLength,
      checksum: createHash("sha256").update(bytes).digest("hex"),
    })
    .select("id")
    .single();
  if (row.error || !row.data) {
    console.error(`  #${issue.num}: could not record the upload: ${row.error?.message}`);
    process.exit(1);
  }

  const link = await db
    .from("document_links")
    .insert({ slug: issue.slug, upload_id: row.data.id, title: issue.title });
  if (link.error) {
    console.error(`  #${issue.num}: could not publish the link: ${link.error.message}`);
    process.exit(1);
  }

  console.log(
    `  ok     #${issue.num.padEnd(2)} ${(bytes.byteLength / 1024).toFixed(0).padStart(4)} KB  /d/${issue.slug}`
  );
}

/**
 * Three columns of three, newest first.
 *
 * A column layout rather than nine stacked blocks: nine headings each with a
 * button under it is a very long page for what is really a list, and the
 * column block already stacks on a phone, so the short form costs nothing at
 * the width where length actually hurts.
 */
function issueBlocks() {
  const newest = [...ISSUES].reverse();
  const columns = [0, 1, 2].map((c) => ({
    id: `column-newsletters-${c + 1}`,
    items: newest.slice(c * 3, c * 3 + 3).flatMap((issue) => [
      {
        id: `item-newsletter-${issue.num}-title`,
        type: "text" as const,
        heading: `Issue ${issue.num}`,
        body: issue.title,
      },
      {
        id: `item-newsletter-${issue.num}-link`,
        type: "button" as const,
        cta: {
          id: `cta-newsletter-${issue.num}`,
          label: "Read the PDF",
          href: `/d/${issue.slug}`,
          variant: "secondary" as const,
        },
      },
    ]),
  }));

  return {
    id: "block-newsletters-issues",
    type: "columns" as const,
    heading: "Every issue",
    ratio: "equal" as const,
    width: "contained" as const,
    spacing: "normal" as const,
    align: "left" as const,
    background: "auto" as const,
    columns,
  };
}

async function main() {
  console.log("\nImporting the nine newsletters\n");

  for (const issue of ISSUES) await ensureDocument(issue);

  const page = await db
    .from("custom_pages")
    .select("data")
    .eq("slug", "newsletters")
    .single();
  if (page.error || !page.data) {
    console.error(`\n  could not read /newsletters: ${page.error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = page.data.data as Record<string, unknown>;
  const blocks = (doc.blocks ?? []) as Array<Record<string, unknown>>;

  /* The intro block stays; the placeholder that said issues would appear here
     is replaced by the issues themselves. */
  const intro = blocks.filter((b) => b.id === "block-newsletters-intro");
  const next = {
    ...doc,
    intro:
      "Nine issues on how day-of-event fundraising actually works — revenue streams, raffle structure, picking a date, and what an auctioneer is really worth.",
    blocks: [...intro, issueBlocks()],
  };

  const parsed = customPageSchema.safeParse(next);
  if (!parsed.success) {
    console.error("\n  the result would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "custom-page",
    entity_id: "newsletters",
    data: doc,
    note: "Before the nine real newsletters replaced the placeholder",
  });
  if (history.error) {
    console.error(`\n  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("custom_pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "newsletters");
  if (write.error) {
    console.error(`\n  could not save /newsletters: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`\n  /newsletters rebuilt with ${ISSUES.length} issues, newest first`);
  console.log("  Deploy the site to put them on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
