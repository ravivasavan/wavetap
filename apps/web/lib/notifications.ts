import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Insert an in-app notification for a user. SERVER-ONLY. Uses the service-role
 * admin client because `notifications` has only own-row select/update policies
 * and no insert policy — a user can't create a notification for someone else
 * (e.g. an interpreter notifying a signer), so these writes go through the
 * service role. Best-effort: callers should not let a notification failure
 * roll back the action that triggered it.
 */
export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
  if (error) {
    console.error("[createNotification]", input.userId, input.type, error.message);
  }
}
