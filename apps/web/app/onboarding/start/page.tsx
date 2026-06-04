import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { StartForm } from "./start-form";

export default async function StartPage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell
      title="What brings you to WaveTap?"
      subtitle="Pick where you'd like to start — you can add the other anytime."
    >
      <StartForm />
    </OnboardingShell>
  );
}
