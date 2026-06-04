"use client";

import { Button, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isInterpreter, type PreferredContact } from "../types";
import { patchOnboarding, readOnboarding } from "../use-onboarding";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const CONTACTS: { id: PreferredContact; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "mobile", label: "Mobile" },
  { id: "both", label: "Email & mobile" },
];

function FieldSelect({
  label,
  placeholder,
  value,
  onChange,
  items,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onChange: (v: string) => void;
  items: { id: string; label: string }[];
}) {
  return (
    <Select
      className="w-full"
      placeholder={placeholder}
      selectedKey={value || null}
      onSelectionChange={(k) => onChange(String(k))}
    >
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

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [contact, setContact] = useState<PreferredContact>("email");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate from the wizard (e.g. navigating back) after mount, to avoid SSR mismatch.
  useEffect(() => {
    const s = readOnboarding();
    if (s.displayName) setName(s.displayName);
    if (s.suburb) setSuburb(s.suburb);
    if (s.postcode) setPostcode(s.postcode);
    if (s.state) setStateVal(s.state);
    if (s.preferredContact) setContact(s.preferredContact);
    if (s.mobile) setMobile(s.mobile);
  }, []);

  const needsMobile = contact === "mobile" || contact === "both";

  function next() {
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!suburb.trim() && !postcode.trim()) return setError("Enter your suburb or postcode.");
    if (needsMobile && !mobile.trim()) return setError("Add a mobile number, or choose Email.");
    const s = patchOnboarding({
      displayName: name.trim(),
      suburb: suburb.trim(),
      postcode: postcode.trim(),
      state: stateVal || undefined,
      preferredContact: contact,
      mobile: mobile.trim() || undefined,
    });
    router.push(isInterpreter(s.mode) ? "/onboarding/interpreter" : "/onboarding/notifications");
  }

  return (
    <div className="flex flex-col gap-4">
      <TextField value={name} onChange={setName} isRequired className="w-full">
        <Label>Your name</Label>
        <Input placeholder="How you'd like to appear" autoComplete="name" />
      </TextField>

      <div className="flex gap-3">
        <TextField value={suburb} onChange={setSuburb} className="flex-1">
          <Label>Suburb</Label>
          <Input placeholder="e.g. Newtown" />
        </TextField>
        <TextField value={postcode} onChange={setPostcode} className="w-28">
          <Label>Postcode</Label>
          <Input placeholder="2042" inputMode="numeric" />
        </TextField>
      </div>

      <FieldSelect
        label="State"
        placeholder="Select state"
        value={stateVal}
        onChange={setStateVal}
        items={STATES.map((s) => ({ id: s, label: s }))}
      />

      <FieldSelect
        label="Preferred contact"
        placeholder="Select"
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

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <Button fullWidth onPress={next}>
        Continue
      </Button>
    </div>
  );
}
