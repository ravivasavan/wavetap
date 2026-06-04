import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted Inter (09_DESIGN_SYSTEM). Exposed as --font-inter, which
// globals.css folds into the token --font-sans stack.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "WaveTap — Wave. Tap. Book.",
  description:
    "Peer-to-peer platform connecting Deaf and Hard of Hearing people with Auslan interpreters. Australia.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
