import Link from "next/link";

import { CheckForm } from "./check-form";

export default async function CheckPage(props: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await props.searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold">Check your email</h1>
        <p className="text-muted text-sm">
          We sent a 6-digit code
          {email ? (
            <>
              {" "}to <span className="text-foreground">{email}</span>
            </>
          ) : null}
          . Enter it below, or tap the link in the email — either works.
        </p>
      </div>

      {email ? (
        <CheckForm email={email} />
      ) : (
        <p className="text-danger text-sm">
          Something went wrong —{" "}
          <Link href="/login" className="underline">
            start again
          </Link>
          .
        </p>
      )}
    </main>
  );
}
