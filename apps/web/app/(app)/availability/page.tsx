import { redirect } from "next/navigation";

import { emptyAvailability, type AvailabilityPattern } from "@/app/onboarding/types";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { AvailabilityForm } from "./availability-form";

export default async function AvailabilityPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles, location_suburb, location_postcode")
    .eq("id", user.id)
    .maybeSingle();
  if (!(profile?.roles ?? []).includes("interpreter")) redirect("/profile");
  const hasArea = Boolean(profile?.location_suburb || profile?.location_postcode);

  const { data: ip } = await supabase
    .from("interpreter_profiles")
    .select("working_radius_km, availability_pattern, bio, is_deaf_interpreter, accepts_remote")
    .eq("id", user.id)
    .maybeSingle();

  const stored = (ip?.availability_pattern ?? {}) as Partial<AvailabilityPattern>;
  const availability = { ...emptyAvailability(), ...stored } as AvailabilityPattern;

  return (
    <>
      <PageHeader
        title="Availability"
        subtitle="Set your working radius and when you're available — this controls whether you appear in the pool."
      />
      <div className="max-w-md">
        <AvailabilityForm
          hasArea={hasArea}
          initial={{
            workingRadiusKm: ip?.working_radius_km ?? 30,
            availability,
            bio: ip?.bio ?? "",
            isDeafInterpreter: ip?.is_deaf_interpreter ?? false,
            acceptsRemote: ip?.accepts_remote ?? true,
          }}
        />
      </div>
    </>
  );
}
