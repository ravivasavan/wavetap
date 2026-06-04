import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { NotificationsForm } from "./notifications-form";

export default async function NotificationsPage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell
      title="Staying in the loop"
      subtitle="We'll only get in touch when something needs you — no noise."
    >
      <NotificationsForm />
    </OnboardingShell>
  );
}
