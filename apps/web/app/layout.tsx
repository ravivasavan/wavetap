import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaveTap — Wave. Tap. Book.",
  description:
    "Peer-to-peer platform connecting Deaf and Hard of Hearing people with Auslan interpreters. Australia.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
