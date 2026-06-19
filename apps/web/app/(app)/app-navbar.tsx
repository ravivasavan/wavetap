"use client";

import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";
import { Avatar, Button } from "@heroui/react";
import { Bell } from "lucide-react";
import Link from "next/link";

import { AccountDropdown, initialsOf } from "./account-menu";
import type { ShellUser } from "./app-shell";

function primaryAction(activeRole: string): { label: string; href: string } {
  return activeRole === "interpreter"
    ? { label: "Browse pool", href: "/pool" }
    : { label: "Post a booking", href: "/bookings/new" };
}

export function AppNavbar({ user }: { user: ShellUser }) {
  const cta = primaryAction(user.activeRole);

  return (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        <Link href="/home" className="text-foreground ml-1 font-semibold tracking-tight md:hidden">
          WaveTap
        </Link>
        <Navbar.Spacer />

        <Link
          href={cta.href}
          className="bg-accent text-accent-foreground inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {cta.label}
        </Link>

        <Link
          href="/notifications"
          aria-label={`Notifications${user.unread > 0 ? ` (${user.unread} unread)` : ""}`}
          className="text-muted hover:text-foreground relative inline-flex size-9 items-center justify-center rounded-full transition-colors"
        >
          <Bell size={20} strokeWidth={1.5} />
          {user.unread > 0 ? (
            <span className="bg-accent text-accent-foreground absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4">
              {user.unread > 9 ? "9+" : user.unread}
            </span>
          ) : null}
        </Link>

        {/* Mobile-only: desktop account actions live in the sidebar footer. */}
        <AccountDropdown user={user}>
          <Button variant="ghost" aria-label="Account menu" className="size-9 rounded-full p-0 md:hidden">
            <Avatar size="sm">
              <Avatar.Fallback>{initialsOf(user.displayName, user.email)}</Avatar.Fallback>
            </Avatar>
          </Button>
        </AccountDropdown>
      </Navbar.Header>
    </Navbar>
  );
}
