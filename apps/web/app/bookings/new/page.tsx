import { requireUser } from "@/lib/auth/profile";

import { BookingForm } from "./booking-form";

export default async function NewBookingPage() {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-semibold">Post a booking</h1>
        <p className="text-muted text-sm">
          Tell interpreters when and where you need them. You can review interest before
          confirming anyone.
        </p>
      </div>
      <BookingForm />
    </main>
  );
}
