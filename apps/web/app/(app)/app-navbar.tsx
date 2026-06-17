"use client";

import { AppLayout, Navbar, Sidebar } from "@heroui-pro/react";
import { Avatar, Button, Dropdown, Label } from "@heroui/react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Key } from "react";

import { signOut } from "@/app/auth/actions";

import { switchActiveRole } from "./account/actions";
import type { ShellUser } from "./app-shell";

function initialsOf(name: string, email: string): string {
  const src = (name.trim() || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  const letters = parts.length > 1 ? (first[0] ?? "") + (last[0] ?? "") : src.slice(0, 2);
  return (letters || "U").toUpperCase();
}

export function AppNavbar({ user }: { user: ShellUser }) {
  const router = useRouter();
  const isBoth = user.roles.includes("signer") && user.roles.includes("interpreter");
  const otherRole = user.activeRole === "signer" ? "interpreter" : "signer";

  async function onAction(key: Key) {
    if (key === "profile") router.push("/profile");
    else if (key === "settings") router.push("/settings");
    else if (key === "switch") {
      await switchActiveRole(otherRole);
      router.refresh();
    } else if (key === "logout") {
      await signOut();
    }
  }

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

        <Dropdown>
          <Button variant="ghost" aria-label="Account menu" className="size-9 rounded-full p-0">
            <Avatar size="sm">
              <Avatar.Fallback>{initialsOf(user.displayName, user.email)}</Avatar.Fallback>
            </Avatar>
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={onAction}>
              <Dropdown.Item id="profile" textValue="Profile">
                <Label>Profile</Label>
              </Dropdown.Item>
              <Dropdown.Item id="settings" textValue="Settings">
                <Label>Settings</Label>
              </Dropdown.Item>
              {isBoth ? (
                <Dropdown.Item id="switch" textValue="Switch role">
                  <Label>Switch to {otherRole}</Label>
                </Dropdown.Item>
              ) : null}
              <Dropdown.Item id="logout" textValue="Log out" variant="danger">
                <Label>Log out</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Navbar.Header>
    </Navbar>
  );
}
