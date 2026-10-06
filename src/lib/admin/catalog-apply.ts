import { getServiceClient } from "@/lib/supabase";
import type { CategoryWritePlan } from "@/lib/admin/catalog-write";

/**
 * Writing a category's rows, once something else has worked out which rows.
 *
 * Lifted out of `catalog-actions.ts` so the two halves of a save are separable:
 * `catalog-write.ts` decides, this performs, and the action is the thing that
 * proves who is asking and puts the two together. Having it here rather than in
 * the action module also means it is not an export of a `"use server"` file —
 * every export of one of those is a callable endpoint, and a function that
 * writes the catalog with the service key is the last one to leave lying by an
 * unlocked door.
 */

/**
 * Performs a plan.
 *
 * Ordered so the recoverable failure is the one that can happen: archiving
 * first would take lots off the site before their replacements exist, and
 * deleting is never done at all. Each statement is checked — supabase-js has no
 * transaction, so a half-applied write has to be reported rather than assumed
 * away.
 */
export async function applyCategoryPlan(
  id: string,
  plan: CategoryWritePlan
): Promise<void> {
  const supabase = getServiceClient();

  const category = await supabase
    .from("catalog_categories")
    .update({ ...plan.category, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (category.error) {
    throw new Error(`the category could not be saved: ${category.error.message}`);
  }

  /* Every column of the patch, taken as a whole rather than listed again here.
     Listing them is how a field gets added to the plan and not to the write:
     the save then succeeds, the history records the new value, and the site
     shows the old one — a save that reports success and does nothing, which is
     the worst shape this file can fail in. `id` is the key, not a column. */
  for (const { id: groupId, ...columns } of plan.groups) {
    const { error } = await supabase
      .from("catalog_groups")
      .update(columns)
      .eq("id", groupId);
    if (error) throw new Error(`a group could not be saved: ${error.message}`);
  }

  /* Upsert: an id already there is updated, a new one inserted. `published`
     is set true so a lot that was archived and then re-added comes back. */
  if (plan.items.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .upsert(
        plan.items.map((item) => ({ ...item, published: true })),
        { onConflict: "id" }
      );
    if (error) throw new Error(`the lots could not be saved: ${error.message}`);
  }

  if (plan.archive.length > 0) {
    const { error } = await supabase
      .from("catalog_items")
      .update({ published: false })
      .in("id", plan.archive);
    if (error) {
      throw new Error(`a removed lot could not be retired: ${error.message}`);
    }
  }
}
