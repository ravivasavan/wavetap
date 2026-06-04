import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

// Entry point: send onboarded users home, everyone else to the first step.
export default async function OnboardingIndex() {
  const user = await requireUser();
  redirect((await userHasProfile(user.id)) ? "/home" : "/onboarding/start");
}
