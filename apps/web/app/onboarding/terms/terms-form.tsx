"use client";

import { Button, Checkbox, Label } from "@heroui/react";
import { useState, useTransition } from "react";

import { completeOnboarding } from "../actions";
import { patchOnboarding, readOnboarding } from "../use-onboarding";

export function TermsForm() {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    setError(null);
    const state = patchOnboarding({ acceptedTerms: true });
    startTransition(async () => {
      const res = await completeOnboarding(state);
      // Success redirects to /home server-side; only errors return here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted text-sm">
        WaveTap connects you directly with the other person, then steps aside — all arrangements,
        scheduling, and payment happen between you, off-platform. We don&apos;t employ, vet, or
        guarantee either party. By continuing you agree to our Terms of Service.
      </p>

      <Checkbox isSelected={agreed} onChange={setAgreed}>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Checkbox.Content>
          <Label>I agree to the WaveTap Terms of Service</Label>
        </Checkbox.Content>
      </Checkbox>

      {error ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button fullWidth isDisabled={!agreed} isPending={pending} onPress={finish}>
        {pending ? "Setting up…" : "Finish"}
      </Button>
    </div>
  );
}
