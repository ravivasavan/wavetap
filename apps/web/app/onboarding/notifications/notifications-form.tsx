"use client";

import { Button } from "@heroui/react";
import { ArrowRight, Bell, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export function NotificationsForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch("/onboarding/terms");
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--surface-shadow)]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
          <Mail size={20} strokeWidth={1.5} />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-foreground text-sm font-medium">Email updates</p>
          <p className="text-muted text-sm leading-relaxed">
            New matches, confirmations, and anything needing your attention land in your inbox.
          </p>
        </div>
      </div>

      <p className="text-muted flex items-start gap-1.5 text-xs leading-relaxed">
        <Bell size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        Push notifications arrive on the WaveTap mobile app — you&apos;ll set those up when you
        install it.
      </p>

      <Button
        fullWidth
        isPending={pending}
        onPress={() => startTransition(() => router.push("/onboarding/terms"))}
      >
        Continue
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
