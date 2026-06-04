import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { WelcomeIntro } from "./welcome-intro";

export default async function WelcomePage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell title="Welcome to WaveTap" subtitle="Wave. Tap. Book.">
      <WelcomeIntro />
    </OnboardingShell>
  );
}
