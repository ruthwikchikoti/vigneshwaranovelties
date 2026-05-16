"use client";

import dynamic from "next/dynamic";

const PushToggle = dynamic(
  () => import("@/components/pwa/PushToggle").then((m) => m.PushToggle),
  { ssr: false }
);

export function PushToggleWrapper() {
  return <PushToggle />;
}
