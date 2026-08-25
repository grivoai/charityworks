/**
 * Moves the donation-matching video from the home hero onto /auction-info.
 *
 *     npm run migrate:video-to-auction-info
 *
 * The video has moved twice now, and both moves left something behind. It began
 * on the FAQs page, was written into `home.hero.video` when the hero gained a
 * control that opened it in a dialog — and the hero schema had no `video` field
 * at the time, so every read parsed the document, silently dropped the key it
 * did not recognise, and handed the page a hero with no video. Content that
 * existed, was valid, and could never render.
 *
 * It now lives at `auction-info.video`, embedded in the page rather than behind
 * a control, after the event formats and above the closing call to action.
 *
 * WHAT THIS DROPS. `hero.video` carried a `linkLabel` — the wording on the
 * button that opened the dialog. There is no button now, so the field has
 * nowhere to go and is not carried across. `heading`, `lede` and `embedUrl` are
 * the same three fields the FAQ block already used, which is why both pages can
 * now share one `videoBlockSchema` instead of holding two shapes that drifted.
 *
 * Reads the URL from whichever record still holds it, so this is the same
 * migration whether the video is currently on the home hero, still on the FAQs
 * page, or already moved. The result is parsed through `auctionInfoPageSchema`
 * before it is written, which runs the same host allowlist the page uses to
 * decide whether to render a frame at all.
 *
 * Idempotent, and snapshots every document it touches into `content_revisions`.
 */
import { createClient } from "@supabase/supabase-js";

import { pageSchemas } from "../src/content/schema";

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

interface VideoBlock {
  heading: string;
  lede?: string;
  embedUrl: string;
  caption?: string;
}

async function readPage(slug: string): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from("pages")
    .select("data")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`  could not read ${slug}: ${error?.message ?? "no row"}`);
    process.exit(1);
  }
  return data.data as Record<string, unknown>;
}

async function snapshot(slug: string, doc: unknown, note: string) {
  const { error } = await db
    .from("content_revisions")
    .insert({ entity: "page", entity_id: slug, data: doc, note });
  if (error) {
    console.error(`  could not record history for ${slug}: ${error.message}`);
    process.exit(1);
  }
}

async function write(slug: string, next: unknown) {
  const { error } = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    console.error(`  could not save ${slug}: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  console.log("\nMoving the donation-matching video to /auction-info\n");

  const home = await readPage("home");
  const info = await readPage("auction-info");

  const hero = (home.hero ?? {}) as Record<string, unknown>;
  const heroVideo = hero.video as VideoBlock | undefined;
  const infoVideo = info.video as VideoBlock | undefined;

  /* Whichever record still holds it wins, so the script does not care which of
     the two states it is run against. */
  const source = infoVideo ?? heroVideo;
  if (!source) {
    console.log(
      "  skip  neither the home hero nor /auction-info holds a video.\n" +
        "        Nothing to move — set one in the admin instead.\n"
    );
    return;
  }

  const video: VideoBlock = {
    heading: source.heading,
    embedUrl: source.embedUrl,
    ...(source.lede ? { lede: source.lede } : {}),
    ...(source.caption ? { caption: source.caption } : {}),
  };

  const nextInfo = { ...info, video };
  const parsedInfo = pageSchemas["auction-info"].safeParse(nextInfo);
  if (!parsedInfo.success) {
    console.error("  /auction-info would not be valid content:");
    for (const issue of parsedInfo.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  /* `video` is dropped from the hero entirely rather than left to be stripped
     on read. A key the schema does not know is invisible, and an invisible key
     holding a real URL is what produced this migration in the first place. */
  const { video: _dropped, ...heroWithout } = hero;
  const nextHome = { ...home, hero: heroWithout };
  const parsedHome = pageSchemas.home.safeParse(nextHome);
  if (!parsedHome.success) {
    console.error("  the home page would not be valid content:");
    for (const issue of parsedHome.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  const infoAlready =
    JSON.stringify(infoVideo ?? null) === JSON.stringify(video);
  const heroAlready = heroVideo === undefined;
  if (infoAlready && heroAlready) {
    console.log("  skip  the video is already on /auction-info, and the hero is clear\n");
    return;
  }

  if (!infoAlready) {
    await snapshot("auction-info", info, "Before the donation-matching video moved onto this page");
    await write("auction-info", nextInfo);
    console.log(`  /auction-info  <- "${video.heading}"`);
    console.log(`                    ${video.embedUrl}`);
  } else {
    console.log("  /auction-info  already holds it");
  }

  if (!heroAlready) {
    await snapshot("home", home, "Before the donation-matching video left the hero");
    await write("home", nextHome);
    const dropped = (heroVideo as { linkLabel?: string } | undefined)?.linkLabel;
    console.log(`  home hero      -> cleared${dropped ? ` (dropped linkLabel "${dropped}")` : ""}`);
  } else {
    console.log("  home hero      already clear");
  }

  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
