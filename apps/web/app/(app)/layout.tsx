import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUser, userHasProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

import { AppShell } from "./app-shell";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!(await userHasProfile(user.id))) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase.from("profiles").select("display_name, roles, active_role").eq("id", user.id).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);

  const store = await cookies();
  const defaultSidebarOpen = store.get("sidebar_state")?.value !== "false";

  return (
    <AppShell
      defaultSidebarOpen={defaultSidebarOpen}
      user={{
        email: user.email ?? "",
        displayName: profile?.display_name ?? "",
        roles: profile?.roles ?? [],
        activeRole: profile?.active_role ?? "signer",
        unread: unread ?? 0,
      }}
    >
      {children}
    </AppShell>
  );
}
