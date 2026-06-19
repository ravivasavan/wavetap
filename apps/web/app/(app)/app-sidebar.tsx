"use client";

import { Sidebar } from "@heroui-pro/react";
import { Avatar, Button } from "@heroui/react";
import {
  Bell,
  CalendarPlus,
  CalendarRange,
  ChevronsUpDown,
  Clock,
  Home,
  LayoutList,
  Settings,
  UserRound,
  Waves,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { AccountDropdown, initialsOf } from "./account-menu";
import type { ShellUser } from "./app-shell";

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };

function primaryNav(activeRole: string): NavItem[] {
  if (activeRole === "interpreter") {
    return [
      { href: "/home", label: "Home", icon: Home },
      { href: "/pool", label: "Pool", icon: LayoutList },
      { href: "/my-bookings", label: "My bookings", icon: CalendarRange },
      { href: "/availability", label: "Availability", icon: Clock },
    ];
  }
  return [
    { href: "/home", label: "Home", icon: Home },
    { href: "/bookings/new", label: "New booking", icon: CalendarPlus },
    { href: "/bookings", label: "My bookings", icon: CalendarRange },
  ];
}

function SidebarInner({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/home" ? pathname === "/home" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <Sidebar.Header>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <Waves size={20} className="text-accent" strokeWidth={1.75} />
          <span className="text-foreground font-semibold tracking-tight">WaveTap</span>
        </div>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Menu>
          {primaryNav(user.activeRole).map((it) => (
            <Sidebar.MenuItem key={it.href} href={it.href} isCurrent={isCurrent(it.href)}>
              <Sidebar.MenuIcon>
                <it.icon size={18} strokeWidth={1.5} />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>{it.label}</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          ))}

          <Sidebar.MenuItem href="/notifications" isCurrent={isCurrent("/notifications")}>
            <Sidebar.MenuIcon>
              <Bell size={18} strokeWidth={1.5} />
            </Sidebar.MenuIcon>
            <Sidebar.MenuLabel>Notifications</Sidebar.MenuLabel>
            {user.unread > 0 ? <Sidebar.MenuChip>{user.unread}</Sidebar.MenuChip> : null}
          </Sidebar.MenuItem>
          <Sidebar.MenuItem href="/profile" isCurrent={isCurrent("/profile")}>
            <Sidebar.MenuIcon>
              <UserRound size={18} strokeWidth={1.5} />
            </Sidebar.MenuIcon>
            <Sidebar.MenuLabel>Profile</Sidebar.MenuLabel>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem href="/settings" isCurrent={isCurrent("/settings")}>
            <Sidebar.MenuIcon>
              <Settings size={18} strokeWidth={1.5} />
            </Sidebar.MenuIcon>
            <Sidebar.MenuLabel>Settings</Sidebar.MenuLabel>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.Content>
      <Sidebar.Footer>
        <AccountDropdown user={user}>
          <Button
            variant="ghost"
            aria-label="Account menu"
            className="account-trigger flex h-auto w-full items-center justify-start gap-2 rounded-2xl p-2"
          >
            <Avatar size="sm">
              <Avatar.Fallback>{initialsOf(user.displayName, user.email)}</Avatar.Fallback>
            </Avatar>
            <span className="account-trigger__meta flex min-w-0 flex-1 flex-col text-left">
              <span className="text-foreground truncate text-sm font-medium">
                {user.displayName || user.email}
              </span>
              <span className="text-muted truncate text-xs capitalize">{user.activeRole}</span>
            </span>
            <ChevronsUpDown size={14} strokeWidth={1.5} className="account-trigger__meta text-muted shrink-0" />
          </Button>
        </AccountDropdown>
      </Sidebar.Footer>
    </>
  );
}

export function AppSidebar({ user }: { user: ShellUser }) {
  return (
    <>
      <Sidebar>
        <SidebarInner user={user} />
      </Sidebar>
      <Sidebar.Mobile>
        <SidebarInner user={user} />
      </Sidebar.Mobile>
    </>
  );
}
