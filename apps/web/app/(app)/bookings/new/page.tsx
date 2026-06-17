import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/profile";

import { BookingForm } from "./booking-form";

export default async function NewBookingPage() {
  await requireUser();

  return (
    <>
      <PageHeader
        title="Post a booking"
        subtitle="Tell interpreters when and where you need them. You can review interest before confirming anyone."
      />
      <div className="max-w-md">
        <BookingForm />
      </div>
    </>
  );
}
