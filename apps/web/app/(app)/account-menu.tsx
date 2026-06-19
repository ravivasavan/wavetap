"use client";

import { Dropdown, Label } from "@heroui/react";
import { useRouter } from "next/navigation";
import type { Key, ReactNode } from "react";

import { signOut } from "@/app/auth/actions";

import { switchActiveRole } from "./account/actions";
import type { ShellUser } from "./app-shell";

/** Two-letter initials from a display name, falling back to the email. */
export function initialsOf(name: string, email: string): string {
  const src = (name.trim() || email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  const letters = parts.length > 1 ? (first[0] ?? "") + (last[0] ?? "") : src.slice(0, 2);
  return (letters || "U").toUpperCase();
}

/**
 * The account dropdown (Profile / Settings / role switch / Log out), shared by
 * the sidebar footer user block (desktop) and the navbar avatar (mobile). Pass
 * the trigger element as `children`.
 */
export function AccountDropdown({ user, children }: { user: ShellUser; children: ReactNode }) {
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
    <Dropdown>
      {children}
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
  );
}
