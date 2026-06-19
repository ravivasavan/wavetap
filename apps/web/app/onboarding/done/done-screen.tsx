"use client";

import { Button } from "@heroui/react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { clearOnboarding } from "../use-onboarding";

export function DoneScreen({
  name,
  isInterpreter,
  interpreterLive,
}: {
  name: string | null;
  isInterpreter: boolean;
  interpreterLive: boolean;
}) {
  const router = useRouter();

  // Onboarding is committed — clear the wizard state so a return visit starts clean.
  useEffect(() => {
    clearOnboarding();
  }, []);

  const message = isInterpreter
    ? interpreterLive
      ? "You're live in the interpreter pool — new requests in your area will show up on your home screen."
      : "Add your availability anytime to start appearing in the interpreter pool."
    : "Post your first booking whenever you're ready.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
        className="flex size-16 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]"
      >
        <CircleCheck size={32} strokeWidth={1.5} />
      </motion.span>

      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {name ? `You're all set, ${name}.` : "You're all set."}
        </h1>
        <p className="text-muted text-sm leading-relaxed">{message}</p>
      </div>

      <Button fullWidth onPress={() => router.push("/home")}>
        Go to Wavetap
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
