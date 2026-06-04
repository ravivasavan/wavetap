import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  const defaultName = user.email?.split("@")[0] ?? "";
  return (
    <OnboardingShell title="A few details" subtitle="This is what other people see — keep it simple.">
      <ProfileForm defaultName={defaultName} />
    </OnboardingShell>
  );
}
