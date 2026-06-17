"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

/** Mark all of the current user's notifications read (RLS notifications_update_own). */
export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  revalidatePath("/notifications");
  revalidatePath("/home");
}
