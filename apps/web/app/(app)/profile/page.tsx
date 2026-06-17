import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { addRole, switchActiveRole } from "../account/actions";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] py-2">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-foreground text-sm">{value || "—"}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, location_suburb, location_state, roles, active_role, preferred_contact, mobile, sign_languages",
    )
    .eq("id", user.id)
    .maybeSingle();

  const roles = profile?.roles ?? [];
  const isBoth = roles.includes("signer") && roles.includes("interpreter");
  const otherRole: "signer" | "interpreter" = profile?.active_role === "signer" ? "interpreter" : "signer";
  const missingRole: "signer" | "interpreter" | null = roles.includes("signer")
    ? roles.includes("interpreter")
      ? null
      : "interpreter"
    : "signer";

  async function doSwitch() {
    "use server";
    await switchActiveRole(otherRole);
  }
  async function doAddRole() {
    "use server";
    if (missingRole) await addRole(missingRole);
  }

  const location = [profile?.location_suburb, profile?.location_state].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title="Profile"
        action={
          <Link
            href="/profile/edit"
            className="text-foreground inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
          >
            Edit
          </Link>
        }
      />

      <div className="flex max-w-md flex-col gap-6">
        <div className="flex flex-col">
          <Row label="Name" value={profile?.display_name ?? ""} />
          <Row label="Email" value={user.email ?? ""} />
          <Row label="Location" value={location} />
          <Row label="Preferred contact" value={profile?.preferred_contact ?? ""} />
          {profile?.mobile ? <Row label="Mobile" value={profile.mobile} /> : null}
          <Row label="Sign languages" value={(profile?.sign_languages ?? []).join(", ")} />
        </div>

        <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4">
          <div>
            <p className="text-foreground text-sm font-medium">Roles</p>
            <p className="text-muted mt-1 text-sm">
              You&apos;re using WaveTap as{" "}
              <span className="text-foreground">{profile?.active_role}</span>
              {isBoth ? " (you have both roles)." : "."}
            </p>
          </div>

          {isBoth ? (
            <form action={doSwitch}>
              <button
                type="submit"
                className="text-foreground inline-flex items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-secondary)]"
              >
                Switch to {otherRole}
              </button>
            </form>
          ) : missingRole ? (
            <form action={doAddRole}>
              <button
                type="submit"
                className="bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium"
              >
                {missingRole === "interpreter"
                  ? "Offer to interpret"
                  : "Need an interpreter yourself?"}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </>
  );
}
