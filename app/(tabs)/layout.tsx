"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TabBar } from "@/components/ui/TabBar";
import { useApp } from "@/lib/store";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const onboarded = useApp((s) => s.onboarded);
  const router = useRouter();
  useEffect(() => {
    if (!onboarded) router.replace("/start");
  }, [onboarded, router]);
  if (!onboarded) return null;
  return (
    <div className="absolute inset-0">
      {children}
      <TabBar />
    </div>
  );
}
