"use client";

import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import type { PreferredContact } from "@/app/onboarding/types";

import { updateProfile } from "../../account/actions";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const CONTACTS: { id: PreferredContact; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "mobile", label: "Mobile" },
  { id: "both", label: "Email & mobile" },
];

function FieldSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <Select className="w-full" selectedKey={value || null} onSelectionChange={(k) => onChange(String(k))}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {items.map((it) => (
            <ListBox.Item key={it.id} id={it.id} textValue={it.label}>
              {it.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export type ProfileEditInitial = {
  firstName: string;
  lastName: string;
  suburb: string;
  postcode: string;
  state: string;
  preferredContact: PreferredContact;
  mobile: string;
};

export function ProfileEditForm({ initial }: { initial: ProfileEditInitial }) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [suburb, setSuburb] = useState(initial.suburb);
  const [postcode, setPostcode] = useState(initial.postcode);
  const [stateVal, setStateVal] = useState(initial.state);
  const [contact, setContact] = useState<PreferredContact>(initial.preferredContact);
  const [mobile, setMobile] = useState(initial.mobile);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsMobile = contact === "mobile" || contact === "both";

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateProfile({
        firstName,
        lastName,
        suburb,
        postcode,
        state: stateVal || undefined,
        preferredContact: contact,
        mobile: mobile.trim() || undefined,
      });
      // Success redirects to /profile; only an error returns.
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <TextField value={firstName} onChange={setFirstName} isRequired className="flex-1">
          <Label>First name</Label>
          <Input autoComplete="given-name" />
        </TextField>
        <TextField value={lastName} onChange={setLastName} isRequired className="flex-1">
          <Label>Last name</Label>
          <Input autoComplete="family-name" />
        </TextField>
      </div>

      <div className="flex gap-3">
        <TextField value={suburb} onChange={setSuburb} className="flex-1">
          <Label>Suburb</Label>
          <Input placeholder="e.g. Newtown" autoComplete="address-level2" />
        </TextField>
        <TextField value={postcode} onChange={setPostcode} className="w-28">
          <Label>Postcode</Label>
          <Input placeholder="2042" inputMode="numeric" autoComplete="postal-code" />
        </TextField>
      </div>

      <FieldSelect
        label="State"
        value={stateVal}
        onChange={setStateVal}
        items={STATES.map((s) => ({ id: s, label: s }))}
      />

      <FieldSelect
        label="Preferred contact"
        value={contact}
        onChange={(v) => setContact(v as PreferredContact)}
        items={CONTACTS}
      />

      {needsMobile ? (
        <TextField value={mobile} onChange={setMobile} className="w-full">
          <Label>Mobile</Label>
          <Input placeholder="04xx xxx xxx" inputMode="tel" autoComplete="tel" />
        </TextField>
      ) : null}

      {error ? (
        <p
          className="text-danger flex items-center gap-2 rounded-xl bg-[var(--danger-soft)] px-3 py-2 text-sm"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} className="shrink-0" />
          {error}
        </p>
      ) : null}

      <Button fullWidth isPending={pending} onPress={save}>
        Save changes
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </div>
  );
}
