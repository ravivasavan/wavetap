"use client";

import { Button, Checkbox, Label } from "@heroui/react";
import { CircleAlert, Handshake, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { completeOnboarding } from "../actions";
import { patchOnboarding, readOnboarding } from "../use-onboarding";

const POINTS: { Icon: typeof Handshake; text: string }[] = [
  { Icon: Handshake, text: "Wavetap connects you directly with the other person, then steps aside." },
  { Icon: Wallet, text: "Scheduling and payment happen between you, off-platform." },
  { Icon: ShieldCheck, text: "We don't employ, vet, or guarantee either party." },
];

export function TermsForm() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch("/onboarding/done");
  }, [router]);

  function finish() {
    setError(null);
    const state = patchOnboarding({ acceptedTerms: true });
    startTransition(async () => {
      const res = await completeOnboarding(state);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col gap-5"
    >
      <ul className="flex flex-col gap-3">
        {POINTS.map(({ Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon size={16} strokeWidth={1.5} />
            </span>
            <span className="text-muted pt-1 text-sm leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>

      <Checkbox isSelected={agreed} onChange={setAgreed}>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>I agree to the Wavetap Terms of Service</Label>
        </Checkbox.Content>
      </Checkbox>

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Button fullWidth isDisabled={!agreed} isPending={pending} onPress={finish}>
        {pending ? "Setting up…" : "Finish"}
      </Button>
    </motion.div>
  );
}
