import { redirect } from "next/navigation";

import { requireUser, userHasProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { DoneScreen } from "./done-screen";

export default async function DonePage() {
  const user = await requireUser();
  if (!(await userHasProfile(user.id))) redirect("/onboarding");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, roles")
    .eq("id", user.id)
    .single();

  const roles = profile?.roles ?? [];
  const isInterpreter = roles.includes("interpreter");

  let interpreterLive = false;
  if (isInterpreter) {
    const { data: ip } = await supabase
      .from("interpreter_profiles")
      .select("availability_pattern")
      .eq("id", user.id)
      .maybeSingle();
    const avail = (ip?.availability_pattern ?? null) as Record<
      string,
      { available?: boolean }
    > | null;
    interpreterLive = Boolean(avail) && Object.values(avail!).some((d) => d?.available);
  }

  return (
    <DoneScreen
      name={profile?.display_name ?? null}
      isInterpreter={isInterpreter}
      interpreterLive={interpreterLive}
    />
  );
}
