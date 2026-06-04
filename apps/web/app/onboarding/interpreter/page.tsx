import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";

import { OnboardingShell } from "../onboarding-shell";
import { InterpreterForm } from "./interpreter-form";

export default async function InterpreterPage() {
  const user = await requireUser();
  if (await userHasProfile(user.id)) redirect("/home");
  return (
    <OnboardingShell
      title="Your interpreting setup"
      subtitle="Set your area and availability to appear in the pool. Everything else is optional — you can finish later."
    >
      <InterpreterForm />
    </OnboardingShell>
  );
}
