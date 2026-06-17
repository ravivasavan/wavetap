import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { NotificationForm } from "./notification-form";

export default async function NotificationSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("notification_email, notification_push, notification_sms")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Notifications" subtitle="Choose how WaveTap reaches you." />
      <div className="max-w-md">
        <NotificationForm
          initial={{
            email: p?.notification_email ?? true,
            push: p?.notification_push ?? false,
            sms: p?.notification_sms ?? false,
          }}
        />
      </div>
    </>
  );
}
