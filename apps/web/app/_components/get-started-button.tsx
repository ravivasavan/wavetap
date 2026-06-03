"use client";

import { Button } from "@heroui/react";
import Link, { type LinkProps } from "next/link";

/**
 * Landing CTA. Uses the HeroUI Button so the Pro/OSS design system drives the
 * styling, but renders a real Next.js <Link> via the `render` prop so the CTA
 * stays an accessible, prefetchable anchor. The render props are typed for a
 * <button>, so we widen them to the Link's anchor props.
 */
export function GetStartedButton() {
  return (
    <Button
      size="lg"
      render={(props) => (
        <Link {...(props as unknown as LinkProps)} href="/login" />
      )}
    >
      Get started
    </Button>
  );
}
