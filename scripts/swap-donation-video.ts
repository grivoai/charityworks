/**
 * Moves the donation-matching video from Google Drive to YouTube.
 *
 *     npm run migrate:donation-video
 *
 * The Drive player put a phishing warning in front of the video for some
 * visitors — Drive's own interstitial, shown at Google's discretion for a file
 * framed on another domain, and nothing this site can turn off. The client
 * uploaded the same video to YouTube as an unlisted one instead. Unlisted is
 * the right setting: it plays in the frame and does not appear in search or
 * on the channel, which is what a video that only exists to sit on this page
 * should do.
 *
 * The client sent the share address (youtu.be/<id>). What goes in the frame
 * is the embed address for that id, on the nocookie host, because that is
 * what `lib/embeds.ts` allows and what the help text tells them to use — the
 * share address is a page, not a player, and the allowlist refuses it.
 *
 * Matched against the exact Drive address, so a video the client has already
 * changed in the admin is left alone and reported rather than overwritten.
 * Idempotent, and snapshots the document into `content_revisions` first.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "@/content/schema";
import { auctionInfoPage } from "@/content/pages/auction-info";

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

const WAS =
  "https://drive.google.com/file/d/1nLCpPgzkKCQ6MxfT9-frUY28noxADT8K/preview";

/** The seed module carries the new address, so the two cannot drift apart. */
const NOW = auctionInfoPage.video?.embedUrl;

async function main() {
  console.log("\nMoving the donation-matching video to YouTube\n");

  if (!NOW || NOW === WAS) {
    console.error("  the seed module still holds the Drive address — update it first");
    process.exit(1);
  }

  const row = await db
    .from("pages")
    .select("data")
    .eq("slug", "auction-info")
    .single();
  if (row.error || !row.data) {
    console.error(`  could not read auction-info: ${row.error?.message ?? "no row"}`);
    process.exit(1);
  }

  const doc = row.data.data as Record<string, unknown>;
  const video = doc.video as { embedUrl?: string } | undefined;

  if (!video) {
    console.log("  skip  /auction-info holds no video — set one in the admin instead\n");
    return;
  }
  if (video.embedUrl === NOW) {
    console.log("  skip  the video is already on YouTube\n");
    return;
  }
  if (video.embedUrl !== WAS) {
    console.log(
      `  skip  left as ${video.embedUrl} — not the Drive address this script expects\n`
    );
    return;
  }

  const next = { ...doc, video: { ...video, embedUrl: NOW } };
  const parsed = pageSchemas["auction-info"].safeParse(next);
  if (!parsed.success) {
    console.error("  /auction-info would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const history = await db.from("content_revisions").insert({
    entity: "page",
    entity_id: "auction-info",
    data: doc,
    note: "Before the donation-matching video moved from Google Drive to YouTube",
  });
  if (history.error) {
    console.error(`  could not record history: ${history.error.message}`);
    process.exit(1);
  }

  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "auction-info");
  if (write.error) {
    console.error(`  could not save auction-info: ${write.error.message}`);
    process.exit(1);
  }

  console.log(`  /auction-info  video  ${WAS}`);
  console.log(`                     -> ${NOW}`);
  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
