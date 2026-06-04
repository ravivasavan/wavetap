"use client";

import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

export function WelcomeIntro() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-6"
    >
      <p className="text-muted text-base leading-relaxed">
        A neutral, peer-to-peer way to connect with Auslan interpreters — no agencies, no
        middlemen. Let&apos;s set up your account; it only takes a minute.
      </p>
      <Button fullWidth onPress={() => router.push("/onboarding/start")}>
        Get started
        <ArrowRight size={18} strokeWidth={1.5} />
      </Button>
    </motion.div>
  );
}
