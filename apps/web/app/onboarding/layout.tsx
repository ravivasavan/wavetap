"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Visual step order for the progress bar. The interpreter step is conditional
// (signer-only skips it), so we show a smooth proportional bar rather than a
// brittle "step N of 5".
const STEP_ORDER = [
  "/onboarding/welcome",
  "/onboarding/start",
  "/onboarding/profile",
  "/onboarding/interpreter",
  "/onboarding/notifications",
  "/onboarding/terms",
];

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDone = pathname.startsWith("/onboarding/done");
  const idx = STEP_ORDER.findIndex((s) => pathname.startsWith(s));
  const progress = isDone ? 1 : idx < 0 ? 0 : (idx + 1) / STEP_ORDER.length;

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-md items-center px-6 pt-8">
        <span className="text-muted text-sm font-medium uppercase tracking-widest">WaveTap</span>
      </header>

      <div className="mx-auto w-full max-w-md px-6 pt-4" aria-hidden="true">
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={false}
            animate={{ width: `${Math.max(progress * 100, 6)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10"
      >
        {children}
      </motion.main>
    </div>
  );
}
