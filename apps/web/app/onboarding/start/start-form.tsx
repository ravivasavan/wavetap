"use client";

import { Button, Spinner } from "@heroui/react";
import { ArrowLeftRight, Hand, Languages } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentType } from "react";

import type { OnboardingMode } from "../types";
import { patchOnboarding } from "../use-onboarding";

const OPTIONS: {
  mode: OnboardingMode;
  title: string;
  desc: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}[] = [
  { mode: "signer", title: "I need an interpreter", desc: "Post requests and find an interpreter.", Icon: Hand },
  { mode: "interpreter", title: "I'm an interpreter", desc: "Browse requests and offer your availability.", Icon: Languages },
  { mode: "both", title: "Both", desc: "Switch between the two whenever you like.", Icon: ArrowLeftRight },
];

export function StartForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OnboardingMode | null>(null);

  // Warm the next route so the tap navigates instantly (no on-demand compile stall).
  useEffect(() => {
    router.prefetch("/onboarding/profile");
  }, [router]);

  function choose(mode: OnboardingMode) {
    setSelected(mode);
    patchOnboarding({ mode });
    startTransition(() => {
      router.push("/onboarding/profile");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((o, i) => {
        const isSelected = selected === o.mode;
        return (
          <motion.div
            key={o.mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.25, ease: "easeOut" }}
          >
            <Button
              variant="tertiary"
              fullWidth
              isDisabled={pending}
              onPress={() => choose(o.mode)}
              className={`h-auto items-center justify-start gap-4 rounded-2xl border bg-[var(--surface)] p-4 text-left shadow-[var(--surface-shadow)] transition-colors ${
                isSelected ? "border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)]"
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                {isSelected && pending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <o.Icon size={20} strokeWidth={1.5} />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground font-medium">{o.title}</span>
                <span className="text-muted text-sm font-normal">{o.desc}</span>
              </span>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
