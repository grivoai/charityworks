/**
 * Puts the client's confirmed figure — 36 years, in business since 1990 — on
 * every line of copy that states how long CharityWorks has been at this.
 *
 *     npm run migrate:years
 *
 * The site went live saying "30+" and "three decades", the demo's placeholder
 * wording, and the SEO audit flagged it as unconfirmed. The client has since
 * confirmed 1990. Three strings say it:
 *
 *   home.hero.badge            "30+" / "Years Experience"  -> "36" / "Years in Business"
 *   home.why.header.lede       "Three decades of expertise…" -> "Thirty-six years of expertise…"
 *   /client-list intro         "…over three decades of…"     -> "…over 36 years of…"
 *
 * Each replacement is matched against the exact current wording, so a line
 * the client has already reworded in the admin is left alone rather than
 * overwritten, and the script reports it. The structured-data `foundingDate`
 * is code, not content, and was set in the same change.
 *
 * Idempotent, and snapshots every document it touches into `content_revisions`.
 */
import { createClient } from "@supabase/supabase-js";

import { customPageSchema, pageSchemas } from "@/content/schema";

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

const NOTE = "Before the years-in-business figure was set to 36 (since 1990)";

async function snapshot(entity: "page" | "custom-page", entityId: string, data: unknown) {
  const { error } = await db
    .from("content_revisions")
    .insert({ entity, entity_id: entityId, data, note: NOTE });
  if (error) {
    console.error(`  could not record history for ${entityId}: ${error.message}`);
    process.exit(1);
  }
}

async function updateHome() {
  const row = await db.from("pages").select("data").eq("slug", "home").single();
  if (row.error || !row.data) {
    console.error(`  could not read home: ${row.error?.message ?? "no row"}`);
    process.exit(1);
  }
  const doc = row.data.data as Record<string, unknown>;
  const hero = doc.hero as Record<string, unknown>;
  const why = doc.why as Record<string, unknown>;
  const header = why.header as Record<string, unknown>;
  const badge = hero.badge as { value: string; label: string };

  let changed = false;
  const nextBadge = { ...badge };
  if (badge.value === "30+" && badge.label === "Years Experience") {
    nextBadge.value = "36";
    nextBadge.label = "Years in Business";
    changed = true;
    console.log('  home       badge        "30+ Years Experience" -> "36 Years in Business"');
  } else if (badge.value === "36") {
    console.log("  home       badge        already 36");
  } else {
    console.log(`  home       badge        left as "${badge.value} ${badge.label}" — not the wording this script expects`);
  }

  const wasLede = "Three decades of expertise, an unbeatable model, and white-glove service from start to finish.";
  const nextLede = "Thirty-six years of expertise, an unbeatable model, and white-glove service from start to finish.";
  let lede = header.lede as string;
  if (lede === wasLede) {
    lede = nextLede;
    changed = true;
    console.log('  home       why lede     "Three decades…" -> "Thirty-six years…"');
  } else if (lede === nextLede) {
    console.log("  home       why lede     already updated");
  } else {
    console.log("  home       why lede     left alone — not the wording this script expects");
  }

  if (!changed) return;

  const next = {
    ...doc,
    hero: { ...hero, badge: nextBadge },
    why: { ...why, header: { ...header, lede } },
  };
  const parsed = pageSchemas.home.safeParse(next);
  if (!parsed.success) {
    console.error("  home would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  await snapshot("page", "home", doc);
  const write = await db
    .from("pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "home");
  if (write.error) {
    console.error(`  could not save home: ${write.error.message}`);
    process.exit(1);
  }
}

async function updateClientList() {
  const row = await db
    .from("custom_pages")
    .select("data")
    .eq("slug", "client-list")
    .single();
  if (row.error || !row.data) {
    console.log("  client-list             no such page — skipped");
    return;
  }
  const doc = row.data.data as Record<string, unknown>;
  const was =
    "Some of the organisations we have supplied auction items to over three decades of day-of-event fundraising.";
  const now =
    "Some of the organisations we have supplied auction items to over 36 years of day-of-event fundraising.";

  if (doc.intro === now) {
    console.log("  client-list intro       already updated");
    return;
  }
  if (doc.intro !== was) {
    console.log("  client-list intro       left alone — not the wording this script expects");
    return;
  }

  const next = { ...doc, intro: now };
  const parsed = customPageSchema.safeParse(next);
  if (!parsed.success) {
    console.error("  /client-list would not be valid content:");
    for (const issue of parsed.error.issues) {
      console.error(`    ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }

  await snapshot("custom-page", "client-list", doc);
  const write = await db
    .from("custom_pages")
    .update({ data: next, updated_at: new Date().toISOString() })
    .eq("slug", "client-list");
  if (write.error) {
    console.error(`  could not save /client-list: ${write.error.message}`);
    process.exit(1);
  }
  console.log('  client-list intro       "…over three decades…" -> "…over 36 years…"');
}

async function main() {
  console.log("\nSetting the years-in-business figure to 36 (since 1990)\n");
  await updateHome();
  await updateClientList();
  console.log("\n  Deploy the site to put it on the page.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
