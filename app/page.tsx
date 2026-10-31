"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/lib/store";

export default function Index() {
  const router = useRouter();
  const onboarded = useApp((s) => s.onboarded);
  useEffect(() => {
    router.replace(onboarded ? "/home" : "/start");
  }, [onboarded, router]);
  return null;
}
