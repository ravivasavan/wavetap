"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export function NotificationsForm() {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-[var(--surface-secondary)] p-4">
        <p className="text-foreground text-sm font-medium">Email updates</p>
        <p className="text-muted text-sm">
          New matches, confirmations, and anything needing your attention land in your inbox.
        </p>
      </div>
      <p className="text-muted text-sm">
        Push notifications arrive on the WaveTap mobile app — you&apos;ll set those up when you
        install it.
      </p>
      <Button fullWidth onPress={() => router.push("/onboarding/terms")}>
        Continue
      </Button>
    </div>
  );
}
