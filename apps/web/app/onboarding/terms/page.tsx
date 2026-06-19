import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { TermsForm } from "./terms-form";

export default async function TermsPage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell title="One last thing" subtitle="How Wavetap works, in short.">
      <TermsForm />
    </OnboardingShell>
  );
}
