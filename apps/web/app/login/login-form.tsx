"use client";

import { Button, FieldError, Input, Label, TextField } from "@heroui/react";
import { useActionState } from "react";

import { sendOtp, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendOtp, null);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <TextField name="email" type="email" isRequired className="w-full">
        <Label>Email</Label>
        <Input placeholder="you@example.com" autoComplete="email" autoFocus />
        <FieldError />
      </TextField>

      {state?.error ? (
        <p className="text-danger text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" isPending={pending} fullWidth>
        {pending ? "Sending…" : "Email me a sign-in code"}
      </Button>
    </form>
  );
}
