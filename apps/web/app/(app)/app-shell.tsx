"use client";

import { AppLayout } from "@heroui-pro/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppNavbar } from "./app-navbar";
import { AppSidebar } from "./app-sidebar";

export type ShellUser = {
  email: string;
  displayName: string;
  roles: string[];
  activeRole: string;
  unread: number;
};

export function AppShell({
  user,
  defaultSidebarOpen,
  children,
}: {
  user: ShellUser;
  defaultSidebarOpen: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <AppLayout
      navigate={router.push}
      sidebarVariant="inset"
      sidebarCollapsible="icon"
      defaultSidebarOpen={defaultSidebarOpen}
      sidebar={<AppSidebar user={user} />}
      navbar={<AppNavbar user={user} />}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-8">{children}</div>
    </AppLayout>
  );
}
