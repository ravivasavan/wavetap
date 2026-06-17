import type { PreferredContact } from "@/app/onboarding/types";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { ProfileEditForm } from "./profile-edit-form";

export default async function EditProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("display_name, location_suburb, location_postcode, location_state, preferred_contact, mobile")
    .eq("id", user.id)
    .maybeSingle();

  const [firstName, ...rest] = (p?.display_name ?? "").split(" ");
  const lastName = rest.join(" ");

  return (
    <>
      <PageHeader title="Edit profile" subtitle="Others only ever see your suburb — never your exact address." />
      <div className="max-w-md">
        <ProfileEditForm
          initial={{
            firstName: firstName ?? "",
            lastName,
            suburb: p?.location_suburb ?? "",
            postcode: p?.location_postcode ?? "",
            state: p?.location_state ?? "",
            preferredContact: (p?.preferred_contact as PreferredContact) ?? "email",
            mobile: p?.mobile ?? "",
          }}
        />
      </div>
    </>
  );
}
