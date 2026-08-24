/**
 * Imports the trip brochures from the old Homestead site into Documents, and
 * points each lot at its own.
 *
 *     npm run import:brochures -- <directory>
 *
 * The old site's Trips page linked 27 PDFs. They are not `<a href>` links in
 * its HTML — they are asset records inside its JavaScript bundle, resolved by
 * the builder's own `resolveAssetUrl` — so they were fetched separately and are
 * read from a local directory here rather than downloaded by this script. That
 * split is deliberate: fetching is slow, repeatable and safe to redo, while
 * this half writes to production storage.
 *
 * WHAT IT DOES, PER FILE:
 *   1. Uploads it to the `documents` bucket under a fresh UUID path.
 *   2. Runs it through `ingestDocument`, the same function the admin's own
 *      upload calls — so the size, the checksum and the `%PDF-` sniff are the
 *      real ones, and identical bytes already in the library are reused rather
 *      than stored twice.
 *   3. Creates a `document_links` row, giving it the permanent `/d/<slug>`
 *      address the client can hand out.
 *   4. Sets `catalog_items.document_slug` on the lot it belongs to, which is
 *      what puts the Print / Download button on that lot's card.
 *
 * THE MAPPING IS EXPLICIT, not derived from the filenames. Several of them do
 * not name the trip they show — `CW Trip Page Doc.pdf` is the Stronghold
 * brochure, `Sunset Royal Beach & Sunset Marina Properties.pdf` is the Cancún
 * package — so the pairs below were established by reading the files. Anything
 * not in this table is skipped and named, rather than guessed at.
 *
 * Idempotent. A slug that already exists keeps its upload, and a lot already
 * pointing at its slug is left alone. Safe to re-run after adding a file.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getServiceClient } from "../src/lib/supabase";
import { DOCUMENT_BUCKET, ingestDocument } from "../src/lib/admin/uploads";
import { isDocumentSlug } from "../src/lib/admin/document-rules";

/** filename on disk -> [lot id, /d/ slug, link title]. */
const BROCHURES: Array<[string, string, string, string]> = [
  // ---- Affordable Vacations ----
  ["Mexico Cruise - CharityWorks.pdf", "trip-catalina-baja-cruise", "catalina-baja-cruise", "Catalina & Baja Cruise for Two"],
  ["Dream Vacation Getaway - Brochure - Lo Def CW Bottom 1.pdf", "trip-dream-vacation-getaway", "dream-vacation-getaway", "Dream Vacation Getaway"],
  ["Disneyland Calif Experience - 2024.pdf", "trip-disneyland-anaheim", "disneyland-anaheim", "Disneyland Experience, Anaheim"],
  ["Waikiki Outrigger Beachcomber Resort 2023 - Waikiki View CW.pdf", "trip-outrigger-waikiki", "outrigger-waikiki", "Outrigger Waikiki Beach Resort"],
  ["Hilton Huntington Beach Waterfront 2023 cw.pdf", "trip-hilton-huntington-beach", "hilton-huntington-beach", "Hilton Huntington Beach Oceanfront"],
  ["Lake Tahoe - Marriott's Timber Lodge 2024.pdf", "trip-tahoe-marriott", "tahoe-marriott-timber-lodge", "Lake Tahoe Marriott Timber Lodge"],
  ["Disney World - Orlando Florida Compress.pdf", "trip-disney-world-orlando", "disney-world-orlando", "Disney World, Orlando"],
  ["Sunset Royal Beach & Sunset Marina Properties.pdf", "trip-cancun-all-inclusive", "cancun-all-inclusive", "All-Inclusive Cancún"],
  ["Lake Tahoe - Hilton Club Lake Tahoe Resort - 2024-25.pdf", "trip-tahoe-hilton-club", "tahoe-hilton-club", "Lake Tahoe Hilton Club"],
  ["A - Grand Mayan Luxury Resort  6D 5 N cw.pdf", "trip-mayan-luxury", "mayan-luxury-resort", "Mayan Luxury Resort, Mexico"],
  ["Luxury All-Inclusive Description.pdf", "trip-luxury-4-night", "luxury-4-night-getaway", "All-Inclusive Luxury 4-Night Getaway"],
  ["SAV Golf 528 Sedona .pdf", "trip-golf-sedona", "golf-sedona", "Golf in Sedona, Arizona"],
  ["Viva! Las Vegas Getaway 2025.pdf", "trip-viva-las-vegas", "viva-las-vegas", "Viva Las Vegas"],
  // Named "CW Trip Page Doc" on the old site; the text inside is the Arnold
  // mountain home. Confirmed by reading it, not by the filename.
  ["CW Trip Page Doc.pdf", "trip-stronghold-arnold", "stronghold-arnold", "The Stronghold Mountain Home, Arnold CA"],

  // ---- Bucket List Trips ----
  ["Sphere in Las Vegas w-Two Night Experience CW-LVSPHERE2N25.pdf", "trip-sphere-las-vegas", "sphere-las-vegas", "The Sphere, Las Vegas — Two-Night Experience"],
  ["Atlantis Harborside Resort 2024.pdf", "trip-atlantis-bahamas", "atlantis-bahamas", "Atlantis Harborside, Bahamas"],
  ["Aulani Disney Resort Oahu 2024.pdf", "trip-aulani-oahu", "aulani-oahu", "Aulani, a Disney Resort — O'ahu"],
  ["Africa 12-12-25 -  with CW Contact Photo Safari 2025 2- .pdf", "trip-african-safari", "african-photo-safari", "African Photo Safari, South Africa"],
  ["CG 4D200 - Hawaii Spain Mexico Bali 2023 2 Pg.pdf", "trip-ultimate-beach", "ultimate-beach-destination", "Ultimate Beach Destination"],
  ["Chicago's Classic Wrigley Field Getaway 2024. CHI-WRG-815pdf.pdf", "trip-wrigley-field", "wrigley-field-chicago", "Wrigley Field Getaway, Chicago"],
  ["NASCAR Driving Experience 8 Minute SKU NASCAR80N15.pdf", "trip-nascar", "nascar-driving-experience", "Ultimate NASCAR Driving Experience"],
  ["CG 2D200 Hawaii or Ireland 2024 CW.pdf", "trip-hawaii-or-ireland", "hawaii-or-ireland", "Hawai'i or Ireland"],
  ["A - Under the Tuscany Apartment 7 Days 6 Nights 2025 cw.pdf", "trip-tuscan-sun", "under-the-tuscan-sun", "Under the Tuscan Sun Apartment"],
  ["1-Sushi Party Details CW FOOTNOTE.pdf", "trip-sushi-party", "sushi-party-for-20", "Sushi Party for 20 in Your Home"],
  ["Big Frank Flyer - PDF 3 FINAL 10 Guests.pdf", "trip-spirits-experience", "spirits-experience-for-10", "Unforgettable Spirits Experience for 10"],

  // ---- Meet & Greets ----
  ["Warriors Tickets Package  2026-27 Season 2 Tickets .pdf", "trip-warriors-franco-finn", "warriors-tickets-meet-greet", "Golden State Warriors Tickets & Meet and Greet"],
  ["Bocelli Concert w- Meet & Greet 2023 PRE-ABD-639.pdf", "trip-andrea-bocelli", "andrea-bocelli-meet-greet", "Andrea Bocelli — Tickets & Backstage Meet and Greet"],
];

