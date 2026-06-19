"use client";

import dynamic from "next/dynamic";

/**
 * Dev-only visual-feedback toolbar (agentation) — click UI elements, annotate,
 * and the agentation-mcp server hands the structured context to the coding
 * agent. The dynamic import sits behind a NODE_ENV check so the package
 * dead-code-eliminates from production builds. Rendered from the root layout.
 */
const Toolbar =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false })
    : null;

export function AgentationDev() {
  return Toolbar ? <Toolbar /> : null;
}
