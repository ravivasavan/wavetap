"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteAccount } from "../../account/actions";

export function DeleteAccountForm() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount();
      // Success redirects to "/"; only an error returns.
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField value={confirm} onChange={setConfirm} className="w-full">
        <Label>
          Type <span className="text-foreground font-semibold">DELETE</span> to confirm
        </Label>
        <Input placeholder="DELETE" autoComplete="off" />
      </TextField>

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Button
        variant="danger"
        isPending={pending}
        isDisabled={confirm !== "DELETE"}
        onPress={onDelete}
      >
        Permanently delete my account
      </Button>
    </div>
  );
}
