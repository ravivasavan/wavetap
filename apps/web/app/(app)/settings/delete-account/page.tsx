import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";

import { DeleteAccountForm } from "./delete-account-form";

export default async function DeleteAccountPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Delete account" />
      <div className="flex max-w-md flex-col gap-4">
        <p className="text-muted text-sm leading-relaxed">
          This permanently deletes your account and all associated data — your profile, bookings,
          interests, and confirmations. This can&apos;t be undone.
        </p>
        <DeleteAccountForm />
      </div>
    </>
  );
}
