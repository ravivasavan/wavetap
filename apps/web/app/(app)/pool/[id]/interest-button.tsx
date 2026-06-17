"use client";

import { Button } from "@heroui/react";
import { Check, CircleAlert, Hand } from "lucide-react";
import { useState, useTransition } from "react";

import { expressInterest, withdrawInterest } from "../../bookings/actions";

export function InterestButton({
  bookingId,
  initialInterested,
}: {
  bookingId: string;
  initialInterested: boolean;
}) {
  const [interested, setInterested] = useState(initialInterested);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = interested ? await withdrawInterest(bookingId) : await expressInterest(bookingId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setInterested(!interested);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {interested ? (
        <p className="text-success flex items-center gap-2 text-sm">
          <Check size={16} strokeWidth={1.5} className="shrink-0" />
          You&apos;ve expressed interest — the signer can now see you.
        </p>
      ) : null}

      <Button
        fullWidth
        isPending={pending}
        variant={interested ? "secondary" : "primary"}
        onPress={toggle}
      >
        {interested ? (
          "Withdraw interest"
        ) : (
          <>
            <Hand size={18} strokeWidth={1.5} />
            I&apos;m available — express interest
          </>
        )}
      </Button>

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
