import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell
      title="A few details"
      subtitle="Use your real name — it builds trust with the people you connect with."
    >
      <ProfileForm />
    </OnboardingShell>
  );
}