const source = process.argv[2];
if (!source) {
  console.error(
    "Give it the directory holding the PDFs:\n" +
      "  npm run import:brochures -- ./brochures"
  );
  process.exit(1);
}

for (const [, , slug] of BROCHURES) {
  if (!isDocumentSlug(slug)) {
    console.error(`"${slug}" is not a usable address. Fix the table above.`);
    process.exit(1);
  }
}

const slugs = BROCHURES.map(([, , slug]) => slug);
const duplicate = slugs.find((slug, i) => slugs.indexOf(slug) !== i);
if (duplicate) {
  console.error(`Two brochures both want /d/${duplicate}.`);
  process.exit(1);
}

async function main() {
  const supabase = getServiceClient();
  const present = new Set(await readdir(source));

  let uploaded = 0;
  let reused = 0;
  let linked = 0;
  let missing = 0;

  for (const [filename, lotId, slug, title] of BROCHURES) {
    if (!present.has(filename)) {
      console.log(`  miss  ${filename} is not in ${source}`);
      missing += 1;
      continue;
    }

    /* ---- Is this link already made? ------------------------------------ */
    const existingLink = await supabase
      .from("document_links")
      .select("slug, upload_id")
      .eq("slug", slug)
      .maybeSingle<{ slug: string; upload_id: string }>();
    if (existingLink.error) {
      console.error(`  fail  /d/${slug}: ${existingLink.error.message}`);
      process.exit(1);
    }

    let uploadId = existingLink.data?.upload_id ?? null;

    if (!uploadId) {
      /* ---- Store the bytes -------------------------------------------- */
      const bytes = await readFile(path.join(source, filename));
      const objectPath = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.pdf`;

      const put = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(objectPath, bytes, { contentType: "application/pdf" });
      if (put.error) {
        console.error(`  fail  ${filename}: ${put.error.message}`);
        process.exit(1);
      }

      // The admin's own ingestion, not a reimplementation of it: it re-reads
      // the size from storage, sniffs the header, takes the checksum and
      // reuses an identical file already in the library.
      const ingested = await ingestDocument({
        path: objectPath,
        filename,
        adminId: null,
      });
      uploadId = ingested.uploadId;
      if (ingested.deduped) reused += 1;
      else uploaded += 1;

      const link = await supabase
        .from("document_links")
        .insert({ slug, upload_id: uploadId, title });
      if (link.error) {
        console.error(`  fail  /d/${slug}: ${link.error.message}`);
        process.exit(1);
      }
      console.log(
        `  ok    /d/${slug.padEnd(28)} ${(ingested.bytes / 1024 / 1024).toFixed(1)} MB` +
          `${ingested.deduped ? "  (bytes already in the library)" : ""}`
      );
    } else {
      console.log(`  skip  /d/${slug} already exists`);
    }

    /* ---- Point the lot at it ------------------------------------------- */
    const lot = await supabase
      .from("catalog_items")
      .update({ document_slug: slug })
      .eq("id", lotId)
      .select("id");
    if (lot.error) {
      console.error(`  fail  ${lotId}: ${lot.error.message}`);
      process.exit(1);
    }
    if ((lot.data ?? []).length === 0) {
      console.log(`  warn  no lot with id ${lotId} — the link exists but nothing points at it`);
    } else {
      linked += 1;
    }
  }

  console.log(
    `\n  ${uploaded} uploaded, ${reused} matched bytes already stored, ` +
      `${linked} lots pointed at a brochure` +
      (missing ? `, ${missing} file(s) not found` : "")
  );
  console.log("  Deploy the site to put the buttons on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
