"use client";

import { Button, InputOTP, Link } from "@heroui/react";
import { useState, useTransition } from "react";

import { resendOtp, verifyCode } from "./actions";

export function CheckForm({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(value: string) {
    setError(null);
    startTransition(async () => {
      const res = await verifyCode(email, value);
      // On success the server action redirects to /home; only errors return here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <InputOTP maxLength={6} value={code} onChange={setCode} onComplete={submit} autoFocus>
        <InputOTP.Group>
          <InputOTP.Slot index={0} />
          <InputOTP.Slot index={1} />
          <InputOTP.Slot index={2} />
        </InputOTP.Group>
        <InputOTP.Separator />
        <InputOTP.Group>
          <InputOTP.Slot index={3} />
          <InputOTP.Slot index={4} />
          <InputOTP.Slot index={5} />
        </InputOTP.Group>
      </InputOTP>

      {error ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        fullWidth
        isPending={pending}
        isDisabled={code.length < 6}
        onPress={() => submit(code)}
      >
        {pending ? "Verifying…" : "Verify code"}
      </Button>

      <p className="text-muted text-sm">
        Didn&apos;t get it?{" "}
        <Link
          className="text-foreground underline"
          onPress={() => {
            setResent(true);
            void resendOtp(email);
          }}
        >
          Resend
        </Link>
        {resent ? " — sent." : null}
      </p>
    </div>
  );
}
